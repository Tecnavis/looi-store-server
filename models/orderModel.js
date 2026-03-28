const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const OrderCount=require('../models/orderCountModel')

const orderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        required: true,
        unique: true,
        default: uuidv4, // Automatically generate a UUID
    },
    shiprocket_order_id: {
        type: String,
        required: false,
        unique: false,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    email: {
        type: String,
        required: true
    },
    orderItems: [{
      
        
        quantity: {
            type: Number,
            required: true
        },
        price: {
            type: Number,
            required: true
        },
        color: {
            type: String,
            required: false
        },
        size: {
            type: String,
            required: false
        },
        product_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        },
        // productId: {
        //      type: mongoose.Schema.Types.ObjectId,
        //     ref: 'Product'
        // },
        productName: {
            type: String,
            required: true
        },
        coverImage: {
            type: String,
            required: false
        },
        hsn:{
            type: String,
            required: false,
            default: ''
        },
        sku: {
            type: String,
            required: false,
            default: ''
        },

        length: {
            type: Number,
            required: false,
            default: 0
        },
        width: {
            type: Number,
            required: false,
            default: 0
        },
        height: {
            type: Number,
            required: false,
            default: 0
        },
        weight: {
            type: Number,
            required: false,
            default: 0
        },

    }],
    shippingAddress: {
        firstName: String,
        lastName: String,
        houseBuilding: String,
        streetArea: String,
        landmark: String,
        postalCode: String,
        cityDistrict: String,
        state: String,
        country: String,
        phoneNumber: String
    },
    paymentMethod: {
        type: String,
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Paid', 'Failed'],
        default: 'Pending'
    },
    totalAmount: {
        type: Number,
        required: true
    },
    orderStatus: {
        type: String,
        enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
        default: 'Pending'
    },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    orderDate: {
        type: Date,
        default: Date.now
    },
    cancellationDate: {
        type: Date
    },
    shiprocketOrderId: {
        type: String
    },
    awbCode:{
        type: String
    },
    shipmentId: {
     type: String
    },
}, {
    timestamps: true
});

// Middleware to increment order count only when a NEW order is created
orderSchema.pre('save', async function(next) {
    if (!this.isNew) return next(); // ← Only count on first save, not updates
    try {
        await OrderCount.findOneAndUpdate(
            {},
            { $inc: { count: 1 } },
            { new: true, upsert: true }
        );
        next();
    } catch (error) {
        console.error("Error updating order count:", error);
        next(error);
    }
});

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;


