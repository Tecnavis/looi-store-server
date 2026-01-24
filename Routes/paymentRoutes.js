const express = require("express");
const router = express.Router();
const {
  createRazorpayOrder,
  verifyRazorpayPayment,
} = require("../controllers/paymentController");

router.post("/create-order", createRazorpayOrder);
router.post("/verify", verifyRazorpayPayment);

module.exports = router;
