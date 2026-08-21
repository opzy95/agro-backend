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
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('User', userSchema);