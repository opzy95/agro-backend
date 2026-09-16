const jwt = require('jsonwebtoken');
const User = require('../models/user');

const protect = async (req, res, next) => {
  try {
    let token;

    // Check Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        message: 'Not authorized. No token provided.'
      });
    }

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // Find user
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        message: 'User no longer exists'
      });
    }

    if (user.role !== 'admin' && !user.isEmailVerified) {
      return res.status(403).json({
        message: 'Please verify your email before accessing this resource'
      });
    }

    // Attach user to request
    req.user = user;

    next();

  } catch (error) {
    console.error(error);

    return res.status(401).json({
      message: 'Not authorized. Invalid or expired token.'
    });
  }
};

module.exports = protect;