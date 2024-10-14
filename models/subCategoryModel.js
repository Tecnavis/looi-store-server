
const mongoose = require('mongoose');

// Subcategory Schema
const subcategoriesSchema = new mongoose.Schema({
    subcategoryname: { type: String, required: true }, // Sub Category name
    // category: { type: mongoose.Schema.Types.ObjectId, ref: 'CategoriesData', required: true }, 
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'CategoriesData', required: true }, 
    maincategory: { type: mongoose.Schema.Types.ObjectId, ref: 'MainCategoriesData', required: true }, // Add this line    
    // products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ProductsData' }],
    createdAt: { type: Date, default: Date.now } // Auto add created date
});

// Subcategory Model
const SubcategoriesData = mongoose.model('SubcategoriesData', subcategoriesSchema);
module.exports = SubcategoriesData;



