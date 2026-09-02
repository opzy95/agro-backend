const mongoose = require('mongoose');
const Wishlist = require('../models/wishlist');
const Product = require('../models/product');

// Get customer's wishlist
const getWishlist = async (customerId) => {
  let wishlist = await Wishlist.findOne({
    customer: customerId
  }).populate('products');

  // Create empty wishlist if it doesn't exist
  if (!wishlist) {
    wishlist = await Wishlist.create({
      customer: customerId,
      products: []
    });
  }

  return wishlist;
};

// Add product to wishlist
const addToWishlist = async (customerId, productId) => {
  if (!productId) {
    throw {
      statusCode: 400,
      message: 'Product ID is required'
    };
  }

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw {
      statusCode: 400,
      message: 'Product ID is invalid'
    };
  }

  // Only published products can be added to wishlist
  const product = await Product.findOne({
    _id: productId,
    status: 'published'
  });

  if (!product) {
    throw {
      statusCode: 404,
      message: 'Product not found'
    };
  }

  // Find or create wishlist
  let wishlist = await Wishlist.findOne({
    customer: customerId
  });

  if (!wishlist) {
    wishlist = await Wishlist.create({
      customer: customerId,
      products: [productId]
    });
  } else {
    // Check if already in wishlist
    const alreadyExists = wishlist.products.some(
      (id) => id.toString() === productId
    );

    if (alreadyExists) {
      throw {
        statusCode: 400,
        message: 'Product is already in your wishlist'
      };
    }

    wishlist.products.push(productId);
    await wishlist.save();
  }

  await wishlist.populate('products');

  return wishlist;
};

// Remove product from wishlist
const removeFromWishlist = async (customerId, productId) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw {
      statusCode: 400,
      message: 'Product ID is invalid'
    };
  }

  const wishlist = await Wishlist.findOne({
    customer: customerId
  });

  if (!wishlist) {
    throw {
      statusCode: 404,
      message: 'Wishlist not found'
    };
  }

  const productExists = wishlist.products.some(
    (id) => id.toString() === productId
  );

  if (!productExists) {
    throw {
      statusCode: 404,
      message: 'Product is not in your wishlist'
    };
  }

  wishlist.products = wishlist.products.filter(
    (id) => id.toString() !== productId
  );

  await wishlist.save();
  await wishlist.populate('products');

  return wishlist;
};

const checkWishlist = async (customerId, productId) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw {
      statusCode: 400,
      message: 'Product ID is invalid'
    };
  }

  const wishlist = await Wishlist.findOne({ customer: customerId });
  const inWishlist = Boolean(
    wishlist && wishlist.products.some((id) => id.toString() === productId)
  );

  return { inWishlist };
};

// Clear wishlist
const clearWishlist = async (customerId) => {
  const wishlist = await Wishlist.findOne({
    customer: customerId
  });

  if (!wishlist) {
    throw {
      statusCode: 404,
      message: 'Wishlist not found'
    };
  }

  wishlist.products = [];
  await wishlist.save();

  return wishlist;
};

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  checkWishlist,
  clearWishlist
};
