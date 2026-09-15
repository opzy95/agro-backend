const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/user');

const createServiceError = (statusCode, message) => ({ statusCode, message });

// Register a new user
const registerUser = async (userData) => {
  const {
    firstName,
    lastName,
    email,
    password,
    confirmPassword,
    role,
    phone,
    address
  } = userData;

  // Validate required fields
  if (!firstName || !lastName || !email || !password || !confirmPassword) {
    throw {
      statusCode: 400,
      message: 'firstName, lastName, email, password, and confirmPassword are required'
    };
  }

  // Validate password match
  if (password !== confirmPassword) {
    throw {
      statusCode: 400,
      message: 'Passwords do not match'
    };
  }

  // Validate password length
  if (password.length < 6) {
    throw {
      statusCode: 400,
      message: 'Password must be at least 6 characters'
    };
  }

  // Check JWT_SECRET
  if (!process.env.JWT_SECRET) {
    throw {
      statusCode: 500,
      message: 'JWT_SECRET is not configured on the server'
    };
  }

  // Check if email already exists
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw {
      statusCode: 400,
      message: 'Email is already registered'
    };
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  const user = await User.create({
    firstName,
    lastName,
    email,
    password: hashedPassword,
    role: role || 'customer',
    phone,
    address
  });

  // Create JWT
  const token = jwt.sign(
    {
      id: user._id,
      role: user.role
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '7d'
    }
  );

  return {
    token,
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage
    }
  };
};

// Login user
const loginUser = async (credentials) => {
  const { email, password } = credentials;

  // Validate input
  if (!email || !password) {
    throw {
      statusCode: 400,
      message: 'Email and password are required'
    };
  }

  // Find user
  const user = await User.findOne({ email });

  if (!user) {
    throw {
      statusCode: 401,
      message: 'Invalid email or password'
    };
  }

  // Check password
  const passwordCorrect = await bcrypt.compare(password, user.password);

  if (!passwordCorrect) {
    throw {
      statusCode: 401,
      message: 'Invalid email or password'
    };
  }

  // Create JWT
  const token = jwt.sign(
    {
      id: user._id,
      role: user.role
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '7d'
    }
  );

  return {
    token,
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage
    }
  };
};

const requestPasswordReset = async (email) => {
  if (!email) {
    throw createServiceError(400, 'Email is required');
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });

  if (!user) {
    return null;
  }

  const resetCode = crypto.randomInt(100000, 1000000).toString();
  const resetCodeHash = crypto.createHash('sha256').update(resetCode).digest('hex');

  user.passwordResetCodeHash = resetCodeHash;
  user.passwordResetCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();

  return {
    user: {
      firstName: user.firstName,
      email: user.email
    },
    resetCode
  };
};

const resetPassword = async ({ email, code, password, confirmPassword }) => {
  if (!email || !code || !password || !confirmPassword) {
    throw createServiceError(400, 'Email, code, password, and confirmPassword are required');
  }

  if (password !== confirmPassword) {
    throw createServiceError(400, 'Passwords do not match');
  }

  if (password.length < 6) {
    throw createServiceError(400, 'Password must be at least 6 characters');
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() })
    .select('+passwordResetCodeHash +passwordResetCodeExpires');

  const submittedCodeHash = crypto.createHash('sha256').update(code.toString()).digest('hex');
  const codeIsValid = user
    && user.passwordResetCodeHash === submittedCodeHash
    && user.passwordResetCodeExpires
    && user.passwordResetCodeExpires > new Date();

  if (!codeIsValid) {
    throw createServiceError(400, 'Invalid or expired reset code');
  }

  user.password = await bcrypt.hash(password, 10);
  user.passwordResetCodeHash = null;
  user.passwordResetCodeExpires = null;
  await user.save();
};

module.exports = {
  registerUser,
  loginUser,
  requestPasswordReset,
  resetPassword
};
