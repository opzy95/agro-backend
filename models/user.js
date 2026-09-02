const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
     firstName: {
      type: String,
      required: true,
      trim: true
    },
    lastName: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: true,
      minlength: 6
    },

    role: {
      type: String,
      enum: ['customer', 'farmer', 'admin'],
      default: 'customer'
    },

    phone: {
      type: String
    },

    address: {
      type: String
    },

    bio: {
      type: String,
      trim: true,
      maxlength: 1000
    },

    location: {
      type: String,
      trim: true
    },

    website: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+/, 'Website must be a valid URL']
    },

    nin: {
      type: String,
      trim: true,
      select: false,
       maxlength: 11
    },

    ninDocument: {
      type: String,
      default: '',
      select: false
    },

    ninDocumentPublicId: {
      type: String,
      default: '',
      select: false
    },

    profileImage: {
      type: String,
      default: ''
    },

    profileImagePublicId: {
      type: String,
      default: ''
    },

    isVerified: {
      type: Boolean,
      default: false,
      // Only relevant for farmers - used to build trust with customers
      validate: {
        validator: function() {
          // This field is mainly intended for farmers, but we don't enforce it here
          // to allow flexibility in the application logic
          return true;
        }
      }
    },

    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending'
    },

    verificationRejectionReason: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('User', userSchema);