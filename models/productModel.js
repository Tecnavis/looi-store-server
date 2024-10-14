
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
  price: {
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
  createdAt: {
    type: Date,
    default: Date.now,
  },
  maincategory: { type: mongoose.Schema.Types.ObjectId, ref: 'MainCategoriesData', required: false },
  subcategory: { type: mongoose.Schema.Types.ObjectId, ref: 'SubcategoriesData', required: false },
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


// const mongoose = require('mongoose');

// // Define a schema for image details
// const ImageSchema = new mongoose.Schema({
//   image: [{ type: String, required: true }]
// });

// // Define a schema for color details
// const ColorSchema = new mongoose.Schema({
//   color: { type: String, required: true },
//   images: [ImageSchema], // Use the ImageSchema for image details
//   stock: { type: Number, required: true, default: 0 },
// });

// // Define a schema for size details
// const SizeSchema = new mongoose.Schema({
//   size: { type: String, required: true },
//   colors: [ColorSchema],
// });

// // Define the main product schema
// const productSchema = new mongoose.Schema({
//   productId: { type: String, required: true, unique: true }, // Ensure productId is unique
//   name: { type: String, required: true },
//   price: { type: Number, required: true },
//   sizes: [SizeSchema],
//   totalStock: { type: Number, required: true, default: 0 },
//   description: { type: String, required: true, maxlength: 500 },
//   countryOfOrigin: { type: String, required: true },
//   manufacturer: { type: String, required: true },
//   packedBy: { type: String, required: true },
//   commodity: { type: String, required: true },
//   ratings: {
//     average: { type: Number, default: 0, min: 0, max: 5 },
//     count: { type: Number, default: 0 },
//   },
//   createdAt: { type: Date, default: Date.now },
//   maincategory: { type: mongoose.Schema.Types.ObjectId, ref: 'MainCategoriesData', required: true },
//   subcategory: { type: mongoose.Schema.Types.ObjectId, ref: 'SubcategoriesData', required: true },
// }, { timestamps: true });

// // Calculate total stock before saving
// productSchema.pre('save', function (next) {
//   let totalStock = 0;

//   // Sum up the stock from all sizes and colors
//   this.sizes.forEach(size => {
//     size.colors.forEach(color => {
//       totalStock += color.stock;
//     });
//   });

//   // Set the totalStock field
//   this.totalStock = totalStock;

//   next();
// });

// // Create the model
// const Product = mongoose.model('Product', productSchema);

// // Export the model
// module.exports = Product;




