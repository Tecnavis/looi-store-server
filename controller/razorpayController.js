const Razorpay = require("razorpay");
require("dotenv").config();
const crypto = require("crypto");

// ✅ Create Razorpay Order
exports.order = async (req, res) => {
  try {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET_KEY,
    });

    const options = { ...req.body };

    // ✅ Ensure amount is in paise (Razorpay needs smallest unit)
    if (options.amount && typeof options.amount === "number") {
      // if amount looks like rupees, convert to paise
      if (options.amount < 1000) {
        options.amount = Math.round(options.amount * 100);
      }
    }

    // ✅ Defaults
    if (!options.currency) options.currency = "INR";
    if (!options.receipt) options.receipt = `rcpt_${Date.now()}`;

    const order = await razorpay.orders.create(options);

    if (!order) {
      return res.status(500).send("Error");
    }

    return res.json(order);
  } catch (error) {
    console.error("Razorpay order create error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create Razorpay order",
      error: error.message,
    });
  }
};

// ✅ Verify Razorpay Payment Signature
exports.verify = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        msg: "Missing Razorpay verification fields",
      });
    }

    const sha = crypto.createHmac(
      "sha256",
      process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET_KEY
    );

    sha.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = sha.digest("hex");

    if (digest !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        msg: "Transaction is not legit",
      });
    }

    return res.json({
      success: true,
      order: { orderId: razorpay_order_id, paymentId: razorpay_payment_id },
    });
  } catch (error) {
    console.error("Razorpay verify error:", error);
    return res.status(500).json({
      success: false,
      msg: "Payment verification failed",
      error: error.message,
    });
  }
};
