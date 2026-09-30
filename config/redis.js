const { createClient } = require('redis');

// 1. Determine the URL first
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// 2. ONLY apply the TLS configuration if the URL starts with "rediss://"
const isSecure = redisUrl.startsWith('rediss://');

const redisClient = createClient({
  url: redisUrl,
  socket: {
    // Dynamically applies the TLS object only when connecting securely to Upstash
    ...(isSecure && { tls: {} }), 
    reconnectStrategy: (retries) => {
      if (retries >= 5) {
        return false;
      }
      return Math.min(retries * 250, 2000);
    }
  }
});

redisClient.on('error', (error) => {
  console.error('Redis client error:', error.message);
});

const connectRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
};

module.exports = {
  redisClient,
  connectRedis
};
