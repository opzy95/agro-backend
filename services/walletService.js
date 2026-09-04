const Wallet = require('../models/wallet');

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

module.exports = {
  getOrCreateFarmerWallet
};