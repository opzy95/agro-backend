const orderService = require('../services/orderService');

const initializePayment = async (req, res) => {
  try {
    const payment = await orderService.initializePayment(req.user, req.body);

    res.status(200).json({
      message: 'Payment initialized successfully',
      payment
    });
  } catch (error) {
    console.error('Initialize payment error:', error);

    res.status(error.statusCode || 500).json({
      message: error.message || 'Failed to initialize payment'
    });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const reference =
      req.body.reference ||
      req.body.data?.reference ||
      req.query.reference;

    const order = await orderService.verifyPaymentAndCreateOrder(
      req.user._id,
      reference
    );

    res.status(201).json({
      message: 'Payment successful and order booked',
      order
    });
  } catch (error) {
    console.error('Verify payment error:', error);

    res.status(error.statusCode || 500).json({
      message: error.message || 'Failed to verify payment'
    });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const result = await orderService.getMyOrders(req.user._id);

    res.status(200).json(result);
  } catch (error) {
    console.error('Get customer orders error:', error);

    res.status(500).json({
      message: 'Failed to get your orders'
    });
  }
};

const getOrderById = async (req, res) => {
  try {
    const order = await orderService.getOrderById(req.params.id, req.user);

    res.status(200).json({ order });
  } catch (error) {
    console.error('Get order error:', error);

    res.status(error.statusCode || 500).json({
      message: error.message || 'Failed to get order'
    });
  }
};

const getFarmerOrders = async (req, res) => {
  try {
    const result = await orderService.getFarmerOrders(req.user._id);

    res.status(200).json(result);
  } catch (error) {
    console.error('Get farmer orders error:', error);

    res.status(error.statusCode || 500).json({
      message: error.message || 'Failed to get farmer orders'
    });
  }
};

const updateOrderItemStatus = async (req, res) => {
  try {
    const { status, productId } = req.body;
    const order = await orderService.updateOrderItemStatus(
      req.params.id,
      req.user._id,
      productId,
      status
    );

    res.status(200).json({
      message: `Product marked as ${status}`,
      order
    });
  } catch (error) {
    console.error('Update order item status error:', error);

    res.status(error.statusCode || 500).json({
      message: error.message || 'Failed to update order item status'
    });
  }
};

const confirmDelivery = async (req, res) => {
  try {
    const result = await orderService.confirmDelivery(
      req.params.id,
      req.user._id,
      req.body.productId
    );

    res.status(200).json({
      message: 'Order item marked as delivered',
      order: result.order,
      item: result.item
    });
  } catch (error) {
    console.error('Confirm delivery error:', error);

    res.status(error.statusCode || 500).json({
      message: error.message || 'Failed to confirm delivery'
    });
  }
};

const cancelOrder = async (req, res) => {
  try {
    const order = await orderService.cancelOrder(req.params.id, req.user._id);

    res.status(200).json({
      message: 'Order cancelled successfully',
      order
    });
  } catch (error) {
    console.error('Cancel order error:', error);

    res.status(error.statusCode || 500).json({
      message: error.message || 'Failed to cancel order'
    });
  }
};

module.exports = {
  initializePayment,
  verifyPayment,
  getMyOrders,
  getOrderById,
  cancelOrder,
  getFarmerOrders,
  updateOrderItemStatus,
  confirmDelivery
};
