const Wallet = require('../models/wallet');
const Earning = require('../models/earning');

const getOrCreateFarmerWallet = async (farmerId) => {
  let wallet = await Wallet.findOne({
    farmer: farmerId
  });

  if (!wallet) {
    wallet = await Wallet.create({
      farmer: farmerId
    });
  }

  return wallet;
};

const getFarmerWallet = async (farmerId) => {
  return await Wallet.findOne({
    farmer: farmerId
  });
};

const creditFarmerEarning = async ({
  farmerId,
  orderId,
  productId,
  amount
}) => {
  const existingEarning = await Earning.findOne({
    farmer: farmerId,
    order: orderId,
    product: productId
  });

  if (existingEarning) {
    return existingEarning;
  }

  const wallet = await getOrCreateFarmerWallet(farmerId);

  const earning = await Earning.create({
    farmer: farmerId,
    order: orderId,
    product: productId,
    amount,
    status: 'available'
  });

  wallet.totalEarnings += amount;
  wallet.availableBalance += amount;

  await wallet.save();

  return earning;
};

module.exports = {
  getOrCreateFarmerWallet,
  getFarmerWallet,
  creditFarmerEarning
};