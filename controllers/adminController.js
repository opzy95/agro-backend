const adminService = require('../services/adminService');
const User = require('../models/user');


const {
  getOrCreateFarmerWallet
} = require('../services/walletService');
const {
  approveWithdrawal,
  rejectWithdrawal,
  getWithdrawals
} = require('../services/withdrawalService');


const getFarmerWallet = async (req, res) => {
  try {
    const farmer = await User.findById(req.params.id);

    if (!farmer) {
      return res.status(404).json({
        message: 'Farmer not found'
      });
    }

    if (farmer.role !== 'farmer') {
      return res.status(400).json({
        message: 'This user is not a farmer'
      });
    }

    const wallet = await getOrCreateFarmerWallet(farmer._id);

    res.status(200).json({
      farmer: {
        id: farmer._id,
        firstName: farmer.firstName,
        lastName: farmer.lastName,
        email: farmer.email,
        isVerified: farmer.isVerified
      },
      wallet
    });
  } catch (error) {
    console.error('Get farmer wallet error:', error);

    res.status(500).json({
      message: 'Failed to get farmer wallet'
    });
  }
};

const getAdminFinancials = async (req, res) => {
  try {
    const { range = '7days' } = req.query;
    const result = await adminService.getAdminFinancials(range);

    res.status(200).json(result);
  } catch (error) {
    console.error('Get admin financials error:', error);

    res.status(error.statusCode || 500).json({
      message: error.message || 'Failed to get admin financials'
    });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const result = await adminService.getAllUsers();

    res.status(200).json(result);
  } catch (error) {
    console.error('Get all users error:', error);

    res.status(500).json({
      message: 'Failed to get users'
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await adminService.getUserById(req.params.id);

    res.status(200).json({ user });
  } catch (error) {
    console.error('Get user by ID error:', error);

    res.status(error.statusCode || 500).json({
      message: error.message || 'Failed to get user'
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const result = await adminService.deleteUser(req.params.id, req.user._id);

    res.status(200).json(result);
  } catch (error) {
    console.error('Delete user error:', error);

    res.status(error.statusCode || 500).json({
      message: error.message || 'Failed to delete user'
    });
  }
};

const getAllProducts = async (req, res) => {
  try {
    const result = await adminService.getAllProducts();

    res.status(200).json(result);
  } catch (error) {
    console.error('Get all products error:', error);

    res.status(500).json({
      message: 'Failed to get products'
    });
  }
};

const getAllOrders = async (req, res) => {
  try {
    const result = await adminService.getAllOrders();

    res.status(200).json(result);
  } catch (error) {
    console.error('Get all orders error:', error);

    res.status(error.statusCode || 500).json({
      message: error.message || 'Failed to get orders'
    });
  }
};

const getCustomerOrders = async (req, res) => {
  try {
    const result = await adminService.getCustomerOrders(req.params.id);

    res.status(200).json(result);
  } catch (error) {
    console.error('Get customer orders error:', error);

    res.status(error.statusCode || 500).json({
      message: error.message || 'Failed to get customer orders'
    });
  }
};

const markOrderPaid = async (req, res) => {
  try {
    const order = await adminService.markOrderPaid(
      req.params.id,
      req.body.paymentReference
    );

    res.status(200).json({
      message: 'Order marked as paid',
      order
    });
  } catch (error) {
    console.error('Mark order paid error:', error);

    res.status(error.statusCode || 500).json({
      message: error.message || 'Failed to mark order as paid'
    });
  }
};

const approveFarmerWithdrawal = async (req, res) => {
  try {
    const withdrawal = await approveWithdrawal(req.params.id);

    res.status(200).json({
      message: 'Withdrawal approved and marked as paid',
      withdrawal
    });
  } catch (error) {
    console.error('Approve withdrawal error:', error);

    res.status(error.statusCode || 500).json({
      message: error.message || 'Failed to approve withdrawal'
    });
  }
};

const getAllWithdrawals = async (req, res) => {
  try {
    const withdrawals = await getWithdrawals();

    res.status(200).json({ withdrawals });
  } catch (error) {
    console.error('Get withdrawals error:', error);

    res.status(error.statusCode || 500).json({
      message: error.message || 'Failed to get withdrawals'
    });
  }
};

const rejectFarmerWithdrawal = async (req, res) => {
  try {
    const withdrawal = await rejectWithdrawal(
      req.params.id,
      req.body.rejectionReason
    );

    res.status(200).json({
      message: 'Withdrawal rejected',
      withdrawal
    });
  } catch (error) {
    console.error('Reject withdrawal error:', error);

    res.status(error.statusCode || 500).json({
      message: error.message || 'Failed to reject withdrawal'
    });
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await adminService.getProductById(req.params.id);

    res.status(200).json({ product });
  } catch (error) {
    console.error('Get admin product error:', error);

    res.status(error.statusCode || 500).json({
      message: error.message || 'Failed to get product'
    });
  }
};

const deleteProductAsAdmin = async (req, res) => {
  try {
    const result = await adminService.deleteProduct(req.params.id);

    res.status(200).json(result);
  } catch (error) {
    console.error('Admin delete product error:', error);

    res.status(error.statusCode || 500).json({
      message: error.message || 'Failed to delete product'
    });
  }
};

const verifyFarmer = async (req, res) => {
  try {
    const result = await adminService.verifyFarmer(req.params.id);

    res.status(200).json({
      message: 'Farmer verified successfully',
      farmer: result
    });
  } catch (error) {
    console.error('Verify farmer error:', error);

    res.status(error.statusCode || 500).json({
      message: error.message || 'Failed to verify farmer'
    });
  }
};

const unverifyFarmer = async (req, res) => {
  try {
    const result = await adminService.unverifyFarmer(req.params.id);

    res.status(200).json({
      message: 'Farmer unverified successfully',
      farmer: result
    });
  } catch (error) {
    console.error('Unverify farmer error:', error);

    res.status(error.statusCode || 500).json({
      message: error.message || 'Failed to unverify farmer'
    });
  }
};

const rejectFarmerVerification = async (req, res) => {
  try {
    const { reason } = req.body;
    const result = await adminService.rejectFarmerVerification(req.params.id, reason);

    res.status(200).json({
      message: 'Farmer verification rejected successfully',
      farmer: result
    });
  } catch (error) {
    console.error('Reject farmer verification error:', error);

    res.status(error.statusCode || 500).json({
      message: error.message || 'Failed to reject farmer verification'
    });
  }
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
  getAllWithdrawals,
  approveFarmerWithdrawal,
  rejectFarmerWithdrawal,
  getProductById,
  deleteProductAsAdmin,
  verifyFarmer,
  unverifyFarmer,
  rejectFarmerVerification,
  getFarmerWallet
};