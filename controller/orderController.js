const User = require('../models/userModel');
const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const asyncHandler = require('express-async-handler');
const OrderCount = require('../models/orderCountModel');
const sendEmail = require('../utils/emailService');
const NotificationSettings = require('../models/notificationSettingsModel');
const { getCustomerOrderConfirmationHtml, getAdminNewOrderHtml } = require('../utils/emailTemplates');
const { postOrderToShiprocket, cancelOrderInShiprocket, repushOrderById } = require('../utils/shiprocketService');

const generateOrderId = () => `ORD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

exports.createOrder = async (req, res) => {
    console.log('\n=== /postOrder called ===');
    console.log('Body keys:', Object.keys(req.body || {}));
    console.log('user:', req.body?.user);
    console.log('totalAmount:', req.body?.totalAmount);
    console.log('paymentMethod:', req.body?.paymentMethod);
    console.log('orderItems count:', Array.isArray(req.body?.orderItems) ? req.body.orderItems.length : 'NOT ARRAY');
    console.log('shippingAddress:', JSON.stringify(req.body?.shippingAddress, null, 2));

    try {
        const {
            user, orderItems, shippingAddress, paymentMethod,
            paymentStatus, totalAmount, razorpayOrderId,
            razorpayPaymentId, email
        } = req.body;

        // ── Validate ──────────────────────────────────────────────────────────
        const missing = [];
        if (!user)            missing.push('user');
        if (!orderItems)      missing.push('orderItems');
        if (!shippingAddress) missing.push('shippingAddress');
        if (!paymentMethod)   missing.push('paymentMethod');
        if (!totalAmount)     missing.push('totalAmount');
        if (missing.length)
            return res.status(400).json({ success: false, message: `Missing: ${missing.join(', ')}` });
        if (!Array.isArray(orderItems) || orderItems.length === 0)
            return res.status(400).json({ success: false, message: 'orderItems must be a non-empty array' });

        // ── Enrich order items ────────────────────────────────────────────────
        const enrichedOrderItems = [];
        for (let item of orderItems) {
            if (!item.productName || !item.quantity || !item.price)
                return res.status(400).json({ success: false, message: `Item missing productName/quantity/price: ${item.productName || 'unknown'}` });

            let product = null;
            const lookupId = item.productId || item.product;
            if (lookupId) {
                try { product = await Product.findById(lookupId); } catch (e) {}
            }
            if (!product && item.productName) {
                try {
                    product = await Product.findOne({
                        name: { $regex: new RegExp('^' + item.productName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }
                    });
                } catch (e) {}
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

        // ── Build & save order ────────────────────────────────────────────────
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
            orderDate:         new Date(),
        };

        console.log('Saving order:', orderData.orderId);
        const order = await Order.create(orderData);
        console.log('Order saved _id:', order._id);

        // ── Deduct stock (non-fatal) ──────────────────────────────────────────
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

        // ── Link to user (non-fatal) ──────────────────────────────────────────
        try {
            await User.findByIdAndUpdate(user, { $push: { orders: order._id } }, { new: true });
        } catch (e) { console.error('User link (non-fatal):', e.message); }

        // ── Send customer confirmation email (non-fatal) ──────────────────────
        const recipientEmail = email || order.email;
        if (recipientEmail?.includes('@')) {
            const customerHtml = getCustomerOrderConfirmationHtml({
                ...orderData,
                _id: order._id,
                orderItems: enrichedOrderItems
            });
            sendEmail(
                recipientEmail,
                `Order Confirmed ✓ — LOOI Store (#${order.orderId})`,
                `Your order #${order.orderId} has been placed. Total: ₹${order.totalAmount}`,
                customerHtml
            ).catch(e => console.error('Customer email (non-fatal):', e.message));
        }

        // ── Send admin notification emails (non-fatal) ────────────────────────
        try {
            const notifSettings = await NotificationSettings.findOne();
            if (notifSettings && notifSettings.notifyOnNewOrder && notifSettings.adminEmails.length > 0) {
                const adminHtml = getAdminNewOrderHtml({
                    ...orderData,
                    _id: order._id,
                    orderItems: enrichedOrderItems
                });
                for (const adminEmail of notifSettings.adminEmails) {
                    sendEmail(
                        adminEmail,
                        `🛒 New Order #${order.orderId} — ₹${order.totalAmount}`,
                        `New order #${order.orderId} placed. Total: ₹${order.totalAmount}. Customer: ${recipientEmail || 'N/A'}`,
                        adminHtml
                    ).catch(e => console.error(`Admin notify email (non-fatal) to ${adminEmail}:`, e.message));
                }
            }
        } catch (notifErr) {
            console.error('Admin notification (non-fatal):', notifErr.message);
        }

        // ── Shiprocket push (AWAITED so errors surface) ───────────────────────
        console.log('\n[SR] >>> Starting Shiprocket push for', orderData.orderId);
        try {
            const sr = await postOrderToShiprocket({ ...orderData, _id: order._id });
            console.log('[SR] >>> Push OK — order_id:', sr?.order_id, '| shipment_id:', sr?.shipment_id);
            if (sr?.order_id) {
                await Order.findByIdAndUpdate(order._id, { shiprocket_order_id: String(sr.order_id) });
            }
        } catch (srErr) {
            // Log but don't fail the response — order is already saved in DB
            console.error('[SR] >>> Push FAILED for', orderData.orderId, ':', srErr.message);
        }

        return res.status(200).json({ success: true, message: 'Order created successfully', order });

    } catch (error) {
        console.error('=== createOrder FATAL ===', error.name, error.message);
        if (error.name === 'ValidationError') {
            const fields = Object.keys(error.errors).map(f => `${f}: ${error.errors[f].message}`).join('; ');
            return res.status(500).json({ success: false, message: 'Validation failed: ' + fields });
        }
        return res.status(500).json({ success: false, message: 'Failed to create order: ' + error.message });
    }
};

// ── Admin: manually re-push any order to Shiprocket ───────────────────────────
exports.repushToShiprocket = async (req, res) => {
    const { orderId } = req.params; // MongoDB _id
    try {
        const sr = await repushOrderById(orderId);
        return res.status(200).json({ success: true, message: 'Re-pushed to Shiprocket', shiprocket: sr });
    } catch (e) {
        console.error('[SR repush] Failed:', e.message);
        return res.status(500).json({ success: false, message: e.message });
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
        res.status(200).json({ success: true, count: orders.length, message: 'Orders retrieved', orders });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch orders', error: error.message });
    }
};

exports.getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId)
            .populate({ path: 'user', model: 'user', select: 'name email' })
            .populate({ path: 'orderItems.productId', model: 'Product', select: 'name price coverImage' });
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
        res.status(200).json({ success: true, message: 'Order retrieved', order });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch order', error: error.message });
    }
};

exports.updateOrderById = async (req, res) => {
    try {
        const updatedOrder = await Order.findByIdAndUpdate(req.params.orderId, { $set: req.body }, { new: true });
        if (!updatedOrder) return res.status(404).json({ success: false, message: 'Order not found' });
        res.status(200).json({ success: true, message: 'Order updated', order: updatedOrder });
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
        // ✅ FIX: Return 200 with empty array so client shows "No orders" instead of an error
        if (!orders?.length) return res.status(200).json({ success: true, message: 'No orders found', orders: [] });
        res.status(200).json({ success: true, message: 'Orders retrieved', orders });
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
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$orderDate' } }, orderCount: { $sum: 1 }, totalSales: { $sum: '$totalAmount' } } },
            { $sort: { _id: 1 } }
        ]);
        res.status(200).json({ count: ordersPerDay.length, message: 'Orders per day', ordersPerDay });
    } catch (error) {
        res.status(500).json({ message: 'Failed to retrieve orders per day', error });
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
        } catch (e) { console.error('SR cancel (non-fatal):', e.message); }

        order.orderStatus = 'Cancelled';
        order.cancellationDate = new Date();
        order.cancellationReason = req.body.reason || 'Customer requested';
        await order.save();

        if (order.email?.includes('@')) {
            sendEmail(order.email, 'Order Cancelled — LOOI', `Order #${order.orderId} cancelled.`,
                `<p>Order <strong>#${order.orderId}</strong> has been cancelled.</p>`
            ).catch(e => console.error('Cancel email (non-fatal):', e.message));
        }
        return res.status(200).json({ success: true, message: 'Order cancelled', order });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to cancel', error: error.message });
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
            ).catch(e => console.error('Delivery email (non-fatal):', e.message));
        }
        return res.status(200).json({ success: true, message: 'Marked as delivered', order });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to mark delivered', error: error.message });
    }
};

exports.deleteOrderById = async (req, res) => {
    try {
        await Order.findByIdAndDelete(req.params.orderId);
        res.status(200).json({ success: true, message: 'Order deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete order', error: error.message });
    }
};