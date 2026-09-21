const FarmerBankAccount = require('../models/FarmerBankAccount');

const getBankAccounts = async (farmerId) => {
  return FarmerBankAccount.find({ farmer: farmerId })
    .sort({ isDefault: -1, createdAt: -1 });
};

const deleteBankAccount = async (farmerId, accountId) => {
  const account = await FarmerBankAccount.findOneAndDelete({
    _id: accountId,
    farmer: farmerId
  });

  if (!account) {
    throw {
      statusCode: 404,
      message: 'Bank account not found'
    };
  }

  if (account.isDefault) {
    const nextDefaultAccount = await FarmerBankAccount.findOne({
      farmer: farmerId
    }).sort({ createdAt: -1 });

    if (nextDefaultAccount) {
      nextDefaultAccount.isDefault = true;
      await nextDefaultAccount.save();
    }
  }

  return account;
};

const addBankAccount = async ({
  farmerId,
  bankName,
  bankCode,
  accountNumber,
  accountName,
  isDefault = false
}) => {
  // Check whether farmer already has any bank accounts
  const existingAccounts = await FarmerBankAccount.find({
    farmer: farmerId
  });

  // First account automatically becomes default
  const shouldBeDefault =
    existingAccounts.length === 0 || isDefault === true;

  // If this account should be default,
  // remove default from the farmer's other accounts
  if (shouldBeDefault) {
    await FarmerBankAccount.updateMany(
      { farmer: farmerId },
      { $set: { isDefault: false } }
    );
  }

  const account = await FarmerBankAccount.create({
    farmer: farmerId,
    bankName,
    bankCode,
    accountNumber,
    accountName,
    isDefault: shouldBeDefault
  });

  return account;
};

module.exports = {
  addBankAccount,
  getBankAccounts,
  deleteBankAccount
};