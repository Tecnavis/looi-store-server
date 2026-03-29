const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const OrderCount = require('../models/orderCountModel');

const orderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        required: true,
        unique: true,
        sparse: true,
        default: uuidv4,
    },
    // FIX: removed unique:false explicitly — just no unique constraint at all
    // The old DB had a stale unique index on this field causing E11000 on null
    shiprocket_order_id: {
        type: String,
        required: false,
        default: null,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    email: {
        type: String,
        required: false,
        default: ''
    },
    orderItems: [{
        quantity:    { type: Number, required: true },
        price:       { type: Number, required: true },
        color:       { type: String, required: false, default: '' },
        size:        { type: String, required: false, default: '' },
        productId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        productName: { type: String, required: true },
        coverImage:  { type: String, required: false, default: '' },
        hsn:         { type: String, required: false, default: '' },
        sku:         { type: String, required: false, default: '' },
        length:      { type: Number, required: false, default: 0 },
        width:       { type: Number, required: false, default: 0 },
        height:      { type: Number, required: false, default: 0 },
        weight:      { type: Number, required: false, default: 0 },
    }],
    shippingAddress: {
        firstName:     String,
        lastName:      String,
        houseBuilding: String,
        streetArea:    String,
        landmark:      String,
        postalCode:    String,
        cityDistrict:  String,
        state:         String,
        country:       String,
        phoneNumber:   String
    },
    paymentMethod:     { type: String, required: true },
    paymentStatus:     { type: String, enum: ['Pending', 'Paid', 'Failed'], default: 'Pending' },
    totalAmount:       { type: Number, required: true },
    orderStatus:       { type: String, enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'], default: 'Pending' },
    razorpayOrderId:   { type: String },
    razorpayPaymentId: { type: String },
    orderDate:         { type: Date, default: Date.now },
    cancellationDate:  { type: Date },
    shiprocketOrderId: { type: String },
    awbCode:           { type: String },
    shipmentId:        { type: String },
}, { timestamps: true });

// Drop the stale shiprocket_order_id unique index on startup (runs once, safe to repeat)
orderSchema.statics.dropBadIndexes = async function () {
    try {
        const collection = this.collection;
        const indexes = await collection.indexes();
        const badIndex = indexes.find(idx =>
            idx.key && idx.key.shiprocket_order_id !== undefined && idx.unique === true
        );
        if (badIndex) {
            await collection.dropIndex(badIndex.name);
            console.log('[orderModel] Dropped stale unique index:', badIndex.name);
        }
    } catch (e) {
        // Index may not exist — that's fine
        console.log('[orderModel] dropBadIndexes (non-fatal):', e.message);
    }
};

// Increment order count only on NEW order save
orderSchema.pre('save', async function (next) {
    if (!this.isNew) return next();
    try {
        await OrderCount.findOneAndUpdate({}, { $inc: { count: 1 } }, { new: true, upsert: true });
        next();
    } catch (error) {
        console.error('Error updating order count:', error);
        next(error);
    }
});

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
