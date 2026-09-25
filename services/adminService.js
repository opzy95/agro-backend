const User = require('../models/user');
const Product = require('../models/product');
const Order = require('../models/order');
const Earning = require('../models/earning');
const Withdrawal = require('../models/withdrawal');
const { deleteImage } = require('../config/cloudinary');
const { creditOrderEarnings } = require('./walletService');
const { createNotification } = require('./notificationService');

const getAdminFinancials = async (range = '7days') => {
  if (!['7days', 'monthly'].includes(range)) {
    throw {
      statusCode: 400,
      message: 'Range must be either 7days or monthly'
    };
  }

  const now = new Date();
  const periodStart = range === 'monthly'
    ? new Date(now.getFullYear(), now.getMonth(), 1)
    : new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
  const periodLength = range === 'monthly'
    ? now.getTime() - periodStart.getTime()
    : 7 * 24 * 60 * 60 * 1000;
  const previousPeriodStart = new Date(periodStart.getTime() - periodLength);
  const periodLabel = range === 'monthly' ? 'This month' : 'This week';
  const currency = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0
  });

  const [currentRevenue, previousRevenue, currentPayouts, pendingPayouts, chartSummary, payoutQueue, transactions] = await Promise.all([
    Earning.aggregate([
      { $match: { creditedAt: { $gte: periodStart, $lte: now } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]),
    Earning.aggregate([
      { $match: { creditedAt: { $gte: previousPeriodStart, $lt: periodStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    Withdrawal.aggregate([
      { $match: { status: { $in: ['approved', 'paid'] }, createdAt: { $gte: periodStart, $lte: now } } },
      { $group: { _id: null, total: { $sum: '$netAmount' } } }
    ]),
    Withdrawal.aggregate([
      { $match: { status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]),
    Earning.aggregate([
      { $match: { creditedAt: { $gte: periodStart, $lte: now } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$creditedAt' } },
          value: { $sum: '$amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]),
    Withdrawal.find({ status: 'pending' })
      .populate('farmer', 'firstName lastName email')
      .sort({ createdAt: 1 })
      .limit(20)
      .lean(),
    Earning.find({ creditedAt: { $gte: periodStart, $lte: now } })
      .populate('farmer', 'firstName lastName')
      .populate('product', 'name')
      .sort({ creditedAt: -1 })
      .limit(20)
      .lean()
  ]);

  const revenue = currentRevenue[0]?.total || 0;
  const previousTotal = previousRevenue[0]?.total || 0;
  const trend = previousTotal === 0
    ? (revenue > 0 ? '+100%' : '0%')
    : `${revenue >= previousTotal ? '+' : ''}${Math.round(((revenue - previousTotal) / previousTotal) * 100)}%`;
  const chartByDate = new Map(chartSummary.map((entry) => [entry._id, entry.value]));
  const chartData = [];
  const chartDays = range === 'monthly'
    ? now.getDate()
    : 7;

  for (let index = chartDays - 1; index >= 0; index -= 1) {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - index);
    const key = date.toISOString().slice(0, 10);

    chartData.push({
      month: range === 'monthly'
        ? date.toLocaleString('en-US', { day: 'numeric' })
        : date.toLocaleString('en-US', { weekday: 'short' }),
      value: chartByDate.get(key) || 0
    });
  }

  return {
    stats: [
      {
        title: 'Total Revenue',
        value: currency.format(revenue),
        subtitle: periodLabel,
        trend,
        color: 'green',
        icon: '₦'
      },
      {
        title: 'Payouts',
        value: currency.format(currentPayouts[0]?.total || 0),
        subtitle: periodLabel,
        trend: '',
        color: 'blue',
        icon: '₦'
      },
      {
        title: 'Pending Payouts',
        value: currency.format(pendingPayouts[0]?.total || 0),
        subtitle: `${pendingPayouts[0]?.count || 0} requests`,
        trend: '',
        color: 'orange',
        icon: '₦'
      },
      {
        title: 'Transactions',
        value: String(currentRevenue[0]?.count || 0),
        subtitle: periodLabel,
        trend: '',
        color: 'purple',
        icon: '#'
      }
    ],
    payoutQueue,
    transactions,
    chartData
  };
};

// Get all users with pagination and filtering
const getAllUsers = async (filters = {}) => {
  const users = await User.find()
    .select('-password')
    .sort({ createdAt: -1 });

  return {
    count: users.length,
    users
  };
};

// Get user by ID
const getUserById = async (userId) => {
  const user = await User.findById(userId).select(
    '_id firstName lastName email phone role farmName verificationStatus nin bvn +ninDocument profileImage createdAt'
  );

  if (!user) {
    throw {
      statusCode: 404,
      message: 'User not found'
    };
  }

  return user;
};

// Delete user
const deleteUser = async (userId, adminId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw {
      statusCode: 404,
      message: 'User not found'
    };
  }

  // Prevent admin from deleting themselves
  if (user._id.toString() === adminId.toString()) {
    throw {
      statusCode: 400,
      message: 'You cannot delete your own admin account'
    };
  }

  await User.findByIdAndDelete(userId);

  return {
    message: 'User deleted successfully'
  };
};

// Get all products for administrators
const getAllProducts = async () => {
  const products = await Product.find()
    .populate('farmer', 'firstName lastName farmName email')
    .sort({ createdAt: -1 });

  return {
    count: products.length,
    products
  };
};

// Get order totals grouped by customer for administrators
const getAllOrders = async () => {
  const orders = await Order.find()
    .populate('customer', 'firstName lastName email phone')
    .populate('items.farmer', 'firstName lastName farmName email')
    .sort({ createdAt: -1 });

  const customerSummaries = new Map();

  for (const order of orders) {
    if (!order.customer) {
      continue;
    }

    const customerId = order.customer._id.toString();
    let summary = customerSummaries.get(customerId);

    if (!summary) {
      summary = {
        customer: order.customer,
        totalOrders: 0,
        itemsBought: 0,
        farmers: new Map(),
        totalSpent: 0,
        latestOrder: null
      };
      customerSummaries.set(customerId, summary);
    }

    summary.totalOrders += 1;
    summary.totalSpent += order.totalAmount;

    for (const item of order.items) {
      summary.itemsBought += item.quantity;

      if (item.farmer) {
        summary.farmers.set(item.farmer._id.toString(), item.farmer);
      }
    }

    if (!summary.latestOrder) {
      summary.latestOrder = order;
    }
  }

  return {
    count: customerSummaries.size,
    customers: Array.from(customerSummaries.values()).map((summary) => ({
      customer: summary.customer,
      totalOrders: summary.totalOrders,
      itemsBought: summary.itemsBought,
      farmers: Array.from(summary.farmers.values()),
      totalSpent: summary.totalSpent,
      latestOrder: summary.latestOrder
        ? {
            id: summary.latestOrder._id,
            orderStatus: summary.latestOrder.orderStatus,
            paymentStatus: summary.latestOrder.paymentStatus,
            totalAmount: summary.latestOrder.totalAmount,
            createdAt: summary.latestOrder.createdAt
          }
        : null
    }))
  };
};

// Get all orders for one customer
const getCustomerOrders = async (customerId) => {
  const customer = await User.findById(customerId).select('-password');

  if (!customer) {
    throw {
      statusCode: 404,
      message: 'Customer not found'
    };
  }

  if (customer.role !== 'customer') {
    throw {
      statusCode: 400,
      message: 'This user is not a customer'
    };
  }

  const orders = await Order.find({ customer: customerId })
    .populate('customer', 'firstName lastName email phone')
    .populate('items.product', 'name image price unit')
    .populate('items.farmer', 'firstName lastName farmName email')
    .sort({ createdAt: -1 });

  const farmers = new Map();
  let itemsBought = 0;
  let totalSpent = 0;

  for (const order of orders) {
    itemsBought += order.items.reduce((total, item) => total + item.quantity, 0);
    totalSpent += order.totalAmount;

    for (const item of order.items) {
      if (item.farmer) {
        farmers.set(item.farmer._id.toString(), item.farmer);
      }
    }
  }

  return {
    customer,
    count: orders.length,
    itemsBought,
    farmers: Array.from(farmers.values()),
    totalSpent,
    orders
  };
};

const markOrderPaid = async (orderId, paymentReference) => {
  const order = await Order.findById(orderId);

  if (!order) {
    throw {
      statusCode: 404,
      message: 'Order not found'
    };
  }

  order.paymentStatus = 'paid';
  order.paymentReference = paymentReference || order.paymentReference;
  await order.save();

  await creditOrderEarnings(order);

  Promise.all([
    ...order.items.map((item) => createNotification({
      recipient: item.farmer,
      type: 'payment_confirmed',
      title: 'Payment confirmed',
      message: 'Admin confirmed payment for your order item.',
      order: order._id
    }))
  ]).catch((error) => {
    console.error('Publish payment notification error:', error);
  });

  return order;
};

// Get one product for administrators
const getProductById = async (productId) => {
  const product = await Product.findById(productId)
    .populate('farmer', 'firstName lastName farmName email');

  if (!product) {
    throw {
      statusCode: 404,
      message: 'Product not found'
    };
  }

  return product;
};

// Delete any product for administrators
const deleteProduct = async (productId) => {
  const product = await Product.findById(productId);

  if (!product) {
    throw {
      statusCode: 404,
      message: 'Product not found'
    };
  }

  const imagePublicIds = [
    ...(product.images || []).map((image) => image.publicId),
    product.imagePublicId
  ].filter(Boolean).filter((publicId, index, publicIds) => (
    publicIds.indexOf(publicId) === index
  ));

  await Promise.all(imagePublicIds.map((publicId) => deleteImage(publicId)));
  await Product.findByIdAndDelete(productId);

  return {
    message: 'Product deleted successfully'
  };
};

// Verify farmer
const verifyFarmer = async (farmerId) => {
  const farmer = await User.findById(farmerId);

  if (!farmer) {
    throw {
      statusCode: 404,
      message: 'Farmer not found'
    };
  }

  if (farmer.role !== 'farmer') {
    throw {
      statusCode: 400,
      message: 'This user is not a farmer'
    };
  }

  if (farmer.isVerified) {
    throw {
      statusCode: 400,
      message: 'Farmer is already verified'
    };
  }

  farmer.isVerified = true;
  farmer.verificationStatus = 'verified';
  farmer.verificationRejectionReason = '';

  await farmer.save();

  return {
    id: farmer._id,
    firstName: farmer.firstName,
    lastName: farmer.lastName,
    email: farmer.email,
    role: farmer.role,
    isVerified: farmer.isVerified,
    verificationStatus: farmer.verificationStatus
  };
};

// Unverify farmer
const unverifyFarmer = async (farmerId) => {
  const farmer = await User.findById(farmerId);

  if (!farmer) {
    throw {
      statusCode: 404,
      message: 'Farmer not found'
    };
  }

  if (farmer.role !== 'farmer') {
    throw {
      statusCode: 400,
      message: 'This user is not a farmer'
    };
  }

  farmer.isVerified = false;
  farmer.verificationStatus = 'pending';
  farmer.verificationRejectionReason = '';

  await farmer.save();

  return {
    id: farmer._id,
    firstName: farmer.firstName,
    lastName: farmer.lastName,
    email: farmer.email,
    role: farmer.role,
    isVerified: farmer.isVerified,
    verificationStatus: farmer.verificationStatus
  };
};

// Reject farmer verification
const rejectFarmerVerification = async (farmerId, reason) => {
  if (!reason || reason.trim() === '') {
    throw {
      statusCode: 400,
      message: 'Rejection reason is required'
    };
  }

  const farmer = await User.findById(farmerId);

  if (!farmer) {
    throw {
      statusCode: 404,
      message: 'Farmer not found'
    };
  }

  if (farmer.role !== 'farmer') {
    throw {
      statusCode: 400,
      message: 'This user is not a farmer'
    };
  }

  farmer.isVerified = false;
  farmer.verificationStatus = 'rejected';
  farmer.verificationRejectionReason = reason;

  await farmer.save();

  return {
    id: farmer._id,
    firstName: farmer.firstName,
    lastName: farmer.lastName,
    email: farmer.email,
    role: farmer.role,
    isVerified: farmer.isVerified,
    verificationStatus: farmer.verificationStatus,
    verificationRejectionReason: farmer.verificationRejectionReason
  };
};

module.exports = {
  getAdminFinancials,
  getAllUsers,
  getUserById,
  deleteUser,
  getAllProducts,
  getAllOrders,
  getCustomerOrders,
  markOrderPaid,
  getProductById,
  deleteProduct,
  verifyFarmer,
  unverifyFarmer,
  rejectFarmerVerification
};
