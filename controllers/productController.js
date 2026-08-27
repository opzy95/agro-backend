const Product = require('../models/product');
const { deleteImage, uploadImage } = require('../config/cloudinary');

const getProductImageFiles = (req) => [
  ...(req.files?.images || []),
  ...(req.files?.image || [])
];

const getImagePublicIds = (product) => [
  ...(product.images || []).map((image) => image.publicId),
  product.imagePublicId
].filter(Boolean).filter((publicId, index, publicIds) => (
  publicIds.indexOf(publicId) === index
));

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

// CREATE PRODUCT

const createProduct = async (req, res) => {
  try {
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
    } = req.body;

    const normalizedShippingMethods = normalizeShippingMethods(shippingMethods);

    if (
      !name ||
      !category ||
      !description ||
      price === undefined ||
      availableQuantity === undefined ||
      !farmLocation
    ) {
      return res.status(400).json({
        message: 'Please provide all required product details'
      });
    }

    const existingProduct = await Product.findOne({
      farmer: req.user._id,
      name: { $regex: `^${name}$`, $options: 'i' },
      category,
      unit
    });

    if (existingProduct) {
      return res.status(409).json({
        message: 'You already have a product with this name, category and unit'
      });
    }

    const imageFiles = getProductImageFiles(req);
    const uploadedImages = await Promise.all(
      imageFiles.map((file) => uploadImage(file, 'agro/products'))
    );
    const firstImage = uploadedImages[0];

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
      farmer: req.user._id,
      status: status || 'draft'
    });

    res.status(201).json({
      message: 'Product created successfully',
      product
    });

  } catch (error) {
    console.error('Create product error:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        message: 'A product with this SKU already exists'
      });
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Invalid product details',
        errors: Object.values(error.errors).map((item) => item.message)
      });
    }

    res.status(error.statusCode || 500).json({
      message: error.message || 'Failed to create product'
    });
  }
};


// GET ALL PUBLISHED PRODUCTS
const getProducts = async (req, res) => {
  try {
    const products = await Product.find({
      status: 'published'
    })
      .populate('farmer', 'firstName lastName farmName')
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: products.length,
      products
    });

  } catch (error) {
    console.error('Get products error:', error);

    res.status(500).json({
      message: 'Failed to get products'
    });
  }
};


// GET SINGLE PRODUCT
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('farmer', 'firstName lastName farmName');

    if (!product) {
      return res.status(404).json({
        message: 'Product not found'
      });
    }

    res.status(200).json({
      product
    });

  } catch (error) {
    console.error('Get product error:', error);

    res.status(500).json({
      message: 'Failed to get product'
    });
  }
};


// GET FARMER'S PRODUCTS
const getMyProducts = async (req, res) => {
  try {
    const products = await Product.find({
      farmer: req.user._id
    }).sort({ createdAt: -1 });

    res.status(200).json({
      count: products.length,
      products
    });

  } catch (error) {
    console.error('Get my products error:', error);

    res.status(500).json({
      message: 'Failed to get your products'
    });
  }
};


// UPDATE PRODUCT
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: 'Product not found'
      });
    }

    // Make sure the logged-in farmer owns this product
    if (product.farmer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'You can only update your own products'
      });
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
    const imageFiles = getProductImageFiles(req);

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        product[field] = req.body[field];
      }
    });

    if (imageFiles.length > 0) {
      const uploadedImages = await Promise.all(
        imageFiles.map((file) => uploadImage(file, 'agro/products'))
      );
      product.images = uploadedImages;
      product.image = uploadedImages[0].url;
      product.imagePublicId = uploadedImages[0].publicId;
    }

    await product.save();

    if (imageFiles.length > 0) {
      await Promise.all(previousImagePublicIds.map((publicId) => deleteImage(publicId)));
    }

    res.status(200).json({
      message: 'Product updated successfully',
      product
    });

  } catch (error) {
    console.error('Update product error:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        message: 'A product with this SKU already exists'
      });
    }

    res.status(error.statusCode || 500).json({
      message: 'Failed to update product'
    });
  }
};


// DELETE PRODUCT
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: 'Product not found'
      });
    }

    // Make sure the logged-in farmer owns this product
    if (product.farmer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'You can only delete your own products'
      });
    }

    await Product.findByIdAndDelete(req.params.id);
    await Promise.all(getImagePublicIds(product).map((publicId) => deleteImage(publicId)));

    res.status(200).json({
      message: 'Product deleted successfully'
    });

  } catch (error) {
    console.error('Delete product error:', error);

    res.status(500).json({
      message: 'Failed to delete product'
    });
  }
};


module.exports = {
  createProduct,
  getProducts,
  getProductById,
  getMyProducts,
  updateProduct,
  deleteProduct
};