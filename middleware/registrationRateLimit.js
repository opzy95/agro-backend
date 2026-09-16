const MAX_FAILED_ATTEMPTS = 5;
const WINDOW_MS = 60 * 60 * 1000;

const failedAttempts = new Map();

const getClientKey = (req) => req.ip || req.socket.remoteAddress || 'unknown';

const cleanupExpiredAttempts = (now) => {
  for (const [key, attempt] of failedAttempts) {
    if (attempt.windowStartedAt + WINDOW_MS <= now) {
      failedAttempts.delete(key);
    }
  }
};

const registrationRateLimit = (req, res, next) => {
  const now = Date.now();
  cleanupExpiredAttempts(now);

  const attempt = failedAttempts.get(getClientKey(req));

  if (attempt && attempt.count >= MAX_FAILED_ATTEMPTS) {
    const retryAfterSeconds = Math.ceil((attempt.windowStartedAt + WINDOW_MS - now) / 1000);
    res.set('Retry-After', retryAfterSeconds.toString());

    return res.status(429).json({
      message: 'Too many failed registration attempts. Try again in 1 hour.'
    });
  }

  next();
};

const recordFailedRegistration = (req) => {
  const now = Date.now();
  const key = getClientKey(req);
  const attempt = failedAttempts.get(key);

  if (!attempt || attempt.windowStartedAt + WINDOW_MS <= now) {
    failedAttempts.set(key, { count: 1, windowStartedAt: now });
    return;
  }

  attempt.count += 1;
};

module.exports = {
  registrationRateLimit,
  recordFailedRegistration
};