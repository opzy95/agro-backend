const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema(
  {
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },

    totalEarnings: {
      type: Number,
      default: 0,
      min: 0
    },

    availableBalance: {
      type: Number,
      default: 0,
      min: 0
    },

    pendingBalance: {
      type: Number,
      default: 0,
      min: 0
    },

    totalWithdrawn: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Wallet', walletSchema);