const cartService = require('../services/cartService');

const getCart = async (req, res) => {
  try {
    const cart = await cartService.getCart(req.user._id);

    res.status(200).json({ cart });
  } catch (error) {
    console.error('Get cart error:', error);

    res.status(500).json({
      message: 'Failed to get cart'
    });
  }
};

const addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const cart = await cartService.addToCart(req.user._id, productId, quantity);

    res.status(201).json({
      message: 'Product added to cart',
      cart
    });
  } catch (error) {
    console.error('Add to cart error:', error);

    res.status(error.statusCode || 500).json({
      message: error.message || 'Failed to add product to cart'
    });
  }
};

const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;
    const cart = await cartService.removeFromCart(req.user._id, productId);

    res.status(200).json({
      message: 'Product removed from cart',
      cart
    });
  } catch (error) {
    console.error('Remove from cart error:', error);

    res.status(error.statusCode || 500).json({
      message: error.message || 'Failed to remove product from cart'
    });
  }
};

const updateCartItem = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;
    const cart = await cartService.updateCartItem(req.user._id, productId, quantity);

    res.status(200).json({
      message: 'Cart updated',
      cart
    });
  } catch (error) {
    console.error('Update cart error:', error);

    res.status(error.statusCode || 500).json({
      message: error.message || 'Failed to update cart'
    });
  }
};

const clearCart = async (req, res) => {
  try {
    const cart = await cartService.clearCart(req.user._id);

    res.status(200).json({
      message: 'Cart cleared',
      cart
    });
  } catch (error) {
    console.error('Clear cart error:', error);

    res.status(error.statusCode || 500).json({
      message: error.message || 'Failed to clear cart'
    });
  }
};

module.exports = {
  getCart,
  addToCart,
  removeFromCart,
  updateCartItem,
  clearCart
};
