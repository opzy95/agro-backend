const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema(
  {
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    amount: {
      type: Number,
      required: true,
      min: 0.01
    },

    platformFee: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },

    netAmount: {
      type: Number,
      required: true,
      min: 0.01
    },

    bankAccount: {
      bankName: { type: String, required: true },
      bankCode: { type: String, required: true },
      accountNumber: { type: String, required: true },
      accountName: { type: String, required: true }
    },

    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'paid'],
      default: 'pending'
    },

    rejectionReason: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Withdrawal', withdrawalSchema);
