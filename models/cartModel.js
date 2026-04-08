const mongoose = require('mongoose');

// Define the cart schema
const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    productId: {
      type: String,
      required: false,
      default: ''
    },
    productName: {
      type: String,
      required: false,
      default: ''
    },
    coverImage: {
      type: String,
      required: false,
      default: ''
    },
    size: {
      type: String,
      required: true
    },
    color: {
      type: String,
      required: false,
      default: ''
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    },
    price: {
      type: Number,
      required: true
    },
    hsn: {
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
    }
  }],
  totalPrice: {
    type: Number,
    required: true,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Calculate the total price before saving
cartSchema.pre('save', function (next) {
  let totalPrice = 0;
  this.items.forEach(item => {
    totalPrice += (item.price || 0) * (item.quantity || 1);
  });
  this.totalPrice = totalPrice;
  next();
});

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;