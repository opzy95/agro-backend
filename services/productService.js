const Product = require('../models/product');
const Review = require('../models/review');
const Order = require('../models/order');
const { deleteImage, uploadImage } = require('../config/cloudinary');

// Helper: Get all product image files from request
const getProductImageFiles = (files) => [
  ...(files?.images || []),
  ...(files?.image || [])
];

// Helper: Get all image public IDs from product
const getImagePublicIds = (product) => [
  ...(product.images || []).map((image) => image.publicId),
  product.imagePublicId
].filter(Boolean).filter((publicId, index, publicIds) => (
  publicIds.indexOf(publicId) === index
));

// Helper: Normalize shipping methods
const normalizeShippingMethods = (value) => {
  if (value === undefined || value === '') {
    return [];
  }

  let methods = value;

  if (typeof methods === 'string') {
    try {
      methods = JSON.parse(methods);
    } catch (error) {
      methods = methods.split(',');
    }
  }

  if (!Array.isArray(methods)) {
    methods = [methods];
  }

  const labels = {
    'farm pickup': 'farmPickup',
    'local delivery': 'localDelivery',
    'national courier': 'nationalCourier'
  };

  return methods.map((method) => {
    const normalized = String(method).trim();
    return labels[normalized.toLowerCase()] || normalized;
  });
};

// Create product
const createProduct = async (farmerId, productData, files) => {
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
  } = productData;

  const normalizedShippingMethods = normalizeShippingMethods(shippingMethods);

  // Validate required fields
  if (
    !name ||
    !category ||
    !description ||
    price === undefined ||
    availableQuantity === undefined ||
    !farmLocation
  ) {
    throw {
      statusCode: 400,
      message: 'Please provide all required product details'
    };
  }

  // Check for duplicate product
  const existingProduct = await Product.findOne({
    farmer: farmerId,
    name: { $regex: `^${name}$`, $options: 'i' },
    category,
    unit
  });

  if (existingProduct) {
    throw {
      statusCode: 409,
      message: 'You already have a product with this name, category and unit'
    };
  }

  // Upload images
  const imageFiles = getProductImageFiles(files);
  const uploadedImages = await Promise.all(
    imageFiles.map((file) => uploadImage(file, 'agro/products'))
  );
  const firstImage = uploadedImages[0];

  // Create product
  const product = await Product.create({
    name,
    category,
    sku,
    description,
    image: firstImage ? firstImage.url : image,
    imagePublicId: firstImage ? firstImage.publicId : '',
    images: uploadedImages,
    price,
    unit,
    availableQuantity,
    minimumOrderQuantity,
    farmLocation,
    shippingMethods: normalizedShippingMethods,
    farmer: farmerId,
    status: status || 'draft'
  });

  return product;
};

// Get all published products, optionally filtered by farmer
const getProducts = async (farmerId) => {
  const filter = { status: 'published' };

  if (farmerId) {
    filter.farmer = farmerId;
  }

  const products = await Product.find(filter)
    .populate('farmer', 'firstName lastName farmName')
    .sort({ createdAt: -1 });

  return {
    count: products.length,
    products
  };
};

// Get single product by ID
const getProductById = async (productId) => {
  const product = await Product.findById(productId)
    .populate('farmer', 'firstName lastName farmName');

  if (!product) {
    throw {
      statusCode: 404,
      message: 'Product not found'
    };
  }

  return product;
};

const addProductReview = async (productId, customerId, rating) => {
  const numericRating = Number(rating);

  if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
    throw {
      statusCode: 400,
      message: 'Rating must be an integer between 1 and 5'
    };
  }

  const product = await Product.findById(productId);
  if (!product) {
    throw {
      statusCode: 404,
      message: 'Product not found'
    };
  }

  const deliveredOrder = await Order.findOne({
    customer: customerId,
    items: {
      $elemMatch: {
        product: productId,
        status: 'delivered'
      }
    }
  });

  if (!deliveredOrder) {
    throw {
      statusCode: 403,
      message: 'You can only review products you have received'
    };
  }

  const review = await Review.create({
    product: productId,
    customer: customerId,
    rating: numericRating
  });

  const [ratingSummary] = await Review.aggregate([
    { $match: { product: product._id } },
    {
      $group: {
        _id: '$product',
        averageRating: { $avg: '$rating' },
        ratingCount: { $sum: 1 }
      }
    }
  ]);

  product.rating = Number(ratingSummary.averageRating.toFixed(1));
  product.ratingCount = ratingSummary.ratingCount;
  await product.save();

  return { review, product };
};

const getProductReviews = async (productId) => {
  const product = await Product.findById(productId).select('_id name rating ratingCount');
  if (!product) {
    throw {
      statusCode: 404,
      message: 'Product not found'
    };
  }

  const reviews = await Review.find({ product: productId })
    .populate('customer', 'firstName lastName')
    .sort({ createdAt: -1 });

  return { product, reviews };
};

// Get farmer's products
const getMyProducts = async (farmerId) => {
  const products = await Product.find({ farmer: farmerId })
    .sort({ createdAt: -1 });

  return {
    count: products.length,
    products
  };
};

// Update product
const updateProduct = async (productId, farmerId, updateData, files) => {
  const product = await Product.findById(productId);

  if (!product) {
    throw {
      statusCode: 404,
      message: 'Product not found'
    };
  }

  // Verify farmer owns this product
  if (product.farmer.toString() !== farmerId.toString()) {
    throw {
      statusCode: 403,
      message: 'You can only update your own products'
    };
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

  const previousImagePublicIds = getImagePublicIds(product);
  const imageFiles = getProductImageFiles(files);

  allowedFields.forEach((field) => {
    if (updateData[field] !== undefined) {
      product[field] = updateData[field];
    }
  });

  // Update images if provided
  if (imageFiles.length > 0) {
    const uploadedImages = await Promise.all(
      imageFiles.map((file) => uploadImage(file, 'agro/products'))
    );
    product.images = uploadedImages;
    product.image = uploadedImages[0].url;
    product.imagePublicId = uploadedImages[0].publicId;
  }

  await product.save();

  // Delete old images
  if (imageFiles.length > 0) {
    await Promise.all(previousImagePublicIds.map((publicId) => deleteImage(publicId)));
  }

  return product;
};

// Delete product
const deleteProduct = async (productId, farmerId) => {
  const product = await Product.findById(productId);

  if (!product) {
    throw {
      statusCode: 404,
      message: 'Product not found'
    };
  }

  // Verify farmer owns this product
  if (product.farmer.toString() !== farmerId.toString()) {
    throw {
      statusCode: 403,
      message: 'You can only delete your own products'
    };
  }

  // Delete images from cloudinary
  const imagePublicIds = getImagePublicIds(product);
  await Promise.all(imagePublicIds.map((publicId) => deleteImage(publicId)));

  await Product.findByIdAndDelete(productId);

  return {
    message: 'Product deleted successfully'
  };
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  addProductReview,
  getProductReviews,
  getMyProducts,
  updateProduct,
  deleteProduct
};
