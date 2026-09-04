const express = require('express');

const protect = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const { getMyWallet } = require('../controllers/userController');

const router = express.Router();

router.get('/wallet', protect, authorize('farmer'), getMyWallet);

module.exports = router;
