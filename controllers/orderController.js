const Order = require('../models/Order');
const Product = require('../models/product');

// ==========================================
// CUSTOMER: CREATE ORDER
// ==========================================

const createOrder = async (req, res) => {
  try {
    const {
      items,
      shippingAddress,
      deliveryFee = 0
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: 'Order must contain at least one product'
      });
    }

    if (
      !shippingAddress ||
      !shippingAddress.fullName ||
      !shippingAddress.phone ||
      !shippingAddress.address
    ) {
      return res.status(400).json({
        message: 'Complete shipping address is required'
      });
    }

    const orderItems = [];
    let subtotal = 0;

    // Check every product
    for (const item of items) {
      if (!item.product || !item.quantity) {
        return res.status(400).json({
          message: 'Each order item must contain a product and quantity'
        });
      }

      const product = await Product.findById(item.product);

      if (!product) {
        return res.status(404).json({
          message: `Product ${item.product} not found`
        });
      }

      // Product must be published
      if (product.status !== 'published') {
        return res.status(400).json({
          message: `${product.name} is not currently available`
        });
      }

      // Validate quantity
      if (item.quantity < product.minimumOrderQuantity) {
        return res.status(400).json({
          message: `Minimum order quantity for ${product.name} is ${product.minimumOrderQuantity}`
        });
      }

      // Check stock
      if (item.quantity > product.availableQuantity) {
        return res.status(400).json({
          message: `Only ${product.availableQuantity} units of ${product.name} are available`
        });
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

    const order = await Order.create({
      customer: req.user._id,
      items: orderItems,
      shippingAddress,
      subtotal,
      deliveryFee: Number(deliveryFee),
      totalAmount
    });

    res.status(201).json({
      message: 'Order created successfully',
      order
    });

  } catch (error) {
    console.error('Create order error:', error);

    res.status(500).json({
      message: 'Failed to create order'
    });
  }
};


// ==========================================
// CUSTOMER: GET MY ORDERS
// ==========================================

const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      customer: req.user._id
    })
      .populate('items.product', 'name image price unit')
      .populate('items.farmer', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: orders.length,
      orders
    });

  } catch (error) {
    console.error('Get customer orders error:', error);

    res.status(500).json({
      message: 'Failed to get your orders'
    });
  }
};


// ==========================================
// CUSTOMER: GET ONE ORDER
// ==========================================

const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'firstName lastName email phone')
      .populate('items.product', 'name image price unit')
      .populate('items.farmer', 'firstName lastName email phone');

    if (!order) {
      return res.status(404).json({
        message: 'Order not found'
      });
    }

    // Customer can only see their own order
    if (
      req.user.role === 'customer' &&
      order.customer._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        message: 'You are not authorized to view this order'
      });
    }

    // Farmer can only see orders containing their products
    if (req.user.role === 'farmer') {
      const isFarmerInOrder = order.items.some(
        (item) =>
          item.farmer &&
          item.farmer._id.toString() === req.user._id.toString()
      );

      if (!isFarmerInOrder) {
        return res.status(403).json({
          message: 'You are not authorized to view this order'
        });
      }
    }

    res.status(200).json({
      order
    });

  } catch (error) {
    console.error('Get order error:', error);

    res.status(500).json({
      message: 'Failed to get order'
    });
  }
};


// ==========================================
// CUSTOMER: CANCEL ORDER
// ==========================================

const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: 'Order not found'
      });
    }

    if (order.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'You can only cancel your own orders'
      });
    }

    if (
      order.orderStatus !== 'pending'
    ) {
      return res.status(400).json({
        message: 'Only pending orders can be cancelled'
      });
    }

    // Return products to inventory
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

    res.status(200).json({
      message: 'Order cancelled successfully',
      order
    });

  } catch (error) {
    console.error('Cancel order error:', error);

    res.status(500).json({
      message: 'Failed to cancel order'
    });
  }
};


// ==========================================
// FARMER: GET ORDERS
// ==========================================

const getFarmerOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      'items.farmer': req.user._id
    })
      .populate('customer', 'firstName lastName email phone')
      .populate('items.product', 'name image price unit')
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: orders.length,
      orders
    });

  } catch (error) {
    console.error('Get farmer orders error:', error);

    res.status(500).json({
      message: 'Failed to get farmer orders'
    });
  }
};


// ==========================================
// FARMER: UPDATE ORDER STATUS
// ==========================================

// const updateOrderStatus = async (req, res) => {
//   try {
//     const { status } = req.body;

//     // Farmers can only set these two statuses
//     const allowedStatuses = ['processing', 'shipped'];

//     if (!allowedStatuses.includes(status)) {
//       return res.status(400).json({
//         message: 'Farmers can only set orders to processing or shipped'
//       });
//     }

//     const order = await Order.findById(req.params.id);

//     if (!order) {
//       return res.status(404).json({
//         message: 'Order not found'
//       });
//     }

//     // Check whether this farmer has a product in the order
//     const isFarmerInOrder = order.items.some(
//       (item) =>
//         item.farmer.toString() === req.user._id.toString()
//     );

//     if (!isFarmerInOrder) {
//       return res.status(403).json({
//         message: 'You are not authorized to update this order'
//       });
//     }

//     // Prevent updates to cancelled orders
//     if (order.orderStatus === 'cancelled') {
//       return res.status(400).json({
//         message: 'Cancelled orders cannot be updated'
//       });
//     }

//     // pending → processing
//     if (
//       status === 'processing' &&
//       order.orderStatus !== 'pending'
//     ) {
//       return res.status(400).json({
//         message: 'Only pending orders can be moved to processing'
//       });
//     }

//     // processing → shipped
//     if (
//       status === 'shipped' &&
//       order.orderStatus !== 'processing'
//     ) {
//       return res.status(400).json({
//         message: 'Only processing orders can be shipped'
//       });
//     }

//     order.orderStatus = status;

//     await order.save();

//     res.status(200).json({
//       message: `Order marked as ${status}`,
//       order
//     });

//   } catch (error) {
//     console.error('Update order status error:', error);

//     res.status(500).json({
//       message: 'Failed to update order status'
//     });
//   }
// };

const updateOrderItemStatus = async (req, res) => {
  try {
    const { status, productId } = req.body;

    const allowedStatuses = [
      'processing',
      'shipped'
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: 'Farmers can only set items to processing or shipped'
      });
    }

    if (!productId) {
      return res.status(400).json({
        message: 'Product ID is required'
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: 'Order not found'
      });
    }

    // Find the specific product in this order
    const orderItem = order.items.find(
      (item) =>
        item.product.toString() === productId
    );

    if (!orderItem) {
      return res.status(404).json({
        message: 'Product not found in this order'
      });
    }

    // Make sure the farmer owns this product
    if (
      orderItem.farmer.toString() !==
      req.user._id.toString()
    ) {
      return res.status(403).json({
        message: 'You are not authorized to update this product'
      });
    }

    // pending → processing
    if (
      status === 'processing' &&
      orderItem.status !== 'pending'
    ) {
      return res.status(400).json({
        message: 'Only pending items can be moved to processing'
      });
    }

    // processing → shipped
    if (
      status === 'shipped' &&
      orderItem.status !== 'processing'
    ) {
      return res.status(400).json({
        message: 'Only processing items can be shipped'
      });
    }

    orderItem.status = status;

    // Update overall order status
    const statuses = order.items.map(
      (item) => item.status
    );

    if (statuses.every((status) => status === 'delivered')) {
      order.orderStatus = 'delivered';
    } else if (
      statuses.every(
        (status) =>
          status === 'shipped' ||
          status === 'delivered'
      )
    ) {
      order.orderStatus = 'shipped';
    } else if (
      statuses.some(
        (status) =>
          status === 'processing' ||
          status === 'shipped' ||
          status === 'delivered'
      )
    ) {
      order.orderStatus = 'processing';
    } else {
      order.orderStatus = 'pending';
    }

    await order.save();

    res.status(200).json({
      message: `Product marked as ${status}`,
      order
    });

  } catch (error) {
    console.error(
      'Update order item status error:',
      error
    );

    res.status(500).json({
      message: 'Failed to update order item status'
    });
  }
};

const confirmDelivery = async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        message: 'Product ID is required'
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: 'Order not found'
      });
    }

    // Make sure this belongs to the customer
    if (
      order.customer.toString() !==
      req.user._id.toString()
    ) {
      return res.status(403).json({
        message: 'You can only confirm your own orders'
      });
    }

    const orderItem = order.items.find(
      (item) =>
        item.product.toString() === productId
    );

    if (!orderItem) {
      return res.status(404).json({
        message: 'Product not found in this order'
      });
    }

    if (orderItem.status !== 'shipped') {
      return res.status(400).json({
        message: 'Only shipped products can be marked as delivered'
      });
    }

    orderItem.status = 'delivered';

    // Update overall order status
    const statuses = order.items.map(
      (item) => item.status
    );

    if (statuses.every((status) => status === 'delivered')) {
      order.orderStatus = 'delivered';
    } else if (
      statuses.every(
        (status) =>
          status === 'shipped' ||
          status === 'delivered'
      )
    ) {
      order.orderStatus = 'shipped';
    } else {
      order.orderStatus = 'processing';
    }

    await order.save();

    res.status(200).json({
      message: 'Product marked as delivered',
      order
    });

  } catch (error) {
    console.error(
      'Confirm delivery error:',
      error
    );

    res.status(500).json({
      message: 'Failed to confirm delivery'
    });
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