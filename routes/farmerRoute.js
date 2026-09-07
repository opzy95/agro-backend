const express = require('express');

const protect = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const {
	getMyWallet,
	requestWithdrawal
} = require('../controllers/userController');

const router = express.Router();

router.get('/wallet', protect, authorize('farmer'), getMyWallet);
router.post('/withdrawals', protect, authorize('farmer'), requestWithdrawal);

module.exports = router;
