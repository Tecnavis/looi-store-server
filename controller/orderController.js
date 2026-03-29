const User = require('../models/userModel');
const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const asyncHandler = require('express-async-handler');
const OrderCount = require('../models/orderCountModel');
const sendEmail = require('../utils/emailService');
const { postOrderToShiprocket, cancelOrderInShiprocket } = require('../utils/shiprocketService');

const generateOrderId = () => {
    return `ORD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
};

exports.createOrder = async (req, res) => {
    try {
        const {
            user, orderItems, shippingAddress, paymentMethod,
            paymentStatus, totalAmount, razorpayOrderId,
            razorpayPaymentId, email, skipShipping
        } = req.body;

        if (!user || !orderItems || !shippingAddress || !paymentMethod || !totalAmount) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: user, orderItems, shippingAddress, paymentMethod, totalAmount'
            });
        }
        if (!Array.isArray(orderItems) || orderItems.length === 0) {
            return res.status(400).json({ success: false, message: 'orderItems must be a non-empty array' });
        }

        const enrichedOrderItems = [];
        for (let item of orderItems) {
            if (!item.productName || !item.quantity || !item.price) {
                return res.status(400).json({
                    success: false,
                    message: `Each item needs productName, quantity, price. Failed on: ${item.productName || 'unknown'}`
                });
            }
            let product = null;
            const lookupId = item.productId || item.product;
            if (lookupId) {
                try { product = await Product.findById(lookupId); } catch (e) {}
            }
            if (!product && item.productName) {
                product = await Product.findOne({
                    name: { $regex: new RegExp('^' + item.productName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }
                });
            }
            const enriched = {
                productId:   product ? product._id : (lookupId || null),
                productName: item.productName,
                quantity:    item.quantity,
                price:       item.price,
                color:       item.color   || '',
                size:        item.size    || '',
                hsn:         item.hsn     || (product && product.hsn)    || '',
                sku:         item.sku     || (product && product.sku)    || '',
                length:      item.length  || (product && product.length) || 0,
                width:       item.width   || (product && product.width)  || 0,
                height:      item.height  || (product && product.height) || 0,
                weight:      item.weight  || (product && product.weight) || 0,
                coverImage:  (product && product.coverImage) || '',
            };
            if (product && item.size && item.color) {
                const sizeObj  = product.sizes && product.sizes.find(s => s.size === item.size);
                const colorObj = sizeObj && sizeObj.colors && sizeObj.colors.find(c => c.color === item.color);
                if (colorObj && colorObj.stock < item.quantity) {
                    return res.status(400).json({
                        success: false,
                        message: `Insufficient stock for ${item.productName} (size: ${item.size}, color: ${item.color})`
                    });
                }
            }
            enrichedOrderItems.push(enriched);
        }

        const orderData = {
            orderId: generateOrderId(),
            user, orderItems: enrichedOrderItems, shippingAddress, paymentMethod,
            paymentStatus: paymentStatus || 'Pending', totalAmount,
            razorpayOrderId: razorpayOrderId || undefined,
            razorpayPaymentId: razorpayPaymentId || undefined,
            email: email || '',
            orderStatus: 'Pending', orderDate: new Date()
        };

        // STEP 1: Save to DB — if this fails, return 500. Everything else is non-fatal.
        const order = await Order.create(orderData);

        // STEP 2: Deduct stock (non-fatal)
        for (let item of enrichedOrderItems) {
            if (!item.productId || !item.size || !item.color) continue;
            try {
                const product = await Product.findById(item.productId);
                if (!product) continue;
                const sizeObj  = product.sizes && product.sizes.find(s => s.size === item.size);
                if (!sizeObj) continue;
                const colorObj = sizeObj.colors && sizeObj.colors.find(c => c.color === item.color);
                if (!colorObj) continue;
                colorObj.stock = Math.max(0, colorObj.stock - item.quantity);
                await product.save();
            } catch (e) { console.error('Stock error (non-fatal):', e.message); }
        }

        // STEP 3: Link order to user (non-fatal)
        try {
            await User.findByIdAndUpdate(user, { $push: { orders: order._id } }, { new: true });
        } catch (e) { console.error('User link error (non-fatal):', e.message); }

        // STEP 4: Send email (non-fatal — ONLY if valid email exists)
        const recipientEmail = email || order.email;
        if (recipientEmail && typeof recipientEmail === 'string' && recipientEmail.includes('@')) {
            const orderItemsHtml = enrichedOrderItems.map(item =>
                `<li><strong>${item.productName}</strong> — ${item.quantity} x Rs.${item.price} = Rs.${item.quantity * item.price}<br>Size: ${item.size || 'N/A'}, Color: ${item.color || 'N/A'}</li>`
            ).join('');
            sendEmail(
                recipientEmail,
                'Order Confirmation — LOOI Store',
                `Your order #${order.orderId} has been placed.`,
                `<p>Thank you! Order ID: <strong>${order.orderId}</strong></p><ul>${orderItemsHtml}</ul><p>Total: Rs.${order.totalAmount}</p>`
            ).catch(e => console.error('Email error (non-fatal):', e.message));
        } else {
            console.warn('No valid email — skipping confirmation email');
        }

        // STEP 5: Shiprocket (non-fatal — NEVER throws, always caught)
        if (!skipShipping) {
            try {
                const shiprocketResponse = await postOrderToShiprocket({ ...orderData, _id: order._id });
                if (shiprocketResponse && shiprocketResponse.order_id) {
                    order.shiprocket_order_id = shiprocketResponse.order_id;
                    await order.save();
                }
            } catch (shiprocketError) {
                console.error('Shiprocket error (non-fatal — order already saved):', shiprocketError.message);
            }
        }

        return res.status(200).json({ success: true, message: 'Order created successfully', order });

    } catch (error) {
        console.error('Error creating order:', error);
        if (error.name === 'ValidationError') {
            const fields = Object.keys(error.errors).join(', ');
            return res.status(500).json({ success: false, message: 'Validation failed: ' + fields, error: error.message });
        }
        return res.status(500).json({ success: false, message: 'Failed to create order', error: error.message });
    }
};

exports.orderSuccessHandler = asyncHandler(async (req, res) => {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    order.orderStatus = 'Success';
    await order.save();
    for (const item of order.orderItems) {
        try {
            const product = await Product.findById(item.productId);
            if (product) {
                const sizeObj  = product.sizes.find(s => s.size === item.size);
                if (sizeObj) {
                    const colorObj = sizeObj.colors.find(c => c.color === item.color);
                    if (colorObj && colorObj.stock >= item.quantity) {
                        colorObj.stock -= item.quantity;
                        await product.save();
                    }
                }
            }
        } catch (e) { console.error('Stock update error:', e.message); }
    }
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
        const orderCountDoc = await OrderCount.findOne();
        res.status(200).json({ totalOrderCount: orderCountDoc ? orderCountDoc.count : 0 });
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
        if (order.orderStatus === 'Shipped') return res.status(400).json({ success: false, message: 'Cannot cancel shipped order' });

        try {
            const shiprocketResponse = await cancelOrderInShiprocket({ orderId: order.orderId, shiprocket_order_id: order.shiprocket_order_id });
            Object.assign(order, { orderStatus: 'Cancelled', cancellationDate: new Date(), cancellationReason: req.body.reason || 'Customer requested', shiprocketCancellationResponse: shiprocketResponse });
        } catch (e) {
            console.error('Shiprocket cancel failed (non-fatal):', e.message);
            Object.assign(order, { orderStatus: 'Cancelled', cancellationDate: new Date(), cancellationNotes: 'Shiprocket cancellation may need manual action' });
        }
        await order.save();

        if (order.email && order.email.includes('@')) {
            sendEmail(order.email, 'Order Cancelled — LOOI Store', `Order #${order.orderId} cancelled.`,
                `<p>Your order <strong>#${order.orderId}</strong> has been cancelled.</p>`
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
        if (order.email && order.email.includes('@')) {
            sendEmail(order.email, 'Order Delivered — LOOI Store', `Order #${order.orderId} delivered.`,
                `<p>Your order <strong>#${order.orderId}</strong> has been delivered! Total: Rs.${order.totalAmount}</p>`
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
