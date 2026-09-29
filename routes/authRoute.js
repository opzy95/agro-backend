const express = require('express');

const {
  registerUser,
  loginUser,
  requestPasswordReset,
  resendVerificationCode,
  resetPassword,
  verifyEmail
} = require('../controllers/authController');
const {
  loginRateLimit,
  registrationRateLimit,
  recoveryRateLimit,
  verificationRateLimit
} = require('../middleware/authRateLimit');

const router = express.Router();

router.post('/register', registrationRateLimit, registerUser);
router.post('/login', loginRateLimit, loginUser);
router.post('/forgot-password', recoveryRateLimit, requestPasswordReset);
router.post('/resend-verification', verificationRateLimit, resendVerificationCode);
router.post('/reset-password', recoveryRateLimit, resetPassword);
router.post('/verify-email', verificationRateLimit, verifyEmail);

module.exports = router;