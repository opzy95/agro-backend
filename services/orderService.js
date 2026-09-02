const Order = require('../models/order');
const Product = require('../models/product');

// Create order
const createOrder = async (customerId, orderData) => {
  const {
    items,
    shippingAddress,
    deliveryFee = 0
  } = orderData;

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw {
      statusCode: 400,
      message: 'Order must contain at least one product'
    };
  }

  if (
    !shippingAddress ||
    !shippingAddress.fullName ||
    !shippingAddress.phone ||
    !shippingAddress.address
  ) {
    throw {
      statusCode: 400,
      message: 'Complete shipping address is required'
    };
  }

  const orderItems = [];
  let subtotal = 0;

  // Validate all products
  for (const item of items) {
    if (!item.product || !item.quantity) {
      throw {
        statusCode: 400,
        message: 'Each order item must contain a product and quantity'
      };
    }

    const product = await Product.findById(item.product);

    if (!product) {
      throw {
        statusCode: 404,
        message: `Product ${item.product} not found`
      };
    }

    // Product must be published
    if (product.status !== 'published') {
      throw {
        statusCode: 400,
        message: `${product.name} is not currently available`
      };
    }

    // Validate quantity
    if (item.quantity < product.minimumOrderQuantity) {
      throw {
        statusCode: 400,
        message: `Minimum order quantity for ${product.name} is ${product.minimumOrderQuantity}`
      };
    }

    // Check stock
    if (item.quantity > product.availableQuantity) {
      throw {
        statusCode: 400,
        message: `Only ${product.availableQuantity} units of ${product.name} are available`
      };
    }

    const itemSubtotal = product.price * item.quantity;

    orderItems.push({
      product: product._id,
      farmer: product.farmer,
      name: product.name,
      quantity: item.quantity,
      price: product.price,
      subtotal: itemSubtotal,
      status: 'pending'
    });

    subtotal += itemSubtotal;
  }

  const totalAmount = subtotal + Number(deliveryFee);

  // Reduce stock
  for (const item of items) {
    await Product.findByIdAndUpdate(
      item.product,
      {
        $inc: {
          availableQuantity: -item.quantity
        }
      }
    );
  }

  // Create order
  const order = await Order.create({
    customer: customerId,
    items: orderItems,
    shippingAddress,
    subtotal,
    deliveryFee: Number(deliveryFee),
    totalAmount
  });

  return order;
};

// Get customer's orders
const getMyOrders = async (customerId) => {
  const orders = await Order.find({ customer: customerId })
    .populate('items.product', 'name image price unit')
    .populate('items.farmer', 'firstName lastName')
    .sort({ createdAt: -1 });

  return {
    count: orders.length,
    orders
  };
};

// Get single order by ID
const getOrderById = async (orderId, user) => {
  const order = await Order.findById(orderId)
    .populate('customer', 'firstName lastName email phone')
    .populate('items.product', 'name image price unit')
    .populate('items.farmer', 'firstName lastName');

  if (!order) {
    throw {
      statusCode: 404,
      message: 'Order not found'
    };
  }

  if (user.role === 'customer' && order.customer._id.toString() !== user._id.toString()) {
    throw {
      statusCode: 403,
      message: 'You can only view your own orders'
    };
  }

  if (user.role === 'farmer' && !order.items.some(
    (item) => item.farmer && item.farmer._id.toString() === user._id.toString()
  )) {
    throw {
      statusCode: 403,
      message: 'You are not authorized to view this order'
    };
  }

  return order;
};

// Cancel order (only if it's pending)
const cancelOrder = async (orderId, customerId) => {
  const order = await Order.findById(orderId);

  if (!order) {
    throw {
      statusCode: 404,
      message: 'Order not found'
    };
  }

  // Verify customer owns this order
  if (order.customer.toString() !== customerId.toString()) {
    throw {
      statusCode: 403,
      message: 'You can only cancel your own orders'
    };
  }

  // Check if order is still pending
  if (order.orderStatus !== 'pending') {
    throw {
      statusCode: 400,
      message: 'Order cannot be cancelled. It is already ' + order.orderStatus
    };
  }

  // Restore stock
  for (const item of order.items) {
    await Product.findByIdAndUpdate(
      item.product,
      {
        $inc: {
          availableQuantity: item.quantity
        }
      }
    );
  }

  order.orderStatus = 'cancelled';
  await order.save();

  return order;
};

const getFarmerOrders = async (farmerId) => {
  const orders = await Order.find({ 'items.farmer': farmerId })
    .populate('customer', 'firstName lastName email phone')
    .populate('items.product', 'name image price unit')
    .sort({ createdAt: -1 });

  return {
    count: orders.length,
    orders
  };
};

const updateOrderItemStatus = async (orderId, farmerId, productId, status) => {
  if (!['processing', 'shipped'].includes(status)) {
    throw { statusCode: 400, message: 'Farmers can only set items to processing or shipped' };
  }

  if (!productId) {
    throw { statusCode: 400, message: 'Product ID is required' };
  }

  const order = await Order.findById(orderId);
  if (!order) {
    throw { statusCode: 404, message: 'Order not found' };
  }

  const orderItem = order.items.find((item) => item.product.toString() === productId);
  if (!orderItem) {
    throw { statusCode: 404, message: 'Product not found in this order' };
  }

  if (orderItem.farmer.toString() !== farmerId.toString()) {
    throw { statusCode: 403, message: 'You are not authorized to update this product' };
  }

  if (status === 'processing' && orderItem.status !== 'pending') {
    throw { statusCode: 400, message: 'Only pending items can be moved to processing' };
  }

  if (status === 'shipped' && orderItem.status !== 'processing') {
    throw { statusCode: 400, message: 'Only processing items can be shipped' };
  }

  orderItem.status = status;
  updateOverallOrderStatus(order);
  await order.save();

  return order;
};

const confirmDelivery = async (orderId, customerId, productId) => {
  if (!productId) {
    throw { statusCode: 400, message: 'Product ID is required' };
  }

  const order = await Order.findById(orderId);
  if (!order) {
    throw { statusCode: 404, message: 'Order not found' };
  }

  if (order.customer.toString() !== customerId.toString()) {
    throw { statusCode: 403, message: 'You can only confirm your own orders' };
  }

  const orderItem = order.items.find((item) => item.product.toString() === productId);
  if (!orderItem) {
    throw { statusCode: 404, message: 'Product not found in this order' };
  }

  if (orderItem.status !== 'shipped') {
    throw { statusCode: 400, message: 'Only shipped products can be marked as delivered' };
  }

  orderItem.status = 'delivered';
  updateOverallOrderStatus(order);
  await order.save();

  return order;
};

const updateOverallOrderStatus = (order) => {
  const statuses = order.items.map((item) => item.status);

  if (statuses.every((status) => status === 'delivered')) {
    order.orderStatus = 'delivered';
  } else if (statuses.every((status) => status === 'shipped' || status === 'delivered')) {
    order.orderStatus = 'shipped';
  } else if (statuses.some((status) => ['processing', 'shipped', 'delivered'].includes(status))) {
    order.orderStatus = 'processing';
  } else {
    order.orderStatus = 'pending';
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  getFarmerOrders,
  updateOrderItemStatus,
  confirmDelivery
};
