const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();


const connectDB = require('./config/db');


const { connectRedis } = require('./config/redis');

const app = express();

const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Origin is not allowed by CORS'));
  }
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const sensitiveFieldPattern = /password|token|authorization|secret|key|cookie|email|phone|address|fullname|firstname|lastname|accountnumber|accountname|bvn|nin(document)?/i;

const sanitizeForLog = (value, depth = 0) => {
  if (depth > 4) return '[Max depth reached]';
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeForLog(item, depth + 1));
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      sensitiveFieldPattern.test(key)
        ? '[REDACTED]'
        : sanitizeForLog(item, depth + 1)
    ])
  );
};

const formatLogValue = (value) => {
  try {
    const serialized = JSON.stringify(sanitizeForLog(value));
    return serialized.length > 4000
      ? `${serialized.slice(0, 4000)}... [truncated]`
      : serialized;
  } catch (error) {
    return '[Unable to serialize]';
  }
};

app.use((req, res, next) => {
  const startedAt = Date.now();
  let responseBody;
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);

  res.json = (body) => {
    responseBody = body;
    return originalJson(body);
  };

  res.send = (body) => {
    responseBody = body;
    return originalSend(body);
  };

  res.on('finish', () => {
    console.log(`[API] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - startedAt}ms)`);
    console.log(`[API] Request: ${formatLogValue(req.body || {})}`);
    console.log(`[API] Response: ${formatLogValue(responseBody)}`);
  });

  console.log(`[API] Incoming ${req.method} ${req.originalUrl}`);
  next();
});

app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && error.type === 'entity.parse.failed') {
    return res.status(400).json({
      message: 'Request body contains invalid JSON'
    });
  }

  next(error);
});

app.get('/', (req, res) => {
  res.json({
    message: 'Agro backend is running'
  });
});

app.use((error, req, res, next) => {
  if (error.name === 'MulterError' && error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      message: 'Image must be 5 MB or smaller'
    });
  }

  if (error.message === 'Only image files are allowed') {
    return res.status(400).json({
      message: error.message
    });
  }

  next(error);
});

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    console.log("[BOOT] Connecting to MongoDB...");
    await connectDB();
    console.log("[BOOT] MongoDB connected successfully.");

    console.log("[BOOT] Connecting to Redis...");
    await connectRedis();
    console.log("[BOOT] Redis connected successfully.");

    // Load routes only after databases are connected safely
    const authRoutes = require('./routes/authRoute');
    const userRoutes = require('./routes/userRoutes');
    const productRoutes = require('./routes/productRoute');
    const orderRoutes = require('./routes/orderRoute');
    const wishlistRoutes = require('./routes/wishlistRoute');
    const cartRoutes = require('./routes/cartRoute');
    const adminRoutes = require('./routes/adminRoute');
    const farmerRoutes = require('./routes/farmerRoute');
    const notificationRoutes = require('./routes/notificationRoute');

    app.use('/api/auth', authRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/products', productRoutes);
    app.use('/api/orders', orderRoutes);
    app.use('/api/wishlist', wishlistRoutes);
    app.use('/api/cart', cartRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/farmer', farmerRoutes);
    app.use('/api/notifications', notificationRoutes);

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });

  } catch (error) {
    console.error("❌ CRITICAL SERVER BOOT ERROR:");
    console.error(error); // This will print the exact stack trace and error message
    process.exit(1);      // Gracefully terminate the process instead of letting Node throw a generic uncaught error
  }
};

startServer();
