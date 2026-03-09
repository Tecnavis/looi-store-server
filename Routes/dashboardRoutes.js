const express = require("express");
const router = express.Router();

const Order = require("../models/orderModel");
const Product = require("../models/productModel");
const User = require("../models/userModel");

router.get("/analytics", async (req, res) => {
  try {

    const totalOrders = await Order.countDocuments();

    const totalUsers = await User.countDocuments();

    const totalProducts = await Product.countDocuments();

    const revenueData = await Order.aggregate([
      { $match: { paymentStatus: "Paid" } },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$totalAmount" }
        }
      }
    ]);

    const totalRevenue = revenueData[0]?.revenue || 0;

    const monthlySales = await Order.aggregate([
      {
        $group: {
          _id: { $month: "$orderDate" },
          total: { $sum: "$totalAmount" }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    res.json({
      totalOrders,
      totalUsers,
      totalProducts,
      totalRevenue,
      monthlySales
    });

  } catch (error) {

    res.status(500).json({
      message: "Dashboard analytics failed"
    });

  }
});

module.exports = router;