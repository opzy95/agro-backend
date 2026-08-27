const { deleteImage, uploadImage } = require('../config/cloudinary');

const updateProfile = async (req, res) => {
  try {
    const farmerFields = ['bio', 'location', 'website', 'nin'];
    const hasFarmerData = farmerFields.some((field) => req.body[field] !== undefined)
      || req.files?.ninDocument;

    if (hasFarmerData && req.user.role !== 'farmer') {
      return res.status(403).json({
        message: 'Only farmers can update farmer profile information'
      });
    }

    const allowedFields = [
      'firstName',
      'lastName',
      'phone',
      'address',
      ...(req.user.role === 'farmer' ? farmerFields : [])
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        req.user[field] = req.body[field];
      }
    });

    const previousImagePublicId = req.user.profileImagePublicId;
    const previousNinDocumentPublicId = req.user.ninDocumentPublicId;
    const profileImage = req.files?.image?.[0];
    const ninDocument = req.files?.ninDocument?.[0];

    if (profileImage) {
      const uploadedImage = await uploadImage(profileImage, 'agro/profiles');
      req.user.profileImage = uploadedImage.url;
      req.user.profileImagePublicId = uploadedImage.publicId;
    }

    if (ninDocument) {
      const uploadedDocument = await uploadImage(ninDocument, 'agro/nin-documents');
      req.user.ninDocument = uploadedDocument.url;
      req.user.ninDocumentPublicId = uploadedDocument.publicId;
    }

    await req.user.save();

    if (profileImage && previousImagePublicId) {
      await deleteImage(previousImagePublicId);
    }

    if (ninDocument && previousNinDocumentPublicId) {
      await deleteImage(previousNinDocumentPublicId);
    }

    res.json({
      message: 'Profile updated successfully',
      user: req.user
    });
  } catch (error) {
    console.error('Update profile error:', error);

    res.status(error.statusCode || 500).json({
      message: 'Failed to update profile'
    });
  }
};

module.exports = {
  updateProfile
};