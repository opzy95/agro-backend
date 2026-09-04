const User = require('../models/user');
const Product = require('../models/product');
const Order = require('../models/order');
const { deleteImage } = require('../config/cloudinary');

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
  const user = await User.findById(userId).select('-password');

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
  getAllUsers,
  getUserById,
  deleteUser,
  getAllProducts,
  getAllOrders,
  getCustomerOrders,
  getProductById,
  deleteProduct,
  verifyFarmer,
  unverifyFarmer,
  rejectFarmerVerification
};
