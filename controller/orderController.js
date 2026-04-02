const User = require('../models/userModel');
const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const asyncHandler = require('express-async-handler');
const OrderCount = require('../models/orderCountModel');
const sendEmail = require('../utils/emailService');
const { postOrderToShiprocket, cancelOrderInShiprocket } = require('../utils/shiprocketService');

const generateOrderId = () => `ORD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

exports.createOrder = async (req, res) => {
    try {
        const {
            user, orderItems, shippingAddress,
            paymentMethod, totalAmount, email, skipShipping
        } = req.body;

        const orderData = {
            orderId: `ORD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            user,
            orderItems,
            shippingAddress,
            paymentMethod,
            totalAmount,
            email,
            orderStatus: 'Pending',
            orderDate: new Date()
        };

        const order = await Order.create(orderData);

        // 🔥 SHIPROCKET FIXED BLOCK
        if (!skipShipping) {
            try {
                console.log("🚀 Sending order to Shiprocket...");

                const sr = await postOrderToShiprocket({
                    ...orderData,
                    _id: order._id
                });

                console.log("✅ Shiprocket Response:", sr);

                await Order.findByIdAndUpdate(order._id, {
                    shipmentId: sr.shipment_id,
                    awbCode: sr.awb_code
                });

            } catch (e) {
                console.error("❌ Shiprocket ERROR:", e.message);
                console.error("❌ Response:", e.response?.data);
            }
        }

        res.status(200).json({
            success: true,
            order
        });

    } catch (error) {
        console.error("❌ Order Error:", error.message);
        res.status(500).json({ message: error.message });
    }
};

exports.orderSuccessHandler = asyncHandler(async (req, res) => {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    order.orderStatus = 'Processing';
    await order.save();
    res.status(200).json({ success: true, message: 'Order processed successfully' });
});

exports.getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate({ path: 'user', model: 'user', select: 'name email' })
            .populate({ path: 'orderItems.productId', model: 'Product', select: 'name price coverImage' })
            .sort({ orderDate: -1 });
        res.status(200).json({ success: true, count: orders.length, message: 'Orders retrieved successfully', orders });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch orders', error: error.message });
    }
};

exports.getOrderById = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId)
            .populate({ path: 'user', model: 'user', select: 'name email' })
            .populate({ path: 'orderItems.productId', model: 'Product', select: 'name price coverImage' });
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
        res.status(200).json({ success: true, message: 'Order retrieved successfully', order });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch order', error: error.message });
    }
};

exports.updateOrderById = async (req, res) => {
    try {
        const { orderId } = req.params;
        const updatedOrder = await Order.findByIdAndUpdate(orderId, { $set: req.body }, { new: true });
        if (!updatedOrder) return res.status(404).json({ success: false, message: 'Order not found' });
        res.status(200).json({ success: true, message: 'Order updated successfully', order: updatedOrder });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update order', error: error.message });
    }
};

exports.getOrdersByUser = async (req, res) => {
    try {
        const userId = req.user._id;
        const orders = await Order.find({ user: userId })
            .populate({ path: 'orderItems.productId', model: 'Product', select: 'name price coverImage' })
            .populate({ path: 'user', model: 'user', select: 'name email' });
        if (!orders || orders.length === 0) {
            return res.status(404).json({ success: false, message: 'No orders found for this user' });
        }
        res.status(200).json({ success: true, message: 'Orders retrieved successfully', orders });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch orders', error: error.message });
    }
};

exports.getTotalOrderCount = async (req, res) => {
    try {
        const doc = await OrderCount.findOne();
        res.status(200).json({ totalOrderCount: doc ? doc.count : 0 });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getOrdersByDay = async (req, res) => {
    try {
        const ordersPerDay = await Order.aggregate([
            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$orderDate" } }, orderCount: { $sum: 1 }, totalSales: { $sum: "$totalAmount" } } },
            { $sort: { _id: 1 } }
        ]);
        res.status(200).json({ count: ordersPerDay.length, message: "Orders per day retrieved", ordersPerDay });
    } catch (error) {
        res.status(500).json({ message: "Failed to retrieve orders per day", error });
    }
};

exports.cancelOrder = async (req, res) => {
    const { orderId } = req.params;
    try {
        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
        if (order.orderStatus === 'Cancelled') return res.status(400).json({ success: false, message: 'Already cancelled' });
        if (order.orderStatus === 'Shipped')   return res.status(400).json({ success: false, message: 'Cannot cancel shipped order' });

        try {
            await cancelOrderInShiprocket({ orderId: order.orderId, shiprocket_order_id: order.shiprocket_order_id });
        } catch (e) { console.error('Shiprocket cancel failed (non-fatal):', e.message); }

        order.orderStatus = 'Cancelled';
        order.cancellationDate = new Date();
        order.cancellationReason = req.body.reason || 'Customer requested';
        await order.save();

        if (order.email?.includes('@')) {
            sendEmail(order.email, 'Order Cancelled — LOOI', `Order #${order.orderId} cancelled.`,
                `<p>Order <strong>#${order.orderId}</strong> has been cancelled.</p>`
            ).catch(e => console.error('Cancel email error:', e.message));
        }
        return res.status(200).json({ success: true, message: 'Order cancelled', order });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to cancel order', error: error.message });
    }
};

exports.markOrderAsDelivered = async (req, res) => {
    const { orderId } = req.params;
    try {
        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
        if (order.orderStatus === 'Delivered') return res.status(400).json({ success: false, message: 'Already delivered' });
        order.orderStatus = 'Delivered';
        order.deliveryDate = new Date();
        await order.save();
        if (order.email?.includes('@')) {
            sendEmail(order.email, 'Order Delivered — LOOI', `Order #${order.orderId} delivered.`,
                `<p>Order <strong>#${order.orderId}</strong> delivered! Total: ₹${order.totalAmount}</p>`
            ).catch(e => console.error('Delivery email error:', e.message));
        }
        return res.status(200).json({ success: true, message: 'Order marked as delivered', order });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to mark as delivered', error: error.message });
    }
};

exports.deleteOrderById = async (req, res) => {
    try {
        await Order.findByIdAndDelete(req.params.orderId);
        res.status(200).json({ success: true, message: 'Order deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete order', error: error.message });
    }
};
