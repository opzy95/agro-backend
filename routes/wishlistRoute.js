const express = require('express');

const router = express.Router();

const protect = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  checkWishlist,
  clearWishlist
} = require('../controllers/wishlistController');


// Get wishlist
router.get(
  '/',
  protect,
  authorize('customer'),
  getWishlist
);


// Add product
router.post(
  '/',
  protect,
  authorize('customer'),
  addToWishlist
);


// Check product
router.get(
  '/check/:productId',
  protect,
  authorize('customer'),
  checkWishlist
);


// Remove product
router.delete(
  '/:productId',
  protect,
  authorize('customer'),
  removeFromWishlist
);


// Clear wishlist
router.delete(
  '/',
  protect,
  authorize('customer'),
  clearWishlist
);


module.exports = router;