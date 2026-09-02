const productService = require('../services/productService');

const createProduct = async (req, res) => {
  try {
    const product = await productService.createProduct(req.user._id, req.body, req.files);

    res.status(201).json({
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    console.error('Create product error:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        message: 'A product with this SKU already exists'
      });
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Invalid product details',
        errors: Object.values(error.errors).map((item) => item.message)
      });
    }

    res.status(error.statusCode || 500).json({
      message: error.message || 'Failed to create product'
    });
  }
};

const getProducts = async (req, res) => {
  try {
    const result = await productService.getProducts();

    res.status(200).json(result);
  } catch (error) {
    console.error('Get products error:', error);

    res.status(500).json({
      message: 'Failed to get products'
    });
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await productService.getProductById(req.params.id);

    res.status(200).json({ product });
  } catch (error) {
    console.error('Get product error:', error);

    res.status(error.statusCode || 500).json({
      message: error.message || 'Failed to get product'
    });
  }
};

const getMyProducts = async (req, res) => {
  try {
    const result = await productService.getMyProducts(req.user._id);

    res.status(200).json(result);
  } catch (error) {
    console.error('Get my products error:', error);

    res.status(500).json({
      message: 'Failed to get your products'
    });
  }
};

const updateProduct = async (req, res) => {
  try {
    const product = await productService.updateProduct(req.params.id, req.user._id, req.body, req.files);

    res.status(200).json({
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    console.error('Update product error:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        message: 'A product with this SKU already exists'
      });
    }

    res.status(error.statusCode || 500).json({
      message: error.message || 'Failed to update product'
    });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const result = await productService.deleteProduct(req.params.id, req.user._id);

    res.status(200).json(result);
  } catch (error) {
    console.error('Delete product error:', error);

    res.status(error.statusCode || 500).json({
      message: error.message || 'Failed to delete product'
    });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  getMyProducts,
  updateProduct,
  deleteProduct
};
