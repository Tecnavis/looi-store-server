const User = require('../models/userModel');
const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const asyncHandler = require('express-async-handler');
const { updateStock } = require('../services/stockService');
const OrderCount = require('../models/orderCountModel');

const generateOrderId = () => {
    return `ORD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`; // Generates an ID like "ORD-ABCD12345"
};
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
            razorpayPaymentId
        } = req.body;

        // Validate required fields
        if (!user || !orderItems || !shippingAddress || !paymentMethod || !totalAmount) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields' 
            });
        }

        // Create new order
        const order = await Order.create({
            orderId: generateOrderId(),
            user,
            orderItems,
            shippingAddress,
            paymentMethod,
            paymentStatus,
            totalAmount,
            razorpayOrderId,
            razorpayPaymentId,
            orderStatus: 'Pending',
            orderDate: new Date()
        });

        
     // Update user's orders array
     await User.findByIdAndUpdate(
        user,
        { $push: { orders: order._id } },
        { new: true }
    );
        res.status(200).json({
            success: true,
            message: 'Order created successfully',
            order
        });

    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create order',
            error: error.message
        });
    }
};

// Order Success Handler
exports.orderSuccessHandler = asyncHandler(async (req, res) => {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Update order status to success and update stock
    order.orderStatus = 'Success';
    await order.save();

    // Update stock
    await updateStock(order);

    res.status(200).json({
        success: true,
        message: 'Order processed successfully, and stock updated',
    });
});


exports.getAllOrders = async (req, res) => {
    try {
        // Find all orders and populate user and orderItems details
        const orders = await Order.find()
            .populate({
                path: 'user',
                model: 'user', // Ensure the model name matches the one defined in your User model
                select: 'name email' // Select only the name and email fields from User
            })
            .populate({
                path: 'orderItems.product_id', // Update this to match your schema
                model: 'Product', // Ensure the model name matches the one defined in your Product model
                select: 'name price coverImage' // Select only the fields you need
            })
            .sort({ orderDate: -1 }); // Sort by newest first

        res.status(200).json({
            success: true,
            count: orders.length,
            message: 'Orders retrieved successfully',
            orders
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders',
            error: error.message
        });
    }
};

// get by id
exports.getOrderById = async (req, res) => {
    try {
        const { orderId } = req.params; // Get the order ID from the request parameters

        // Find the order by ID and populate user and orderItems details
        const order = await Order.findById(orderId)
            .populate({
                path: 'user',
                model: 'user',
                select: 'name email' // Select fields to return from User
            })
            .populate({
                path: 'orderItems.product_id', // Update this to match your schema
                model: 'Product',
                select: 'name price coverImage' // Select fields to return from Product
            });

        // Check if the order exists
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Order retrieved successfully',
            order
        });
    } catch (error) {
        console.error('Error fetching order by ID:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order',
            error: error.message
        });
    }
};

// get ordercount
exports.getTotalOrderCount = async (req, res) => {
    try {
        const orderCountDoc = await OrderCount.findOne();
        const totalOrderCount = orderCountDoc ? orderCountDoc.count : 0;
        res.status(200).json({ totalOrderCount });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


