const Product = require('../models/product');

const createProduct = async (req, res) => {
  try {
    const body = req.body || {};
    const {
      name,
      category,
      sku,
      description,
      image,
      price,
      unit,
      availableQuantity,
      minimumOrderQuantity,
      farmLocation,
      shippingMethods,
      status
    } = body;

    // Check required fields
    const missingFields = [
      !name && 'name',
      !category && 'category',
      !description && 'description',
      price === undefined && 'price',
      availableQuantity === undefined && 'availableQuantity',
      !farmLocation && 'farmLocation'
    ].filter(Boolean);

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: 'Please provide all required product details',
        missingFields
      });
    }

    // Create product
    const product = await Product.create({
      name,
      category,
      sku,
      description,
      image,
      price,
      unit,
      availableQuantity,
      minimumOrderQuantity,
      farmLocation,
      shippingMethods,
      farmer: req.user._id,
      status: status || 'draft'
    });

    res.status(201).json({
      message: 'Product created successfully',
      product
    });

  } catch (error) {
    console.error('Create product error:', error);

    // Duplicate SKU
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'A product with this SKU already exists'
      });
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Product validation failed',
        errors: Object.values(error.errors).map((validationError) => validationError.message)
      });
    }

    res.status(500).json({
      message: 'Failed to create product'
    });
  }
};

module.exports = {
  createProduct
};