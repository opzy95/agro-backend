const express = require('express');

const router = express.Router();

const protect = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
} = require('../controllers/cartController');

router.get(
  '/',
  protect,
  authorize('customer'),
  getCart
);

router.post(
  '/',
  protect,
  authorize('customer'),
  addToCart
);

router.put(
  '/:productId',
  protect,
  authorize('customer'),
  updateCartItem
);

router.delete(
  '/clear',
  protect,
  authorize('customer'),
  clearCart
);

router.delete(
  '/:productId',
  protect,
  authorize('customer'),
  removeFromCart
);

module.exports = router;