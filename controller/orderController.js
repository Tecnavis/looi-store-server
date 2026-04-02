const User = require('../models/userModel');
const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const asyncHandler = require('express-async-handler');
const OrderCount = require('../models/orderCountModel');
const sendEmail = require('../utils/emailService');
const { postOrderToShiprocket, cancelOrderInShiprocket } = require('../utils/shiprocketService');

const generateOrderId = () =>
  `ORD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

// ================= CREATE ORDER =================
exports.createOrder = async (req, res) => {
  console.log("=== CREATE ORDER START ===");

  try {
    const {
      user,
      orderItems,
      shippingAddress,
      paymentMethod,
      paymentStatus,
      totalAmount,
      razorpayOrderId,
      razorpayPaymentId,
      email,
      skipShipping
    } = req.body;

    // 🔥 VALIDATION
    if (!user || !orderItems || !shippingAddress || !paymentMethod || !totalAmount) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    if (!Array.isArray(orderItems) || orderItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "orderItems must be a non-empty array"
      });
    }

    // ================= ENRICH ITEMS =================
    const enrichedOrderItems = [];

    for (let item of orderItems) {
      if (!item.productName || !item.quantity || !item.price) {
        return res.status(400).json({
          success: false,
          message: "Invalid order item"
        });
      }

      let product = null;

      if (item.productId) {
        product = await Product.findById(item.productId).catch(() => null);
      }

      if (!product && item.productName) {
        product = await Product.findOne({
          name: new RegExp(`^${item.productName}$`, "i")
        }).catch(() => null);
      }

      enrichedOrderItems.push({
        productId: product?._id || item.productId || null,
        productName: item.productName,
        quantity: Number(item.quantity),
        price: Number(item.price),

        color: item.color || "",
        size: item.size || "",

        // 🔥 FIXED DEFAULTS
        sku: item.sku || product?.sku || `SKU-${Date.now()}`,
        hsn: item.hsn || product?.hsn || "0000",

        length: Number(item.length || product?.length || 10),
        width: Number(item.width || product?.width || 10),
        height: Number(item.height || product?.height || 10),
        weight: Number(item.weight || product?.weight || 0.5),

        coverImage: product?.coverImage || ""
      });
    }

    // ================= ORDER DATA =================
    const orderData = {
      orderId: generateOrderId(),
      user,
      orderItems: enrichedOrderItems,
      shippingAddress,
      paymentMethod,
      paymentStatus: paymentStatus || "Pending",
      totalAmount: Number(totalAmount),
      razorpayOrderId,
      razorpayPaymentId,
      email: email || "",
      orderStatus: "Pending",
      orderDate: new Date()
    };

    console.log("📦 Saving order:", orderData.orderId);

    // ================= SAVE ORDER =================
    const order = await Order.create(orderData);

    // ================= STOCK UPDATE =================
    for (let item of enrichedOrderItems) {
      try {
        if (!item.productId || !item.size || !item.color) continue;

        const product = await Product.findById(item.productId);
        if (!product) continue;

        const sizeObj = product.sizes?.find(s => s.size === item.size);
        const colorObj = sizeObj?.colors?.find(c => c.color === item.color);

        if (colorObj) {
          colorObj.stock = Math.max(0, colorObj.stock - item.quantity);
          await product.save();
        }
      } catch (err) {
        console.log("Stock error:", err.message);
      }
    }

    // ================= LINK USER =================
    try {
      await User.findByIdAndUpdate(user, {
        $push: { orders: order._id }
      });
    } catch (err) {
      console.log("User link error:", err.message);
    }

    // ================= EMAIL =================
    if (email && email.includes("@")) {
      try {
        const html = enrichedOrderItems.map(
          item =>
            `<li>${item.productName} × ${item.quantity} — ₹${item.price * item.quantity}</li>`
        ).join("");

        await sendEmail(
          email,
          "Order Confirmation",
          `Order #${order.orderId} placed`,
          `<p>Order ID: ${order.orderId}</p><ul>${html}</ul><p>Total: ₹${order.totalAmount}</p>`
        );
      } catch (err) {
        console.log("Email error:", err.message);
      }
    }

    // ================= SHIPROCKET =================
    if (!skipShipping) {
      setImmediate(async () => {
        try {
          console.log("🚀 Sending to Shiprocket...");

          const sr = await postOrderToShiprocket({
            ...orderData,
            _id: order._id
          });

          if (sr?.order_id) {
            await Order.findByIdAndUpdate(order._id, {
              shiprocket_order_id: sr.order_id
            });
          }
        } catch (err) {
          console.log("Shiprocket error:", err.message);
        }
      });
    }

    // ================= RESPONSE =================
    return res.status(200).json({
      success: true,
      message: "Order created successfully",
      order
    });

  } catch (error) {
    console.error("❌ ORDER ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: "Order creation failed",
      error: error.message
    });
  }
};

// ================= OTHER CONTROLLERS =================

exports.orderSuccessHandler = asyncHandler(async (req, res) => {
  const { orderId } = req.body;

  const order = await Order.findById(orderId);
  if (!order) return res.status(404).json({ message: "Order not found" });

  order.orderStatus = "Processing";
  await order.save();

  res.status(200).json({ success: true });
});

exports.getAllOrders = async (req, res) => {
  const orders = await Order.find().sort({ orderDate: -1 });
  res.status(200).json({ success: true, orders });
};

exports.getOrderById = async (req, res) => {
  const order = await Order.findById(req.params.orderId);
  if (!order) return res.status(404).json({ success: false });

  res.status(200).json({ success: true, order });
};

exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);

    if (!order) return res.status(404).json({ success: false });

    try {
      await cancelOrderInShiprocket({
        orderId: order.orderId,
        shiprocket_order_id: order.shiprocket_order_id
      });
    } catch (err) {
      console.log("Shiprocket cancel failed");
    }

    order.orderStatus = "Cancelled";
    await order.save();

    res.status(200).json({ success: true });

  } catch (error) {
    res.status(500).json({ success: false });
  }
};