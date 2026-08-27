const express = require('express');
const protect = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { updateProfile } = require('../controllers/userController');

const router = express.Router();

router.get('/profile', protect, (req, res) => {
  res.json({
    message: 'You are authenticated!',
    user: req.user
  });
});

router.put(
  '/profile',
  protect,
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'ninDocument', maxCount: 1 }
  ]),
  updateProfile
);

router.get('/farmer-test', protect, authorize('farmer'), (req, res) => {
  res.json({
    message: 'Welcome Farmer! You have access to this route.',
    user: req.user
  });
});

module.exports = router;