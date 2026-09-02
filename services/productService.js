const Product = require('../models/product');
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

// Get all published products
const getProducts = async () => {
  const products = await Product.find({ status: 'published' })
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
  getMyProducts,
  updateProduct,
  deleteProduct
};
