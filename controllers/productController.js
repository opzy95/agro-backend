const Product = require('../models/Product');

// CREATE PRODUCT

const createProduct = async (req, res) => {
  try {
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
    } = req.body;

    if (
      !name ||
      !category ||
      !description ||
      price === undefined ||
      availableQuantity === undefined ||
      !farmLocation
    ) {
      return res.status(400).json({
        message: 'Please provide all required product details'
      });
    }

    const existingProduct = await Product.findOne({
      farmer: req.user._id,
      name: { $regex: `^${name}$`, $options: 'i' },
      category,
      unit
    });

    if (existingProduct) {
      return res.status(409).json({
        message: 'You already have a product with this name, category and unit'
      });
    }

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

    if (error.code === 11000) {
      return res.status(400).json({
        message: 'A product with this SKU already exists'
      });
    }

    res.status(500).json({
      message: 'Failed to create product'
    });
  }
};


// GET ALL PUBLISHED PRODUCTS
const getProducts = async (req, res) => {
  try {
    const products = await Product.find({
      status: 'published'
    })
      .populate('farmer', 'firstName lastName farmName')
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: products.length,
      products
    });

  } catch (error) {
    console.error('Get products error:', error);

    res.status(500).json({
      message: 'Failed to get products'
    });
  }
};


// GET SINGLE PRODUCT
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('farmer', 'firstName lastName farmName');

    if (!product) {
      return res.status(404).json({
        message: 'Product not found'
      });
    }

    res.status(200).json({
      product
    });

  } catch (error) {
    console.error('Get product error:', error);

    res.status(500).json({
      message: 'Failed to get product'
    });
  }
};


// GET FARMER'S PRODUCTS
const getMyProducts = async (req, res) => {
  try {
    const products = await Product.find({
      farmer: req.user._id
    }).sort({ createdAt: -1 });

    res.status(200).json({
      count: products.length,
      products
    });

  } catch (error) {
    console.error('Get my products error:', error);

    res.status(500).json({
      message: 'Failed to get your products'
    });
  }
};


// UPDATE PRODUCT
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: 'Product not found'
      });
    }

    // Make sure the logged-in farmer owns this product
    if (product.farmer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'You can only update your own products'
      });
    }

    const allowedFields = [
      'name',
      'category',
      'sku',
      'description',
      'image',
      'price',
      'unit',
      'availableQuantity',
      'minimumOrderQuantity',
      'farmLocation',
      'shippingMethods',
      'status'
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        product[field] = req.body[field];
      }
    });

    await product.save();

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

    res.status(500).json({
      message: 'Failed to update product'
    });
  }
};


// DELETE PRODUCT
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: 'Product not found'
      });
    }

    // Make sure the logged-in farmer owns this product
    if (product.farmer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'You can only delete your own products'
      });
    }

    await Product.findByIdAndDelete(req.params.id);

    res.status(200).json({
      message: 'Product deleted successfully'
    });

  } catch (error) {
    console.error('Delete product error:', error);

    res.status(500).json({
      message: 'Failed to delete product'
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