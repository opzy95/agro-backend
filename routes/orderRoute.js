const express = require('express');

const protect = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

const {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  getFarmerOrders,
  updateOrderItemStatus,
  confirmDelivery
} = require('../controllers/orderController');

const router = express.Router();


// ================================
// CUSTOMER ROUTES
// ================================

// Create order
router.post(
  '/',
  protect,
  authorize('customer'),
  createOrder
);

// Get customer's orders
router.get(
  '/my',
  protect,
  authorize('customer'),
  getMyOrders
);

// Confirm delivery for an order item
router.put(
  '/:id/confirm-delivery',
  protect,
  authorize('customer'),
  confirmDelivery
);

// Cancel order
router.put(
  '/:id/cancel',
  protect,
  authorize('customer'),
  cancelOrder
);


// ================================
// FARMER ROUTES
// ================================

// Get farmer's orders
router.get(
  '/farmer',
  protect,
  authorize('farmer'),
  getFarmerOrders
);

// Update order status
router.put(
  '/:id/item-status',
  protect,
  authorize('farmer'),
  updateOrderItemStatus
);


// ================================
// SHARED ROUTE
// ================================

// Get one order
router.get(
  '/:id',
  protect,
  getOrderById
);


module.exports = router;