const mongoose = require('mongoose');
const Wishlist = require('../models/wishlist');
const Product = require('../models/product');

// Get customer's wishlist
const getWishlist = async (req, res) => {
  try {
    let wishlist = await Wishlist.findOne({
      customer: req.user._id
    }).populate('products');

    // Create an empty wishlist if customer doesn't have one yet
    if (!wishlist) {
      wishlist = await Wishlist.create({
        customer: req.user._id,
        products: []
      });
    }

    res.status(200).json({
      wishlist
    });
  } catch (error) {
    console.error('Get wishlist error:', error);

    res.status(500).json({
      message: 'Failed to get wishlist'
    });
  }
};


// Add product to wishlist
const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        message: 'Product ID is required'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        message: 'Product ID is invalid'
      });
    }

    // Customers can only save products visible in the marketplace.
    const product = await Product.findOne({
      _id: productId,
      status: 'published'
    });

    if (!product) {
      return res.status(404).json({
        message: 'Product not found'
      });
    }

    // Find or create wishlist
    let wishlist = await Wishlist.findOne({
      customer: req.user._id
    });

    if (!wishlist) {
      wishlist = await Wishlist.create({
        customer: req.user._id,
        products: [productId]
      });
    } else {
      // Check if already exists
      const alreadyExists = wishlist.products.some(
        (id) => id.toString() === productId
      );

      if (alreadyExists) {
        return res.status(400).json({
          message: 'Product is already in your wishlist'
        });
      }

      wishlist.products.push(productId);

      await wishlist.save();
    }

    await wishlist.populate('products');

    res.status(201).json({
      message: 'Product added to wishlist',
      wishlist
    });
  } catch (error) {
    console.error('Add wishlist error:', error);

    res.status(500).json({
      message: 'Failed to add product to wishlist'
    });
  }
};


// Remove product from wishlist
const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        message: 'Product ID is invalid'
      });
    }

    const wishlist = await Wishlist.findOne({
      customer: req.user._id
    });

    if (!wishlist) {
      return res.status(404).json({
        message: 'Wishlist not found'
      });
    }

    const productExists = wishlist.products.some(
      (id) => id.toString() === productId
    );

    if (!productExists) {
      return res.status(404).json({
        message: 'Product is not in your wishlist'
      });
    }

    wishlist.products = wishlist.products.filter(
      (id) => id.toString() !== productId
    );

    await wishlist.save();

    await wishlist.populate('products');

    res.status(200).json({
      message: 'Product removed from wishlist',
      wishlist
    });
  } catch (error) {
    console.error('Remove wishlist error:', error);

    res.status(500).json({
      message: 'Failed to remove product from wishlist'
    });
  }
};


// Check whether product is in wishlist
const checkWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        message: 'Product ID is invalid'
      });
    }

    const wishlist = await Wishlist.findOne({
      customer: req.user._id
    });

    if (!wishlist) {
      return res.status(200).json({
        inWishlist: false
      });
    }

    const inWishlist = wishlist.products.some(
      (id) => id.toString() === productId
    );

    res.status(200).json({
      inWishlist
    });
  } catch (error) {
    console.error('Check wishlist error:', error);

    res.status(500).json({
      message: 'Failed to check wishlist'
    });
  }
};


// Clear wishlist
const clearWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({
      customer: req.user._id
    });

    if (!wishlist) {
      return res.status(404).json({
        message: 'Wishlist not found'
      });
    }

    wishlist.products = [];

    await wishlist.save();

    res.status(200).json({
      message: 'Wishlist cleared successfully',
      wishlist
    });
  } catch (error) {
    console.error('Clear wishlist error:', error);

    res.status(500).json({
      message: 'Failed to clear wishlist'
    });
  }
};


module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  checkWishlist,
  clearWishlist
};