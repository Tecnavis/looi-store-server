const Razorpay = require('razorpay')
require("dotenv").config()
const crypto = require("crypto")

exports.order = async(req,res)=> {
    try {
        const razorpay = new Razorpay ({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_SECRET_KEY,
        });
        const options = req.body
        const order = await razorpay.orders.create(options);
        if(!order){
            return res.stats(500).send("Error")
        }
         res.json(order)
    } catch (error) {
        console.log(error)
        res.stats(500).send("Error")
    }

}
// exports.validate = async(req, res) => {
   
//     const { razorpay_signature, razorpay_order_id, razorpay_payment_id } = req.body;
    
//     // Create a hash for comparison
//     const sha = crypto.createHmac('sha256', process.env.RAZORPAY_SECRET_KEY);
//     sha.update(`${razorpay_order_id}|${razorpay_payment_id}`);
//     const digest = sha.digest('hex');
   
//     // Validate the signature
//     if (digest !== razorpay_signature) {
//         return res.status(400).json({ success: false, msg: "Transaction is not legit" });
//     }

//     res.json({ success: true, orderId: razorpay_order_id, paymentId: razorpay_payment_id });
// };


exports.validate = async(req, res) => {
    const { razorpay_signature, razorpay_order_id, razorpay_payment_id } = req.body;
    
    const sha = crypto.createHmac('sha256', process.env.RAZORPAY_SECRET_KEY);
    sha.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = sha.digest('hex');

    if (digest !== razorpay_signature) {
        return res.status(400).json({ success: false, msg: "Transaction is not legit" });
    }

    // Return the data with an order field to match frontend expectations
    res.json({
        success: true,
        order: { orderId: razorpay_order_id, paymentId: razorpay_payment_id }
    });
};

