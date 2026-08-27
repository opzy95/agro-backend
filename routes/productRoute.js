const express = require('express');

const protect = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');

const {
  createProduct,
  getProducts,
  getProductById,
  getMyProducts,
  updateProduct,
  deleteProduct
} = require('../controllers/productController');

const router = express.Router();


// GET ALL PUBLISHED PRODUCTS
router.get('/', getProducts);


// GET FARMER'S OWN PRODUCTS
router.get(
  '/my',
  protect,
  authorize('farmer'),
  getMyProducts
);


// GET ONE PRODUCT
router.get('/:id', getProductById);


// CREATE PRODUCT
router.post(
  '/',
  protect,
  authorize('farmer'),
  upload.productImages,
  createProduct
);


// UPDATE PRODUCT
router.put(
  '/:id',
  protect,
  authorize('farmer'),
  upload.productImages,
  updateProduct
);


// DELETE PRODUCT
router.delete(
  '/:id',
  protect,
  authorize('farmer'),
  deleteProduct
);


module.exports = router;