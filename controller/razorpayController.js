const Razorpay = require('razorpay')
require("dotenv").config()
const crypto = require("crypto")
const Order = require('../models/orderModel');

exports.order = async(req,res)=> {
    try {
        const razorpay = new Razorpay ({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_SECRET_KEY,
        });
        const options = req.body
        const order = await razorpay.orders.create(options);
        if(!order){
            return res.status(500).send("Error")
        }
         res.json(order)
    } catch (error) {
        console.log(error)
        res.status(500).send("Error")
    }
}

exports.validate = async(req, res) => {
    const { razorpay_signature, razorpay_order_id, razorpay_payment_id, dbOrderId } = req.body;

    const sha = crypto.createHmac('sha256', process.env.RAZORPAY_SECRET_KEY);
    sha.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = sha.digest('hex');

    if (digest !== razorpay_signature) {
        return res.status(400).json({ success: false, msg: "Transaction is not legit" });
    }

    // Payment is verified — update the order in DB to Paid + Processing
    // Frontend must pass dbOrderId (MongoDB _id of the order created via /postOrder)
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
            // Non-fatal: still return success so frontend flow completes
        }
    } else {
        // Fallback: try to find order by razorpayOrderId
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
