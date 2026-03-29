const Razorpay = require('razorpay')
require("dotenv").config()
const crypto = require("crypto")
const Order = require('../models/orderModel');

// FIX: Validate amount properly — frontend must send amount in PAISE (multiply ₹ by 100)
exports.order = async(req,res)=> {
    try {
        const razorpay = new Razorpay ({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_SECRET_KEY,
        });

        const { amount, currency, receipt } = req.body;

        // Validate required fields
        if (!amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid or missing amount. Send amount in paise (₹ × 100).' });
        }

        const options = {
            amount: Math.round(amount), // Must be integer paise
            currency: currency || 'INR',
            receipt: receipt || `receipt_${Date.now()}`,
        };

        console.log('[Razorpay] Creating order:', options);
        const order = await razorpay.orders.create(options);
        if(!order){
            return res.status(500).json({ success: false, message: 'Failed to create Razorpay order' });
        }
        console.log('[Razorpay] Order created:', order.id);
        res.json(order);
    } catch (error) {
        console.error('[Razorpay] Order creation error:', error);
        res.status(500).json({ success: false, message: error.error?.description || error.message || 'Razorpay error' });
    }
}

exports.validate = async(req, res) => {
    const { razorpay_signature, razorpay_order_id, razorpay_payment_id, dbOrderId } = req.body;

    if (!razorpay_signature || !razorpay_order_id || !razorpay_payment_id) {
        return res.status(400).json({ success: false, msg: "Missing payment verification fields" });
    }

    const sha = crypto.createHmac('sha256', process.env.RAZORPAY_SECRET_KEY);
    sha.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = sha.digest('hex');

    if (digest !== razorpay_signature) {
        return res.status(400).json({ success: false, msg: "Transaction is not legit" });
    }

    // Payment verified — update order in DB
    if (dbOrderId) {
        try {
            await Order.findByIdAndUpdate(dbOrderId, {
                paymentStatus: 'Paid',
                orderStatus: 'Processing',
                razorpayOrderId: razorpay_order_id,
                razorpayPaymentId: razorpay_payment_id,
            });
        } catch (err) {
            console.error('Failed to update order payment status:', err.message);
        }
    } else {
        try {
            await Order.findOneAndUpdate(
                { razorpayOrderId: razorpay_order_id },
                {
                    paymentStatus: 'Paid',
                    orderStatus: 'Processing',
                    razorpayPaymentId: razorpay_payment_id,
                }
            );
        } catch (err) {
            console.error('Fallback order update failed:', err.message);
        }
    }

    res.json({
        success: true,
        order: { orderId: razorpay_order_id, paymentId: razorpay_payment_id }
    });
};
