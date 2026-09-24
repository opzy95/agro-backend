const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },

    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    name: {
      type: String,
      required: true
    },

    quantity: {
      type: Number,
      required: true,
      min: 1
    },

    price: {
      type: Number,
      required: true,
      min: 0
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0
    },

    status: {
      type: String,
      enum: [
        'pending',
        'processing',
        'shipped',
        'delivered',
        'cancelled'
      ],
      default: 'pending'
    }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: function (items) {
          return items.length > 0;
        },
        message: 'Order must contain at least one item'
      }
    },

    deliveryMethod: {
      type: String,
      enum: ['farm_pickup', 'local_delivery', 'national_courier'],
      required: true
    },

    shippingAddress: {
      fullName: {
        type: String,
        trim: true
      },

      phone: {
        type: String,
        trim: true
      },

      address: {
        type: String,
        trim: true
      }
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0
    },

    deliveryFee: {
      type: Number,
      default: 0,
      min: 0
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },

    paymentStatus: {
      type: String,
      enum: [
        'pending',
        'paid',
        'failed',
        'refunded'
      ],
      default: 'pending'
    },

    paymentReference: {
      type: String,
      default: null
    },

    orderStatus: {
      type: String,
      enum: [
        'pending',
        'processing',
        'shipped',
        'delivered',
        'partially_delivered',
        'cancelled'
      ],
      default: 'pending'
    },

    farmerStatuses: [{
      farmer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      status: {
        type: String,
        enum: [
          'pending',
          'processing',
          'shipped',
          'delivered',
          'partially_delivered',
          'cancelled'
        ],
        default: 'pending'
      }
    }]
  },
  {
    _id: true,
    timestamps: true
  }
);

orderSchema.index(
  { paymentReference: 1 },
  { unique: true, partialFilterExpression: { paymentReference: { $type: 'string' } } }
);

module.exports = mongoose.model('Order', orderSchema);