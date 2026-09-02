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
  getAllUsers,
  getUserById,
  deleteUser,
  getAllProducts,
  getProductById,
  deleteProductAsAdmin,
  verifyFarmer,
  unverifyFarmer,
  rejectFarmerVerification
};