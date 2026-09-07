const mongoose = require('mongoose');
const Withdrawal = require('../models/withdrawal');
const Wallet = require('../models/wallet');

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

    return withdrawal;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};

module.exports = {
  createWithdrawal
};