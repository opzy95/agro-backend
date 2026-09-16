const express = require('express');

const {
  registerUser,
  loginUser,
  requestPasswordReset,
  resetPassword,
  verifyEmail
} = require('../controllers/authController');
const { registrationRateLimit } = require('../middleware/registrationRateLimit');

const router = express.Router();

router.post('/register', registrationRateLimit, registerUser);
router.post('/login', loginUser);
router.post('/forgot-password', requestPasswordReset);
router.post('/reset-password', resetPassword);
router.post('/verify-email', verifyEmail);

module.exports = router;