const express = require("express");
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const upload = require("../middleware/uploadMiddleware");
const {
  updateProfile,
  resubmitDocument,
  getVerificationStatus,
} = require("../controllers/userController");

const router = express.Router();

router.get("/profile", protect, (req, res) => {
  res.json({
    message: "You are authenticated!",
    user: req.user,
  });
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

router.put(
  "/resubmit-document",
  protect,
  authorize("farmer"),
  upload.single("ninDocument"),
  resubmitDocument,
);

router.get("/farmer-test", protect, authorize("farmer"), (req, res) => {
  res.json({
    message: "Welcome Farmer! You have access to this route.",
    user: req.user,
  });
});

module.exports = router;
