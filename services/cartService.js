const Cart = require('../models/cart');
const Product = require('../models/product');

// Get customer's cart
const getCart = async (customerId) => {
  let cart = await Cart.findOne({
    customer: customerId
  }).populate('items.product');

  // Create cart if customer doesn't have one
  if (!cart) {
    cart = await Cart.create({
      customer: customerId,
      items: [],
      totalAmount: 0
    });
  }

  return cart;
};

// Add product to cart
const addToCart = async (customerId, productId, quantity) => {
  // Validate input
  if (!productId || !quantity) {
    throw {
      statusCode: 400,
      message: 'Product ID and quantity are required'
    };
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    throw {
      statusCode: 400,
      message: 'Quantity must be a whole number greater than 0'
    };
  }

  // Find product
  const product = await Product.findById(productId);

  if (!product) {
    throw {
      statusCode: 404,
      message: 'Product not found'
    };
  }

  // Only published products can be purchased
  if (product.status !== 'published') {
    throw {
      statusCode: 400,
      message: 'This product is not available for purchase'
    };
  }

  // Check minimum order quantity
  if (quantity < product.minimumOrderQuantity) {
    throw {
      statusCode: 400,
      message: `Minimum order quantity is ${product.minimumOrderQuantity}`
    };
  }

  // Check available stock
  if (quantity > product.availableQuantity) {
    throw {
      statusCode: 400,
      message: `Only ${product.availableQuantity} units are available`
    };
  }

  // Find or create cart
  let cart = await Cart.findOne({ customer: customerId });

  if (!cart) {
    const subtotal = product.price * quantity;

    cart = await Cart.create({
      customer: customerId,
      items: [
        {
          product: product._id,
          farmer: product.farmer,
          name: product.name,
          price: product.price,
          quantity,
          subtotal
        }
      ],
      totalAmount: subtotal
    });

    await cart.populate('items.product');
    return cart;
  }

  // Check if product already in cart
  const existingItem = cart.items.find(
    item => item.product.toString() === productId
  );

  if (existingItem) {
    const newQuantity = existingItem.quantity + quantity;

    // Check stock again with combined quantity
    if (newQuantity > product.availableQuantity) {
      throw {
        statusCode: 400,
        message: `Only ${product.availableQuantity} units are available`
      };
    }

    existingItem.quantity = newQuantity;
    existingItem.price = product.price;
    existingItem.subtotal = product.price * newQuantity;
  } else {
    const subtotal = product.price * quantity;

    cart.items.push({
      product: product._id,
      farmer: product.farmer,
      name: product.name,
      price: product.price,
      quantity,
      subtotal
    });
  }

  // Recalculate total
  cart.totalAmount = cart.items.reduce(
    (total, item) => total + item.subtotal,
    0
  );

  await cart.save();
  await cart.populate('items.product');

  return cart;
};

// Remove product from cart
const removeFromCart = async (customerId, productId) => {
  const cart = await Cart.findOne({ customer: customerId });

  if (!cart) {
    throw {
      statusCode: 404,
      message: 'Cart not found'
    };
  }

  const itemExists = cart.items.some(
    item => item.product.toString() === productId
  );

  if (!itemExists) {
    throw {
      statusCode: 404,
      message: 'Product is not in your cart'
    };
  }

  cart.items = cart.items.filter(
    item => item.product.toString() !== productId
  );

  // Recalculate total
  cart.totalAmount = cart.items.reduce(
    (total, item) => total + item.subtotal,
    0
  );

  await cart.save();
  await cart.populate('items.product');

  return cart;
};

// Update cart item quantity
const updateCartItem = async (customerId, productId, quantity) => {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw {
      statusCode: 400,
      message: 'Quantity must be a whole number greater than 0'
    };
  }

  const cart = await Cart.findOne({ customer: customerId });

  if (!cart) {
    throw {
      statusCode: 404,
      message: 'Cart not found'
    };
  }

  const item = cart.items.find(
    item => item.product.toString() === productId
  );

  if (!item) {
    throw {
      statusCode: 404,
      message: 'Product is not in your cart'
    };
  }

  // Check stock
  const product = await Product.findById(productId);
  if (quantity > product.availableQuantity) {
    throw {
      statusCode: 400,
      message: `Only ${product.availableQuantity} units are available`
    };
  }

  item.quantity = quantity;
  item.subtotal = item.price * quantity;

  // Recalculate total
  cart.totalAmount = cart.items.reduce(
    (total, item) => total + item.subtotal,
    0
  );

  await cart.save();
  await cart.populate('items.product');

  return cart;
};

// Clear cart
const clearCart = async (customerId) => {
  const cart = await Cart.findOne({ customer: customerId });

  if (!cart) {
    throw {
      statusCode: 404,
      message: 'Cart not found'
    };
  }

  cart.items = [];
  cart.totalAmount = 0;

  await cart.save();

  return cart;
};

module.exports = {
  getCart,
  addToCart,
  removeFromCart,
  updateCartItem,
  clearCart
};
