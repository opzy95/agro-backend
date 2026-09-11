const FarmerBankAccount = require('../models/FarmerBankAccount');

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
  addBankAccount
};