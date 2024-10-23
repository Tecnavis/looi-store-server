
// const mongoose = require('mongoose');

// // Subcategory Schema
// const subcategoriesSchema = new mongoose.Schema({
//     subcategoryname: { type: String, required: true }, 
//     category: { type: mongoose.Schema.Types.ObjectId, ref: 'CategoriesData', required: true }, 
//     maincategory: { type: mongoose.Schema.Types.ObjectId, ref: 'MainCategoriesData', required: true },   
//     createdAt: { type: Date, default: Date.now } // Auto add created date
// });

// // Subcategory Model
// const SubcategoriesData = mongoose.model('SubcategoriesData', subcategoriesSchema);
// module.exports = SubcategoriesData;


const mongoose = require('mongoose');

// Subcategory Schema
const subcategoriesSchema = new mongoose.Schema({
    subcategoryname: { type: String, required: true }, 
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'CategoriesData', required: true }, 
    maincategory: { type: mongoose.Schema.Types.ObjectId, ref: 'MainCategoriesData', required: true },   
    images: { type: [String], required: false }, // Add an array of strings to store image paths
    createdAt: { type: Date, default: Date.now } // Auto add created date
});

// Subcategory Model
const SubcategoriesData = mongoose.model('SubcategoriesData', subcategoriesSchema);
module.exports = SubcategoriesData;



