const express = require('express');

const protect = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

const {
  createProduct
} = require('../controllers/productController');

const router = express.Router();

router.post(
  '/',
  protect,
  authorize('farmer'),
  createProduct
);

module.exports = router;