const Order = require("../models/order");
const Product = require("../models/product");
const Cart = require("../models/cart");
const { initializeTransaction, verifyTransaction } = require("./paystackService");
const { creditOrderEarnings } = require("./walletService");
const {
  createNotification,
  notifyRole
} = require("./notificationService");

const DELIVERY_METHODS = [
  "farm_pickup",
  "local_delivery",
  "national_courier"
];

const publishNotifications = (notifications) => {
  Promise.all(notifications).catch((error) => {
    console.error("Publish order notifications error:", error);
  });
};

const validateDeliveryDetails = (deliveryMethod, shippingAddress) => {
  if (!DELIVERY_METHODS.includes(deliveryMethod)) {
    throw {
      statusCode: 400,
      message: "A valid delivery method is required: farm_pickup, local_delivery, or national_courier"
    };
  }

  if (
    ["local_delivery", "national_courier"].includes(deliveryMethod) &&
    (!shippingAddress ||
      !shippingAddress.fullName ||
      !shippingAddress.phone ||
      !shippingAddress.address)
  ) {
    throw {
      statusCode: 400,
      message: "Complete shipping address is required for this delivery method"
    };
  }
};

const validateAndPriceOrder = async (orderData) => {
  const {
    items,
    deliveryMethod,
    shippingAddress,
    deliveryFee = 0
  } = orderData;

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw {
      statusCode: 400,
      message: "Order must contain at least one product",
    };
  }

  validateDeliveryDetails(deliveryMethod, shippingAddress);

  let subtotal = 0;

  for (const item of items) {
    if (!item.product || !item.quantity) {
      throw {
        statusCode: 400,
        message: "Each order item must contain a product and quantity",
      };
    }

    const product = await Product.findById(item.product);

    if (!product) {
      throw { statusCode: 404, message: `Product ${item.product} not found` };
    }

    if (product.status !== "published") {
      throw {
        statusCode: 400,
        message: `${product.name} is not currently available`,
      };
    }

    if (item.quantity < product.minimumOrderQuantity) {
      throw {
        statusCode: 400,
        message: `Minimum order quantity for ${product.name} is ${product.minimumOrderQuantity}`,
      };
    }

    if (item.quantity > product.availableQuantity) {
      throw {
        statusCode: 400,
        message: `Only ${product.availableQuantity} units of ${product.name} are available`,
      };
    }

    subtotal += product.price * item.quantity;
  }

  return {
    subtotal,
    deliveryFee: Number(deliveryFee),
    totalAmount: subtotal + Number(deliveryFee)
  };
};

const initializePayment = async (customer, orderData) => {
  const pricing = await validateAndPriceOrder(orderData);
  const clientUrl = (process.env.CLIENT_URL || '').trim().replace(/\/+$/, '');

  if (!clientUrl) {
    throw {
      statusCode: 500,
      message: 'CLIENT_URL is not configured. Set it to the frontend URL.'
    };
  }

  const callbackUrl = `${clientUrl}/payment/callback`;
  console.log(`[Payment] Callback URL: ${callbackUrl}`);

  const payment = await initializeTransaction({
    email: customer.email,
    amount: pricing.totalAmount,
    callbackUrl,
    metadata: {
      customerId: customer._id.toString(),
      orderData,
      totalAmount: pricing.totalAmount
    }
  });

  return {
    authorizationUrl: payment.authorization_url,
    accessCode: payment.access_code,
    reference: payment.reference,
    amount: pricing.totalAmount,
    currency: 'NGN'
  };
};

// Create order
const createOrder = async (customerId, orderData, payment) => {
  if (!payment || payment.status !== "success" || !payment.reference) {
    throw {
      statusCode: 400,
      message: "An order can only be created after successful payment",
    };
  }

  const {
    items,
    deliveryMethod,
    shippingAddress,
    deliveryFee = 0
  } = orderData;

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw {
      statusCode: 400,
      message: "Order must contain at least one product",
    };
  }

  validateDeliveryDetails(deliveryMethod, shippingAddress);

  const orderItems = [];
  let subtotal = 0;

  // Validate all products
  for (const item of items) {
    if (!item.product || !item.quantity) {
      throw {
        statusCode: 400,
        message: "Each order item must contain a product and quantity",
      };
    }

    const product = await Product.findById(item.product);

    if (!product) {
      throw {
        statusCode: 404,
        message: `Product ${item.product} not found`,
      };
    }

    // Product must be published
    if (product.status !== "published") {
      throw {
        statusCode: 400,
        message: `${product.name} is not currently available`,
      };
    }

    // Validate quantity
    if (item.quantity < product.minimumOrderQuantity) {
      throw {
        statusCode: 400,
        message: `Minimum order quantity for ${product.name} is ${product.minimumOrderQuantity}`,
      };
    }

    // Check stock
    if (item.quantity > product.availableQuantity) {
      throw {
        statusCode: 400,
        message: `Only ${product.availableQuantity} units of ${product.name} are available`,
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
      status: "pending",
    });

    subtotal += itemSubtotal;
  }

  const totalAmount = subtotal + Number(deliveryFee);

  // Reduce stock
  for (const item of items) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: {
        availableQuantity: -item.quantity,
      },
    });
  }

  // Create order
  const order = await Order.create({
    customer: customerId,
    items: orderItems,
    deliveryMethod,
    shippingAddress,
    subtotal,
    deliveryFee: Number(deliveryFee),
    totalAmount,
    paymentStatus: "paid",
    paymentReference: payment.reference,
    farmerStatuses: [...new Set(orderItems.map((item) => item.farmer.toString()))]
      .map((farmer) => ({ farmer, status: "pending" })),
  });

  await creditOrderEarnings(order);

  const farmerIds = [...new Set(order.items.map((item) => item.farmer.toString()))];
  publishNotifications([
    ...farmerIds.map((farmerId) => createNotification({
      recipient: farmerId,
      type: "new_order",
      title: "New order received",
      message: "A customer placed an order for one of your products.",
      order: order._id
    })),
    notifyRole({
      role: "admin",
      type: "new_order",
      title: "New order placed",
      message: "A customer placed a new order.",
      order: order._id
    })
  ]);

  return order;
};

const verifyPaymentAndCreateOrder = async (customerId, reference) => {
  if (!reference) {
    throw { statusCode: 400, message: "Payment reference is required" };
  }

  const payment = await verifyTransaction(reference);

  if (payment.status !== "success") {
    throw { statusCode: 400, message: "Payment was not successful" };
  }

  let metadata = payment.metadata || {};
  if (typeof metadata === "string") {
    try {
      metadata = JSON.parse(metadata);
    } catch (error) {
      throw {
        statusCode: 400,
        message: "Payment metadata is invalid",
      };
    }
  }

  if (metadata.customerId !== customerId.toString()) {
    throw { statusCode: 403, message: "This payment does not belong to you" };
  }

  const orderData = metadata.orderData;
  if (!orderData) {
    throw { statusCode: 400, message: "Payment does not contain order details" };
  }

  const pricing = await validateAndPriceOrder(orderData);
  if (Number(payment.amount) !== Math.round(pricing.totalAmount * 100)) {
    throw { statusCode: 400, message: "Payment amount does not match the order" };
  }

  const existingOrder = await Order.findOne({ paymentReference: reference });
  if (existingOrder) {
    await Cart.findOneAndUpdate(
      { customer: customerId },
      { $set: { items: [], totalAmount: 0 } }
    );
    return existingOrder;
  }

  const order = await createOrder(customerId, orderData, payment);

  await Cart.findOneAndUpdate(
    { customer: customerId },
    { $set: { items: [], totalAmount: 0 } }
  );

  return order;
};

// Get customer's orders
const getMyOrders = async (customerId) => {
  const orders = await Order.find({ customer: customerId })
    .populate("items.product", "name image price unit")
    .populate("items.farmer", "firstName lastName")
    .sort({ createdAt: -1 });

  return {
    count: orders.length,
    orders,
  };
};

// Get single order by ID
const getOrderById = async (orderId, user) => {
  const order = await Order.findById(orderId)
    .populate("customer", "firstName lastName email phone")
    .populate("items.product", "name image price unit")
    .populate("items.farmer", "firstName lastName");

  if (!order) {
    throw {
      statusCode: 404,
      message: "Order not found",
    };
  }

  if (
    user.role === "customer" &&
    order.customer._id.toString() !== user._id.toString()
  ) {
    throw {
      statusCode: 403,
      message: "You can only view your own orders",
    };
  }

  if (
    user.role === "farmer" &&
    !order.items.some(
      (item) =>
        item.farmer && item.farmer._id.toString() === user._id.toString(),
    )
  ) {
    throw {
      statusCode: 403,
      message: "You are not authorized to view this order",
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
      message: "Order not found",
    };
  }

  // Verify customer owns this order
  if (order.customer.toString() !== customerId.toString()) {
    throw {
      statusCode: 403,
      message: "You can only cancel your own orders",
    };
  }

  // Check if order is still pending
  if (order.orderStatus !== "pending") {
    throw {
      statusCode: 400,
      message: "Order cannot be cancelled. It is already " + order.orderStatus,
    };
  }

  // Restore stock
  for (const item of order.items) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: {
        availableQuantity: item.quantity,
      },
    });
  }

  order.orderStatus = "cancelled";
  order.farmerStatuses = [...new Set(order.items.map((item) => item.farmer.toString()))]
    .map((farmer) => ({ farmer, status: "cancelled" }));
  await order.save();

  return order;
};

const getFarmerOrders = async (farmerId) => {
  const orders = await Order.find({ "items.farmer": farmerId })
    .populate("customer", "firstName lastName email phone")
    .populate("items.product", "name image price unit")
    .sort({ createdAt: -1 });

  return {
    count: orders.length,
    orders: orders.map((order) => ({
      ...order.toObject(),
      deliveryMethod: order.deliveryMethod,
      farmerStatus: order.farmerStatuses?.find(
        (entry) => entry.farmer.toString() === farmerId.toString(),
      )?.status || getStatusForItems(
        order.items.filter((item) => item.farmer.toString() === farmerId.toString()),
      ),
      items: order.items.map((item) => ({
        ...item.toObject(),
        productId: item.product?._id || item.product
      }))
    }))
  };
};

const updateOrderItemStatus = async (orderId, farmerId, productId, status) => {
  if (!["processing", "shipped"].includes(status)) {
    throw {
      statusCode: 400,
      message: "Invalid status",
    };
  }

  if (!productId) {
    throw {
      statusCode: 400,
      message: "Product ID is required",
    };
  }

  const order = await Order.findById(orderId);

  if (!order) {
    throw {
      statusCode: 404,
      message: "Order not found",
    };
  }

  // Legacy pickup orders were created before deliveryMethod was required.
  if (
    !order.deliveryMethod &&
    (!order.shippingAddress ||
      !order.shippingAddress.fullName ||
      !order.shippingAddress.phone ||
      !order.shippingAddress.address)
  ) {
    order.deliveryMethod = "farm_pickup";
  }

  const orderItem = order.items.find(
    (item) => item.product.toString() === productId,
  );

  if (!orderItem) {
    throw {
      statusCode: 404,
      message: "Product not found in this order",
    };
  }

  if (orderItem.farmer.toString() !== farmerId.toString()) {
    throw {
      statusCode: 403,
      message: "You are not authorized to update this product",
    };
  }

  const farmerItems = order.items.filter(
    (item) => item.farmer.toString() === farmerId.toString(),
  );

  if (order.deliveryMethod === "farm_pickup" && status === "shipped") {
    throw {
      statusCode: 400,
      message: "Farm pickup orders only require the farmer to mark the item as processing",
    };
  }

  // Status transition rules
  if (status === "processing" && farmerItems.some((item) => item.status !== "pending")) {
    throw {
      statusCode: 400,
      message: "Only pending items can be moved to processing",
    };
  }

  if (status === "shipped" && farmerItems.some((item) => item.status !== "processing")) {
    throw {
      statusCode: 400,
      message: "Only processing items can be shipped",
    };
  }

  // Keep all items from one farmer in the same status.
  farmerItems.forEach((item) => {
    item.status = status;
  });

  const farmerStatuses = order.farmerStatuses || [];
  const farmerStatus = farmerStatuses.find(
    (entry) => entry.farmer.toString() === farmerId.toString(),
  );
  if (farmerStatus) {
    farmerStatus.status = status;
  } else {
    farmerStatuses.push({ farmer: farmerId, status });
    order.farmerStatuses = farmerStatuses;
  }

  if (status === "shipped") {
    publishNotifications([
      createNotification({
        recipient: order.customer,
        type: "order_shipped",
        title: "Order shipped",
        message: `${orderItem.name} has been shipped.`,
        order: order._id
      })
    ]);
  }

  updateOverallOrderStatus(order);

  await creditOrderEarnings(order);

  await order.save();

  return order;
};

const confirmDelivery = async (orderId, customerId, productId) => {
  if (!productId) {
    throw { statusCode: 400, message: "Product ID is required" };
  }

  const order = await Order.findById(orderId);
  if (!order) {
    throw { statusCode: 404, message: "Order not found" };
  }

  if (order.customer.toString() !== customerId.toString()) {
    throw { statusCode: 403, message: "You can only confirm your own orders" };
  }

  // Legacy pickup orders were created before deliveryMethod was required.
  if (
    !order.deliveryMethod &&
    (!order.shippingAddress ||
      !order.shippingAddress.fullName ||
      !order.shippingAddress.phone ||
      !order.shippingAddress.address)
  ) {
    order.deliveryMethod = "farm_pickup";
  }

  const orderItem = order.items.find(
    (item) => item.product.toString() === productId,
  );
  if (!orderItem) {
    throw { statusCode: 404, message: "Product not found in this order" };
  }

  if (orderItem.status === "delivered") {
    return { order, item: orderItem };
  }

  const canConfirmPickup =
    order.deliveryMethod === "farm_pickup" && orderItem.status === "processing";
  const canConfirmDelivery =
    order.deliveryMethod !== "farm_pickup" && orderItem.status === "shipped";

  if (!canConfirmPickup && !canConfirmDelivery) {
    throw {
      statusCode: 400,
      message: order.deliveryMethod === "farm_pickup"
        ? "Only processing pickup items can be marked as received"
        : "Only shipped products can be marked as delivered",
    };
  }

  orderItem.status = "delivered";
  publishNotifications([
    createNotification({
      recipient: orderItem.farmer,
      type: "order_received",
      title: "Order received",
      message: `${orderItem.name} was confirmed as received by the customer.`,
      order: order._id
    })
  ]);
  updateOverallOrderStatus(order);
  await creditOrderEarnings(order);
  await order.save();

  return { order, item: orderItem };
};

const updateOverallOrderStatus = (order) => {
  order.farmerStatuses = [...new Set(order.items.map((item) => item.farmer.toString()))]
    .map((farmer) => {
      const farmerItems = order.items.filter(
        (item) => item.farmer.toString() === farmer,
      );
      return {
        farmer,
        status: getStatusForItems(farmerItems),
      };
    });

  const statuses = order.items.map((item) => item.status);

  if (statuses.every((status) => status === "delivered")) {
    order.orderStatus = "delivered";
  } else if (statuses.some((status) => status === "delivered")) {
    order.orderStatus = "partially_delivered";
  } else if (
    statuses.every((status) => status === "shipped" || status === "delivered")
  ) {
    order.orderStatus = "shipped";
  } else if (
    statuses.some((status) =>
      ["processing", "shipped", "delivered"].includes(status),
    )
  ) {
    order.orderStatus = "processing";
  } else {
    order.orderStatus = "pending";
  }
};

const getStatusForItems = (items) => {
  const statuses = items.map((item) => item.status);

  if (statuses.every((status) => status === "delivered")) return "delivered";
  if (statuses.some((status) => status === "delivered")) return "partially_delivered";
  if (statuses.every((status) => status === "shipped" || status === "delivered")) {
    return "shipped";
  }
  if (statuses.some((status) => ["processing", "shipped", "delivered"].includes(status))) {
    return "processing";
  }
  return "pending";
};

module.exports = {
  createOrder,
  initializePayment,
  verifyPaymentAndCreateOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  getFarmerOrders,
  updateOrderItemStatus,
  confirmDelivery,
};
