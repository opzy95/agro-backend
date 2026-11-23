const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/user');
const RefreshToken = require('../models/refreshToken');

const createServiceError = (statusCode, message) => ({ statusCode, message });
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const hashRefreshToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const createTokenPair = async (user, familyId = crypto.randomBytes(16).toString('hex')) => {
  const token = jwt.sign(
    {
      id: user._id,
      role: user.role,
      tokenVersion: user.tokenVersion
    },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
  const refreshToken = crypto.randomBytes(64).toString('hex');

  await RefreshToken.create({
    user: user._id,
    tokenHash: hashRefreshToken(refreshToken),
    familyId,
    tokenVersion: user.tokenVersion,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS)
  });

  return { token, refreshToken };
};

// Register a new user
const registerUser = async (userData) => {
  const {
    firstName,
    lastName,
    email,
    password,
    confirmPassword,
    role = 'customer',
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

  if (!['customer', 'farmer'].includes(role)) {
    throw {
      statusCode: 400,
      message: 'Role must be customer or farmer'
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
  if (!process.env.JWT_SECRET?.trim()) {
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
  const verificationCode = crypto.randomInt(100000, 1000000).toString();

  // Create user
  const user = await User.create({
    firstName,
    lastName,
    email,
    password: hashedPassword,
    role,
    phone,
    address,
    emailVerificationCodeHash: crypto.createHash('sha256').update(verificationCode).digest('hex'),
    emailVerificationCodeExpires: new Date(Date.now() + 10 * 60 * 1000)
  });

  const tokens = await createTokenPair(user);

  return {
    ...tokens,
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage
    },
    verificationCode
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

  if (!process.env.JWT_SECRET?.trim()) {
    throw createServiceError(500, 'JWT_SECRET is not configured on the server');
  }

  // Find user
  const user = await User.findOne({ email }).select('+password');

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

  if (user.role !== 'admin' && !user.isEmailVerified) {
    throw createServiceError(403, 'Please verify your email before logging in');
  }

  const tokens = await createTokenPair(user);

  return {
    ...tokens,
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

const refreshSession = async (refreshToken) => {
  if (!refreshToken || typeof refreshToken !== 'string') {
    throw createServiceError(400, 'Refresh token is required');
  }

  if (!/^[a-f0-9]{128}$/i.test(refreshToken)) {
    throw createServiceError(401, 'Invalid or expired refresh token');
  }

  if (!process.env.JWT_SECRET?.trim()) {
    throw createServiceError(500, 'JWT_SECRET is not configured on the server');
  }

  const storedToken = await RefreshToken.findOneAndUpdate({
    tokenHash: hashRefreshToken(refreshToken),
    expiresAt: { $gt: new Date() },
    usedAt: null
  }, {
    $set: { usedAt: new Date() }
  }, {
    new: true
  });

  if (!storedToken) {
    const reusedToken = await RefreshToken.findOne({
      tokenHash: hashRefreshToken(refreshToken),
      usedAt: { $ne: null }
    });

    if (reusedToken) {
      await RefreshToken.deleteMany({ familyId: reusedToken.familyId });
    }

    throw createServiceError(401, 'Invalid or expired refresh token');
  }

  const user = await User.findById(storedToken.user);
  if (!user || storedToken.tokenVersion !== user.tokenVersion) {
    await RefreshToken.deleteMany({ familyId: storedToken.familyId });
    throw createServiceError(401, 'Invalid or expired refresh token');
  }

  return createTokenPair(user, storedToken.familyId);
};

const logoutUser = async (refreshToken) => {
  if (typeof refreshToken === 'string' && refreshToken.length > 0) {
    const storedToken = await RefreshToken.findOne({
      tokenHash: hashRefreshToken(refreshToken)
    });

    if (storedToken) {
      await RefreshToken.deleteMany({ familyId: storedToken.familyId });
    }
  }
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

const resendVerificationCode = async (email) => {
  if (!email) {
    throw createServiceError(400, 'Email is required');
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });

  if (!user) {
    throw createServiceError(404, 'Email not found or user is not registered');
  }

  if (user.role === 'admin' || user.isEmailVerified) {
    throw createServiceError(400, 'This email is already verified');
  }

  const verificationCode = crypto.randomInt(100000, 1000000).toString();

  user.emailVerificationCodeHash = crypto
    .createHash('sha256')
    .update(verificationCode)
    .digest('hex');
  user.emailVerificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();

  return {
    user: {
      firstName: user.firstName,
      email: user.email
    },
    verificationCode
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
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  user.passwordResetCodeHash = null;
  user.passwordResetCodeExpires = null;
  await RefreshToken.deleteMany({ user: user._id });
  await user.save();
};

const verifyEmail = async ({ email, code }) => {
  if (!email || !code) {
    throw createServiceError(400, 'Email and verification code are required');
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() })
    .select('+emailVerificationCodeHash +emailVerificationCodeExpires');

  if (!user) {
    throw createServiceError(404, 'Email not found or user is not registered');
  }

  if (user.role === 'admin') {
    return {
      firstName: user.firstName,
      email: user.email
    };
  }

  const submittedCodeHash = crypto.createHash('sha256').update(code.toString()).digest('hex');
  const codeIsValid = user.emailVerificationCodeHash === submittedCodeHash
    && user.emailVerificationCodeExpires
    && user.emailVerificationCodeExpires > new Date();

  if (!codeIsValid) {
    throw createServiceError(400, 'Invalid or expired email verification code');
  }

  user.isEmailVerified = true;
  user.emailVerificationCodeHash = null;
  user.emailVerificationCodeExpires = null;
  await user.save();

  return {
    firstName: user.firstName,
    email: user.email
  };
};

module.exports = {
  registerUser,
  loginUser,
  refreshSession,
  logoutUser,
  requestPasswordReset,
  resendVerificationCode,
  resetPassword,
  verifyEmail
};
