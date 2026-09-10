const mongoose = require('mongoose');
const Withdrawal = require('../models/withdrawal');
const Wallet = require('../models/wallet');
const {
  createNotification,
  notifyRole
} = require('./notificationService');

const publishNotification = (notificationPromise) => {
  notificationPromise.catch((error) => {
    console.error('Publish withdrawal notification error:', error);
  });
};

const createWithdrawal = async (farmerId, amount) => {
  const withdrawalAmount = Number(amount);

  if (!Number.isFinite(withdrawalAmount) || withdrawalAmount <= 0) {
    throw {
      statusCode: 400,
      message: 'Withdrawal amount must be greater than 0'
    };
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const wallet = await Wallet.findOneAndUpdate(
      {
        farmer: farmerId,
        availableBalance: { $gte: withdrawalAmount }
      },
      {
        $inc: {
          availableBalance: -withdrawalAmount,
          pendingBalance: withdrawalAmount
        }
      },
      { new: true, session }
    );

    if (!wallet) {
      const walletExists = await Wallet.exists({ farmer: farmerId }).session(session);

      throw {
        statusCode: 400,
        message: walletExists ? 'Insufficient available balance' : 'Wallet not found'
      };
    }

    const [withdrawal] = await Withdrawal.create([{
      farmer: farmerId,
      amount: withdrawalAmount,
      status: 'pending'
    }], { session });

    await session.commitTransaction();

    publishNotification(notifyRole({
      role: 'admin',
      type: 'withdrawal_requested',
      title: 'New withdrawal request',
      message: 'A farmer submitted a withdrawal request for review.',
      withdrawal: withdrawal._id
    }));

    return withdrawal;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};

const updateWalletAfterWithdrawal = async (withdrawal, update, session) => {
  const wallet = await Wallet.findOneAndUpdate(
    {
      farmer: withdrawal.farmer,
      pendingBalance: { $gte: withdrawal.amount }
    },
    update,
    { new: true, session }
  );

  if (!wallet) {
    throw {
      statusCode: 400,
      message: 'Wallet does not have enough pending balance'
    };
  }
};

const changeWithdrawalStatus = async (withdrawalId, status, rejectionReason) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const withdrawal = await Withdrawal.findOneAndUpdate(
      { _id: withdrawalId, status: 'pending' },
      {
        $set: {
          status,
          rejectionReason: rejectionReason || ''
        }
      },
      { new: true, session }
    );

    if (!withdrawal) {
      const existingWithdrawal = await Withdrawal.findById(withdrawalId).session(session);

      if (!existingWithdrawal) {
        throw { statusCode: 404, message: 'Withdrawal not found' };
      }

      throw {
        statusCode: 400,
        message: `Withdrawal is already ${existingWithdrawal.status}`
      };
    }

    const walletUpdate = status === 'paid'
      ? {
          $inc: {
            pendingBalance: -withdrawal.amount,
            totalWithdrawn: withdrawal.amount
          }
        }
      : {
          $inc: {
            pendingBalance: -withdrawal.amount,
            availableBalance: withdrawal.amount
          }
        };

    await updateWalletAfterWithdrawal(withdrawal, walletUpdate, session);

    await session.commitTransaction();

    publishNotification(createNotification({
      recipient: withdrawal.farmer,
      type: status === 'paid' ? 'withdrawal_approved' : 'withdrawal_rejected',
      title: status === 'paid' ? 'Withdrawal approved' : 'Withdrawal rejected',
      message: status === 'paid'
        ? 'Your withdrawal has been approved and paid.'
        : `Your withdrawal was rejected${rejectionReason ? `: ${rejectionReason}` : '.'}`,
      withdrawal: withdrawal._id
    }));

    return withdrawal;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};

module.exports = {
  createWithdrawal,
  approveWithdrawal: (withdrawalId) => changeWithdrawalStatus(withdrawalId, 'paid'),
  rejectWithdrawal: (withdrawalId, rejectionReason) =>
    changeWithdrawalStatus(withdrawalId, 'rejected', rejectionReason)
};