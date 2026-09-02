const User = require('../models/user');

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
  verifyFarmer,
  rejectFarmerVerification
};
