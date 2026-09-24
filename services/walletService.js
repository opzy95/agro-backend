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
  orderItemId,
  productId,
  amount
}) => {
  const existingEarning = await Earning.findOne({
    farmer: farmerId,
    order: orderId,
    orderItemId: orderItemId
  });

  if (existingEarning) {
    return existingEarning;
  }

  const wallet = await getOrCreateFarmerWallet(farmerId);

  const earning = await Earning.create({
    farmer: farmerId,
    order: orderId,
    orderItemId: orderItemId,
    product: productId,
    amount,
    status: 'available'
  });

  wallet.totalEarnings += amount;
  wallet.availableBalance += amount;

  await wallet.save();

  return earning;
};

const creditOrderEarnings = async (order) => {
  if (order.paymentStatus !== 'paid') {
    return [];
  }

  const earnings = [];
  const orderSubtotal = order.items.reduce(
    (total, item) => total + Number(item.subtotal),
    0
  );
  const deliveryFee = Number(order.deliveryFee || 0);
  let allocatedDeliveryFee = 0;

  for (const [index, item] of order.items.entries()) {
    const isLastItem = index === order.items.length - 1;
    const itemDeliveryFee = isLastItem
      ? deliveryFee - allocatedDeliveryFee
      : Number((deliveryFee * Number(item.subtotal) / orderSubtotal).toFixed(2));

    allocatedDeliveryFee += itemDeliveryFee;

    earnings.push(await creditFarmerEarning({
      farmerId: item.farmer,
      orderId: order._id,
      orderItemId: item.product,
      productId: item.product,
      amount: Number((Number(item.subtotal) + itemDeliveryFee).toFixed(2))
    }));
  }

  return earnings;
};

module.exports = {
  getOrCreateFarmerWallet,
  getFarmerWallet,
  creditFarmerEarning,
  creditOrderEarnings
};