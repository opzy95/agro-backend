const User = require('../models/user');
const Product = require('../models/product');
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
  getProductById,
  deleteProduct,
  verifyFarmer,
  unverifyFarmer,
  rejectFarmerVerification
};
