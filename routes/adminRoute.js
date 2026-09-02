const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

const { getAllUsers, getUserById, deleteUser, getAllProducts, getProductById, deleteProductAsAdmin, verifyFarmer, unverifyFarmer, rejectFarmerVerification } = require("../controllers/adminController");

router.get("/users", protect, adminOnly, getAllUsers);
router.get("/users/:id", protect, adminOnly, getUserById);
router.delete('/users/:id', protect, adminOnly, deleteUser);
router.get('/products', protect, adminOnly, getAllProducts);
router.get('/products/:id', protect, adminOnly, getProductById);
router.delete('/products/:id', protect, adminOnly, deleteProductAsAdmin);
router.put('/farmers/:id/verify', protect, adminOnly, verifyFarmer);
router.put('/farmers/:id/unverify', protect, adminOnly, unverifyFarmer);
router.put('/farmers/:id/reject', protect, adminOnly, rejectFarmerVerification);

module.exports = router;
