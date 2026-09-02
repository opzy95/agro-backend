const userService = require('../services/userService');

const updateProfile = async (req, res) => {
  try {
    const user = await userService.updateProfile(req.user._id, req.body, req.files);

    res.json({
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Update profile error:', error);

    res.status(error.statusCode || 500).json({
      message: error.message || 'Failed to update profile'
    });
  }
};

const resubmitDocument = async (req, res) => {
  try {
    const result = await userService.resubmitDocument(req.user._id, req.file);

    res.status(200).json({
      message: 'Document resubmitted successfully. Your verification status is now pending.',
      user: result
    });
  } catch (error) {
    console.error('Resubmit document error:', error);

    res.status(error.statusCode || 500).json({
      message: error.message || 'Failed to resubmit document'
    });
  }
};

const getVerificationStatus = async (req, res) => {
  try {
    const result = await userService.getVerificationStatus(req.user._id);

    res.status(200).json(result);
  } catch (error) {
    console.error('Get verification status error:', error);

    res.status(error.statusCode || 500).json({
      message: error.message || 'Failed to get verification status'
    });
  }
};

module.exports = {
  updateProfile,
  resubmitDocument,
  getVerificationStatus
};