const adminService = require('../services/adminService');

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
  getAllUsers,
  getUserById,
  deleteUser,
  verifyFarmer,
  rejectFarmerVerification
};