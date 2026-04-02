const User = require('../models/userModel');
const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const asyncHandler = require('express-async-handler');
const OrderCount = require('../models/orderCountModel');
const sendEmail = require('../utils/emailService');
const { postOrderToShiprocket, cancelOrderInShiprocket } = require('../utils/shiprocketService');

const generateOrderId = () => `ORD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

exports.createOrder = async (req, res) => {
    console.log('=== /postOrder called ===');
    console.log('BODY keys:', Object.keys(req.body || {}));
    console.log('user:', req.body?.user);
    console.log('totalAmount:', req.body?.totalAmount, '| type:', typeof req.body?.totalAmount);
    console.log('paymentMethod:', req.body?.paymentMethod);
    console.log('skipShipping value:', req.body?.skipShipping, '| type:', typeof req.body?.skipShipping);
    console.log('orderItems count:', Array.isArray(req.body?.orderItems) ? req.body.orderItems.length : 'NOT ARRAY');

    try {
        const {
            user, orderItems, shippingAddress, paymentMethod,
            paymentStatus, totalAmount, razorpayOrderId,
            razorpayPaymentId, email
            // ✅ REMOVED skipShipping — Shiprocket call always runs
        } = req.body;

        // ── Validate required fields ──────────────────────────────────────────
        const missing = [];
        if (!user)            missing.push('user');
        if (!orderItems)      missing.push('orderItems');
        if (!shippingAddress) missing.push('shippingAddress');
        if (!paymentMethod)   missing.push('paymentMethod');
        if (!totalAmount)     missing.push('totalAmount');

        if (missing.length > 0) {
            console.log('MISSING FIELDS:', missing);
            return res.status(400).json({ success: false, message: `Missing required fields: ${missing.join(', ')}` });
        }
        if (!Array.isArray(orderItems) || orderItems.length === 0) {
            return res.status(400).json({ success: false, message: 'orderItems must be a non-empty array' });
        }

        // ── Enrich order items ────────────────────────────────────────────────
        const enrichedOrderItems = [];
        for (let item of orderItems) {
            if (!item.productName || !item.quantity || !item.price) {
                return res.status(400).json({
                    success: false,
                    message: `Item missing productName/quantity/price: ${item.productName || 'unknown'}`
                });
            }

            let product = null;
            const lookupId = item.productId || item.product;
            if (lookupId) {
                try { product = await Product.findById(lookupId); } catch (e) { /* ignore bad id */ }
            }
            if (!product && item.productName) {
                try {
                    product = await Product.findOne({
                        name: { $regex: new RegExp('^' + item.productName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }
                    });
                } catch (e) { /* ignore */ }
            }

            enrichedOrderItems.push({
                productId:   product ? product._id : (lookupId || null),
                productName: item.productName,
                quantity:    Number(item.quantity),
                price:       Number(item.price),
                color:       item.color   || '',
                size:        item.size    || '',
                hsn:         item.hsn     || product?.hsn || '0000',
                sku:         item.sku     || product?.sku || `SKU-${Date.now()}`,
                length:      item.length  || product?.length || 10,
                width:       item.width   || product?.width  || 10,
                height:      item.height  || product?.height || 10,
                weight:      item.weight  || product?.weight || 0.5,
                coverImage:  product?.coverImage || '',
            });
        }

        // ── Build order ───────────────────────────────────────────────────────
        const orderData = {
            orderId:           generateOrderId(),
            user,
            orderItems:        enrichedOrderItems,
            shippingAddress,
            paymentMethod,
            paymentStatus:     paymentStatus || 'Pending',
            totalAmount:       Number(totalAmount),
            razorpayOrderId:   razorpayOrderId   || undefined,
            razorpayPaymentId: razorpayPaymentId || undefined,
            email:             email || '',
            orderStatus:       'Pending',
            orderDate:         new Date()
        };

        console.log('Saving order with orderId:', orderData.orderId, '| amount:', orderData.totalAmount);

        // ── STEP 1: Save to DB ────────────────────────────────────────────────
        const order = await Order.create(orderData);
        console.log('Order saved! _id:', order._id);

        // ── STEP 2: Deduct stock (non-fatal) ──────────────────────────────────
        for (let item of enrichedOrderItems) {
            if (!item.productId || !item.size || !item.color) continue;
            try {
                const product = await Product.findById(item.productId);
                if (!product) continue;
                const sizeObj  = product.sizes?.find(s => s.size === item.size);
                const colorObj = sizeObj?.colors?.find(c => c.color === item.color);
                if (colorObj) {
                    colorObj.stock = Math.max(0, colorObj.stock - item.quantity);
                    await product.save();
                }
            } catch (e) { console.error('Stock error (non-fatal):', e.message); }
        }

        // ── STEP 3: Link to user (non-fatal) ──────────────────────────────────
        try {
            await User.findByIdAndUpdate(user, { $push: { orders: order._id } }, { new: true });
        } catch (e) { console.error('User link error (non-fatal):', e.message); }

        // ── STEP 4: Send email (non-fatal) ────────────────────────────────────
        const recipientEmail = email || order.email;
        if (recipientEmail && typeof recipientEmail === 'string' && recipientEmail.includes('@')) {
            const html = enrichedOrderItems.map(item =>
                `<li>${item.productName} × ${item.quantity} — ₹${item.price * item.quantity} (${item.size || ''} ${item.color || ''})</li>`
            ).join('');
            sendEmail(
                recipientEmail,
                'Order Confirmation — LOOI Store',
                `Order #${order.orderId} placed successfully.`,
                `<p>Thank you! Order ID: <strong>${order.orderId}</strong></p><ul>${html}</ul><p>Total: ₹${order.totalAmount}</p>`
            ).catch(e => console.error('Email error (non-fatal):', e.message));
        }

        // ── STEP 5: Shiprocket — always runs, no skipShipping check ──────────
        console.log('[Shiprocket] Starting order push for orderId:', orderData.orderId);
        postOrderToShiprocket({ ...orderData, _id: order._id })
            .then(async (sr) => {
                console.log('[Shiprocket] Push succeeded. order_id:', sr?.order_id);
                if (sr?.order_id) {
                    await Order.findByIdAndUpdate(order._id, { shiprocket_order_id: String(sr.order_id) });
                    console.log('[Shiprocket] shiprocket_order_id saved to DB:', sr.order_id);
                }
            })
            .catch((e) => {
                console.error('[Shiprocket] Push FAILED for orderId:', orderData.orderId);
                console.error('[Shiprocket] Error detail:', JSON.stringify(e.response?.data || e.message, null, 2));
            });

        // ── Always return 200 once order is in DB ─────────────────────────────
        console.log('Returning success for order:', order._id);
        return res.status(200).json({ success: true, message: 'Order created successfully', order });

    } catch (error) {
        console.error('=== createOrder FATAL ERROR ===');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        if (error.name === 'ValidationError') {
            const fields = Object.keys(error.errors).map(f => `${f}: ${error.errors[f].message}`).join('; ');
            return res.status(500).json({ success: false, message: 'Validation failed — ' + fields, error: error.message });
        }
        return res.status(500).json({ success: false, message: 'Failed to create order: ' + error.message, error: error.message });
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
