const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true
    },
    familyId: {
      type: String,
      required: true,
      index: true
    },
    tokenVersion: {
      type: Number,
      required: true
    },
    usedAt: {
      type: Date,
      default: null
    },
    expiresAt: {
      type: Date,
      required: true,
      expires: 0
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
