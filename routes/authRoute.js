const express = require('express');

const {
  registerUser,
  loginUser,
  refreshSession,
  logoutUser,
  requestPasswordReset,
  resendVerificationCode,
  resetPassword,
  verifyEmail
} = require('../controllers/authController');
const {
  loginRateLimit,
  refreshRateLimit,
  registrationRateLimit,
  recoveryRateLimit,
  verificationRateLimit
} = require('../middleware/authRateLimit');

const router = express.Router();

router.post('/register', registrationRateLimit, registerUser);
router.post('/login', loginRateLimit, loginUser);
router.post('/refresh', refreshRateLimit, refreshSession);
router.post('/logout', logoutUser);
router.post('/forgot-password', recoveryRateLimit, requestPasswordReset);
router.post('/resend-verification', verificationRateLimit, resendVerificationCode);
router.post('/reset-password', recoveryRateLimit, resetPassword);
router.post('/verify-email', verificationRateLimit, verifyEmail);

module.exports = router;