const express = require("express");
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const upload = require("../middleware/uploadMiddleware");
const User = require("../models/user");
const {
  updateProfile,
  resubmitDocument,
  getVerificationStatus,
  getMyWallet,
  requestWithdrawal,
  addMyBankAccount,
  getMyBankAccounts,
  deleteMyBankAccount,
} = require("../controllers/userController");

const router = express.Router();

router.get("/profile", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password +nin +ninDocument');

    res.json({
      message: "You are authenticated!",
      user,
    });
  } catch (error) {
    console.error('Get profile error:', error);

    res.status(500).json({
      message: 'Failed to get profile'
    });
  }
});

router.put(
  "/profile",
  protect,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "ninDocument", maxCount: 1 },
  ]),
  updateProfile,
);

router.get(
  "/verification-status",
  protect,
  authorize("farmer"),
  getVerificationStatus,
);

router.get("/wallet", protect, authorize("farmer"), getMyWallet);

router.put(
  "/resubmit-document",
  protect,
  authorize("farmer"),
  upload.single("ninDocument"),
  resubmitDocument,
);

router.post("/withdrawals", protect, authorize("farmer"), requestWithdrawal);

router.get("/farmer-test", protect, authorize("farmer"), (req, res) => {
  res.json({
    message: "Welcome Farmer! You have access to this route.",
    user: req.user,
  });
});

router.post(
  '/bank-accounts',
  protect,
  authorize('farmer'),
  addMyBankAccount
);

router.get(
  '/bank-accounts',
  protect,
  authorize('farmer'),
  getMyBankAccounts
);

router.delete(
  '/bank-accounts/:accountId',
  protect,
  authorize('farmer'),
  deleteMyBankAccount
);

module.exports = router;
