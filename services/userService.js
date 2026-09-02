const { deleteImage, uploadImage } = require('../config/cloudinary');
const User = require('../models/user');

// Update user profile with optional file uploads
const updateProfile = async (userId, bodyData, files) => {
  const farmerFields = ['bio', 'location', 'website', 'nin'];
  const hasFarmerData = farmerFields.some((field) => bodyData[field] !== undefined)
    || files?.ninDocument;

  // Verify farmer is updating farmer data
  const user = await User.findById(userId);
  if (hasFarmerData && user.role !== 'farmer') {
    throw {
      statusCode: 403,
      message: 'Only farmers can update farmer profile information'
    };
  }

  const allowedFields = [
    'firstName',
    'lastName',
    'phone',
    'address',
    ...(user.role === 'farmer' ? farmerFields : [])
  ];

  allowedFields.forEach((field) => {
    if (bodyData[field] !== undefined) {
      user[field] = bodyData[field];
    }
  });

  const previousImagePublicId = user.profileImagePublicId;
  const previousNinDocumentPublicId = user.ninDocumentPublicId;
  const profileImage = files?.image?.[0];
  const ninDocument = files?.ninDocument?.[0];

  if (profileImage) {
    const uploadedImage = await uploadImage(profileImage, 'agro/profiles');
    user.profileImage = uploadedImage.url;
    user.profileImagePublicId = uploadedImage.publicId;
  }

  if (ninDocument) {
    const uploadedDocument = await uploadImage(ninDocument, 'agro/nin-documents');
    user.ninDocument = uploadedDocument.url;
    user.ninDocumentPublicId = uploadedDocument.publicId;
    // Reset verification status when farmer re-uploads document
    user.verificationStatus = 'pending';
    user.verificationRejectionReason = '';
  }

  await user.save();

  // Delete old images from cloudinary
  if (profileImage && previousImagePublicId) {
    await deleteImage(previousImagePublicId);
  }

  if (ninDocument && previousNinDocumentPublicId) {
    await deleteImage(previousNinDocumentPublicId);
  }

  return user;
};

// Resubmit verification document (for rejected farmers)
const resubmitDocument = async (userId, file) => {
  const user = await User.findById(userId);

  // Only farmers can resubmit documents
  if (user.role !== 'farmer') {
    throw {
      statusCode: 403,
      message: 'Only farmers can resubmit verification documents'
    };
  }

  // Check if document was provided
  if (!file) {
    throw {
      statusCode: 400,
      message: 'NIN document is required'
    };
  }

  // Check if farmer has a rejection to resubmit for
  if (user.verificationStatus !== 'rejected') {
    throw {
      statusCode: 400,
      message: 'Your verification is not in rejected status. Current status: ' + user.verificationStatus
    };
  }

  // Upload new document
  const uploadedDocument = await uploadImage(file, 'agro/nin-documents');
  const previousNinDocumentPublicId = user.ninDocumentPublicId;

  // Update farmer's document and reset verification
  user.ninDocument = uploadedDocument.url;
  user.ninDocumentPublicId = uploadedDocument.publicId;
  user.verificationStatus = 'pending';
  user.verificationRejectionReason = '';

  await user.save();

  // Delete old document from cloudinary
  if (previousNinDocumentPublicId) {
    await deleteImage(previousNinDocumentPublicId);
  }

  return {
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    isVerified: user.isVerified,
    verificationStatus: user.verificationStatus,
    ninDocument: user.ninDocument
  };
};

// Get farmer's verification status
const getVerificationStatus = async (userId) => {
  const user = await User.findById(userId);

  // Only farmers can check their verification status
  if (user.role !== 'farmer') {
    throw {
      statusCode: 403,
      message: 'Only farmers can check verification status'
    };
  }

  return {
    verificationStatus: user.verificationStatus,
    isVerified: user.isVerified,
    rejectionReason: user.verificationRejectionReason || null,
    hasDocument: !!user.ninDocument
  };
};

module.exports = {
  updateProfile,
  resubmitDocument,
  getVerificationStatus
};
