const { createClient } = require('redis');

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  socket: {
    tls: {},
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
