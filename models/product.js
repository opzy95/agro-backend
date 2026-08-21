const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    // Product Information
    name: {
      type: String,
      required: true,
      trim: true
    },

    category: {
      type: String,
      required: true,
      trim: true
    },

    sku: {
      type: String,
      trim: true,
      uppercase: true,
      unique: true,
      sparse: true
    },

    description: {
      type: String,
      required: true,
      trim: true
    },

    // Product Media
    image: {
      type: String,
      default: ''
    },

    // Pricing & Inventory
    price: {
      type: Number,
      required: true,
      min: 0
    },

    unit: {
      type: String,
      required: true,
      default: 'per kg'
    },

    availableQuantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },

    minimumOrderQuantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    },

    // Location & Logistics
    farmLocation: {
      type: String,
      required: true,
      trim: true
    },

    shippingMethods: {
      type: [String],
      enum: [
        'farmPickup',
        'localDelivery',
        'nationalCourier'
      ],
      default: []
    },

    // Farmer who owns the product
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // Product status
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Product', productSchema);