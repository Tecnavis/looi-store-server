const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const productSchema = new mongoose.Schema({
  productId: {
    type: String,
    required: true,
    unique: true, // Ensure that productId is unique
    default: uuidv4, // Automatically generate a UUID
  },
  name: {
    type: String,
    required: true,
  },
  oldPrice: {
    type: Number,
    required: false,
  },
  price:{
    type: Number,
    required: true,
  },
  coverImage: {
    type: String,
    required: true,
  },
  sizes: [{
    size: { type: String, required: true },
    colors: [{
      color: { type: String, required: true },
      images: [{ type: String, required: true }],
      stock: { type: Number, required: true, default: 0 } 
    }]
  }],
  totalStock: {
    type: Number,
    required: true,
    default: 0 
  },
  description: {
    type: String,
    required: false,
    maxlength: 500,
  },
  countryOfOrigin: {
    type: String,
    required: false,
  },
  manufacturer: {
    type: String,
    required: false,
  },
  packedBy: {
    type: String,
    required: false,
  },
  commodity: {
    type: String,
    required: false,
  },
  ratings: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    count: {
      type: Number,
      default: 0,
    },
  },
  hsn: { type: String, required: true },
  sku: { type: String, required: true},

    length: {
      type: Number,
      required: true,
      min: 0
    },
    width: {
      type: Number,
      required: true,
      min: 0
    },
    height: {
      type: Number,
      required: true,
      min: 0
    },
    weight: {
      type: Number,
      required: true,
      min: 0
    }  
,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  maincategory: { type: mongoose.Schema.Types.ObjectId, ref: 'MainCategoriesData', required: true },
  subcategory: { type: mongoose.Schema.Types.ObjectId, ref: 'SubcategoriesData', required: true },
}, { timestamps: true });


// Calculate total stock before saving
productSchema.pre('save', function (next) {
  let totalStock = 0;
  
  // Sum up the stock from all sizes and colors
  this.sizes.forEach(size => {
    size.colors.forEach(color => {
      totalStock += color.stock;
    });
  });

  // Set the totalStock field
  this.totalStock = totalStock;
  next();
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;

