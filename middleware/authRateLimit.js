const { rateLimit } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { redisClient } = require('../config/redis');

const createAuthRateLimit = ({ windowMs, limit, message, prefix }) => rateLimit({
  windowMs,
  limit,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: new RedisStore({
    prefix: `auth:${prefix}:`,
    sendCommand: (...args) => redisClient.sendCommand(args)
  }),
  message: { message },
  handler: (req, res, next, options) => {
    res.set('Retry-After', Math.ceil(options.windowMs / 1000).toString());
    res.status(options.statusCode).json(options.message);
  }
});

const loginRateLimit = createAuthRateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  prefix: 'login',
  message: 'Too many login attempts. Please try again in 15 minutes.'
});

const registrationRateLimit = createAuthRateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  prefix: 'registration',
  message: 'Too many registration attempts. Please try again in 1 hour.'
});

const recoveryRateLimit = createAuthRateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  prefix: 'recovery',
  message: 'Too many password recovery attempts. Please try again in 15 minutes.'
});

const verificationRateLimit = createAuthRateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  prefix: 'verification',
  message: 'Too many verification attempts. Please try again in 15 minutes.'
});

module.exports = {
  loginRateLimit,
  registrationRateLimit,
  recoveryRateLimit,
  verificationRateLimit
};
