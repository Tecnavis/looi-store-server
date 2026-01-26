const User = require("../models/userModel");
const Order = require("../models/orderModel");
const Product = require("../models/productModel");
const asyncHandler = require("express-async-handler");
const { updateStock } = require("../services/stockService");
const OrderCount = require("../models/orderCountModel");
const sendEmail = require("../utils/emailService");

// ✅ Generate OrderId
const generateOrderId = () => {
  return `ORD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
};

// ✅ CREATE ORDER (Shiprocket Removed) - FINAL FIXED
exports.createOrder = async (req, res) => {
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
    } = req.body;

    // ✅ Validate required fields
    if (!user || !orderItems || !shippingAddress || !paymentMethod || !totalAmount) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    if (!Array.isArray(orderItems) || orderItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Order items cannot be empty",
      });
    }

    // ✅ Validate and enrich order items with product details
    const enrichedOrderItems = [];

    for (let item of orderItems) {
      if (!item.productName || !item.quantity || !item.price || !item.color || !item.size) {
        return res.status(400).json({
          success: false,
          message: `Missing required fields for item: ${JSON.stringify(item)}`,
        });
      }

      // ✅ Find product (CASE INSENSITIVE FIX)
      const product = await Product.findOne({
        name: { $regex: new RegExp("^" + item.productName + "$", "i") },
      });

      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product not found: ${item.productName}`,
        });
      }

      // ✅ Validate size
      const sizeObj = product.sizes?.find((s) => s.size === item.size);
      if (!sizeObj) {
        return res.status(400).json({
          success: false,
          message: `Size ${item.size} not found for product ${product.name}`,
        });
      }

      // ✅ Validate color
      const colorObj = sizeObj.colors?.find((c) => c.color === item.color);
      if (!colorObj) {
        return res.status(400).json({
          success: false,
          message: `Color ${item.color} not found for size ${item.size} in product ${product.name}`,
        });
      }

      // ✅ Check stock
      if (Number(colorObj.stock) < Number(item.quantity)) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name} (Size: ${item.size}, Color: ${item.color})`,
        });
      }

      // ✅ Enrich order item with product details
      enrichedOrderItems.push({
        productName: product.name,
        quantity: item.quantity,
        price: item.price,
        color: item.color,
        size: item.size,
        productId: product._id,
        coverImage: product.coverImage,
        hsn: product.hsn,
        sku: product.sku,
        length: product.length,
        width: product.width,
        height: product.height,
        weight: product.weight,
      });
    }

    // ✅ Create order in DB
    const orderData = {
      orderId: generateOrderId(),
      user,
      orderItems: enrichedOrderItems,
      shippingAddress,
      paymentMethod,
      paymentStatus: paymentStatus || (paymentMethod === "COD" ? "PENDING" : "PAID"),
      totalAmount,
      razorpayOrderId: razorpayOrderId || null,
      razorpayPaymentId: razorpayPaymentId || null,
      email,
      orderStatus: "Pending",
      orderDate: new Date(),
    };

    const order = await Order.create(orderData);

    // ✅ Update stock
    for (let item of enrichedOrderItems) {
      const product = await Product.findById(item.productId);
      if (!product) continue;

      const size = product.sizes.find((s) => s.size === item.size);
      if (!size) continue;

      const color = size.colors.find((c) => c.color === item.color);
      if (!color) continue;

      color.stock = Number(color.stock) - Number(item.quantity);
      await product.save();
    }

    // ✅ Send confirmation email
    const orderItemsHtml = enrichedOrderItems
      .map(
        (item) => `
        <li>
          <strong>${item.productName}</strong> - ${item.quantity} x ₹${item.price} = ₹${
          item.quantity * item.price
        }
          <br>Size: ${item.size}, Color: ${item.color}
        </li>
      `
      )
      .join("");

    if (order.email) {
      await sendEmail(
        order.email,
        "Order Confirmation",
        `Your order #${order.orderId} has been placed successfully.`,
        `
          <p>Thank you for your order! Your order ID is <strong>${order.orderId}</strong>.</p>
          <p><strong>Order Details:</strong></p>
          <ul>${orderItemsHtml}</ul>
          <p><strong>Total Amount:</strong> ₹${order.totalAmount}</p>
          <p>We will notify you when your order is shipped.</p>
        `
      );
    }

    // ✅ Update user orders list
    await User.findByIdAndUpdate(user, { $push: { orders: order._id } }, { new: true });

    return res.status(200).json({
      success: true,
      message: "Order created successfully",
      order,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create order",
      error: error.message,
    });
  }
};

// ✅ ORDER SUCCESS HANDLER
exports.orderSuccessHandler = asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  const order = await Order.findById(orderId);
  if (!order) return res.status(404).json({ message: "Order not found" });

  order.orderStatus = "Success";
  await order.save();

  await updateStock(order);

  res.status(200).json({
    success: true,
    message: "Order processed successfully, and stock updated",
  });
});

// ✅ GET ALL ORDERS
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate({
        path: "user",
        model: "user",
        select: "name email",
      })
      .populate({
        path: "orderItems.productId",
        model: "Product",
        select: "name price coverImage",
      })
      .sort({ orderDate: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      message: "Orders retrieved successfully",
      orders,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
};

// ✅ GET ORDER BY ID
exports.getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate({
        path: "user",
        model: "user",
        select: "name email",
      })
      .populate({
        path: "orderItems.productId",
        model: "Product",
        select: "name price coverImage",
      });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Order retrieved successfully",
      order,
    });
  } catch (error) {
    console.error("Error fetching order by ID:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order",
      error: error.message,
    });
  }
};

// ✅ UPDATE ORDER
exports.updateOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    const updatedData = req.body;

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { $set: updatedData },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Order updated successfully",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update order",
      error: error.message,
    });
  }
};

// ✅ GET ORDERS BY USER
exports.getOrdersByUser = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - user not found",
      });
    }

    const orders = await Order.find({ user: userId })
      .populate({
        path: "orderItems.productId",
        model: "Product",
        select: "name price coverImage",
      })
      .populate({
        path: "user",
        model: "user",
        select: "name email",
      });

    if (!orders || orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No orders found for this user",
      });
    }

    res.status(200).json({
      success: true,
      message: "Orders retrieved successfully",
      orders,
    });
  } catch (error) {
    console.error("Error fetching orders by user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
};

// ✅ TOTAL ORDER COUNT
exports.getTotalOrderCount = async (req, res) => {
  try {
    const orderCountDoc = await OrderCount.findOne();
    const totalOrderCount = orderCountDoc ? orderCountDoc.count : 0;
    res.status(200).json({ totalOrderCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ ORDERS BY DAY
exports.getOrdersByDay = async (req, res) => {
  try {
    const ordersPerDay = await Order.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$orderDate" } },
          orderCount: { $sum: 1 },
          totalSales: { $sum: "$totalAmount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      count: ordersPerDay.length,
      message: "Orders per day retrieved successfully",
      ordersPerDay,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve orders per day", error });
  }
};

// ✅ CANCEL ORDER
exports.cancelOrder = async (req, res) => {
  const { orderId } = req.params;

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.orderStatus === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Order is already cancelled",
      });
    }

    if (order.orderStatus === "Shipped") {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel order that has been shipped",
      });
    }

    order.orderStatus = "Cancelled";
    order.cancellationDate = new Date();
    order.cancellationReason = req.body.reason || "Customer requested cancellation";
    await order.save();

    if (order.email) {
      await sendEmail(
        order.email,
        "Order Cancellation Confirmation",
        `Your order #${order.orderId} has been cancelled successfully.`,
        `
          <h2>Order Cancellation Confirmation</h2>
          <p>Your order #${order.orderId} has been cancelled successfully.</p>
          <h3>Cancellation Details:</h3>
          <ul>
            <li>Order Amount: ₹${order.totalAmount}</li>
            <li>Cancellation Date: ${new Date().toLocaleDateString()}</li>
          </ul>
        `
      );
    }

    return res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      order,
    });
  } catch (error) {
    console.error("Error in order cancellation:", {
      orderId,
      error: error.message,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to cancel order",
      error: error.message,
    });
  }
};

// ✅ MARK ORDER DELIVERED
exports.markOrderAsDelivered = async (req, res) => {
  const { orderId } = req.params;

  try {
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.orderStatus === "Delivered") {
      return res.status(400).json({
        success: false,
        message: "Order is already marked as delivered",
      });
    }

    order.orderStatus = "Delivered";
    order.deliveryDate = new Date();
    await order.save();

    const orderItemsHtml = order.orderItems
      .map(
        (item) => `
        <li>
          <strong>${item.productName}</strong> - ${item.quantity} x ₹${item.price} = ₹${
          item.quantity * item.price
        }
          <br>Size: ${item.size}, Color: ${item.color}
        </li>
      `
      )
      .join("");

    if (order.email) {
      await sendEmail(
        order.email,
        "Order Delivered Successfully",
        `Your order #${order.orderId} has been delivered successfully.`,
        `
          <p>Dear Customer,</p>
          <p>We are pleased to inform you that your order <strong>#${order.orderId}</strong> has been delivered successfully.</p>
          <p><strong>Order Details:</strong></p>
          <ul>${orderItemsHtml}</ul>
          <p><strong>Total Amount:</strong> ₹${order.totalAmount}</p>
          <p>Thank you for shopping with us! We hope you enjoy your purchase.</p>
          <p>If you have any questions, feel free to contact us.</p>
        `
      );
    }

    return res.status(200).json({
      success: true,
      message: "Order marked as delivered and email sent to the customer",
      order,
    });
  } catch (error) {
    console.error("Error marking order as delivered:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark order as delivered",
      error: error.message,
    });
  }
};

// ✅ DELETE ORDER
exports.deleteOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    await Order.findByIdAndDelete(orderId);

    res.status(200).json({
      success: true,
      message: "Order deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleting order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete order",
      error: error.message,
    });
  }
};

// ✅ PLACE ORDER (COD + Razorpay) - FINAL FIXED
exports.placeOrder = async (req, res) => {
  try {
    const {
      userId,
      user,
      items,
      orderItems,
      address,
      shippingAddress,
      totalAmount,
      paymentMethod,
      paymentStatus,
      transactionId,
      razorpayOrderId,
      razorpayPaymentId,
      email,
    } = req.body;

    const finalUser = userId || user || req.user?._id;
    const finalItems = items || orderItems;
    const finalAddress = address || shippingAddress;

    if (!finalUser) {
      return res.status(400).json({ success: false, message: "User is required" });
    }

    if (!finalItems || !Array.isArray(finalItems) || finalItems.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    if (!finalAddress) {
      return res.status(400).json({ success: false, message: "Address is required" });
    }

    // ✅ Normalize items to match createOrder() schema
    const normalizedItems = finalItems.map((item) => ({
      productName: item.productName || item.name,
      quantity: item.quantity,
      price: item.price,
      size: item.size,
      color: item.color,
    }));

    req.body = {
      user: finalUser,
      orderItems: normalizedItems,
      shippingAddress: finalAddress,
      paymentMethod: paymentMethod || "COD",
      paymentStatus: paymentStatus || (paymentMethod === "COD" ? "PENDING" : "PAID"),
      totalAmount,
      razorpayOrderId: razorpayOrderId || null,
      razorpayPaymentId: razorpayPaymentId || transactionId || null,
      email,
    };

    return exports.createOrder(req, res);
  } catch (err) {
    console.log("placeOrder error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to place order",
      error: err.message,
    });
  }
};
