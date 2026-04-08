const mongoose = require('mongoose');

// Define the cart schema
const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user', // Reference to the User model
    required: true
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product', // Reference to the Product model
      required: true
    },
    productId:{
      type:String,
      required:true
    },
    productName: {
      type: String,  // Add the product name here
      required: true
    },
    coverImage: {
      type: String, // Add the cover image URL field here
      required: true
      // default: 'default-product-image.jpg' 
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
      required: true // Store the product price at the time of adding to cart
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

  // Sum up the price for each item in the cart
  this.items.forEach(item => {
    totalPrice += item.price * item.quantity;
  });

  // Set the totalPrice field
  this.totalPrice = totalPrice;

  next();
});

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;