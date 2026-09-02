const wishlistService = require('../services/wishlistService');

const getWishlist = async (req, res) => {
  try {
    const wishlist = await wishlistService.getWishlist(req.user._id);

    res.status(200).json({ wishlist });
  } catch (error) {
    console.error('Get wishlist error:', error);

    res.status(500).json({
      message: 'Failed to get wishlist'
    });
  }
};

const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    const wishlist = await wishlistService.addToWishlist(req.user._id, productId);

    res.status(201).json({
      message: 'Product added to wishlist',
      wishlist
    });
  } catch (error) {
    console.error('Add to wishlist error:', error);

    res.status(error.statusCode || 500).json({
      message: error.message || 'Failed to add product to wishlist'
    });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    const wishlist = await wishlistService.removeFromWishlist(req.user._id, productId);

    res.status(200).json({
      message: 'Product removed from wishlist',
      wishlist
    });
  } catch (error) {
    console.error('Remove from wishlist error:', error);

    res.status(error.statusCode || 500).json({
      message: error.message || 'Failed to remove product from wishlist'
    });
  }
};

const checkWishlist = async (req, res) => {
  try {
    const result = await wishlistService.checkWishlist(req.user._id, req.params.productId);

    res.status(200).json(result);
  } catch (error) {
    console.error('Check wishlist error:', error);

    res.status(error.statusCode || 500).json({
      message: error.message || 'Failed to check wishlist'
    });
  }
};

const clearWishlist = async (req, res) => {
  try {
    const wishlist = await wishlistService.clearWishlist(req.user._id);

    res.status(200).json({
      message: 'Wishlist cleared',
      wishlist
    });
  } catch (error) {
    console.error('Clear wishlist error:', error);

    res.status(error.statusCode || 500).json({
      message: error.message || 'Failed to clear wishlist'
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
