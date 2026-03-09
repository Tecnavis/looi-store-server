const express = require("express");
const router = express.Router();

const Order = require("../models/order");
const generateInvoice = require("../utils/invoice");

// Create order
router.post("/", async (req, res) => {
  try {

    const order = new Order(req.body);

    await order.save();

    generateInvoice(order);

    res.json({
      success: true,
      order
    });

  } catch (err) {

    res.status(500).json({
      error: err.message
    });

  }
});


// Get all orders
router.get("/", async (req, res) => {
  try {

    const orders = await Order.find().sort({ createdAt: -1 });

    res.json(orders);

  } catch (err) {

    res.status(500).json({
      error: err.message
    });

  }
});


// Update entire order
router.put("/:id", async (req, res) => {
  try {

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json({
      success: true,
      order
    });

  } catch (err) {

    res.status(500).json({
      error: err.message
    });

  }
});


// Update order status only
router.put("/status/:id", async (req, res) => {
  try {

    const { status } = req.body;

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { orderStatus: status },
      { new: true }
    );

    res.json({
      success: true,
      order
    });

  } catch (error) {

    res.status(500).json({
      message: "Failed to update order status"
    });

  }
});

module.exports = router;