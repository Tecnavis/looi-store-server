const mongoose = require('mongoose');

// Each document is one marquee item (a short text strip).
// The client fetches all active items and displays them as a scrolling ticker.
const marqueeSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true,
        trim: true,
    },
    icon: {
        type: String,
        default: '✦',   // decorative separator shown before each item
        trim: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    order: {
        type: Number,
        default: 0,     // lower number = displayed first
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Marquee', marqueeSchema);
