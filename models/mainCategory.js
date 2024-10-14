
const mongoose = require('mongoose');

// Main Category Schema
const maincategoriesSchema = new mongoose.Schema({
    mainCategoryName: { type: String, required: true ,unique:true}, // Main category name
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CategoriesData' }], 
    createdAt: { type: Date, default: Date.now } // Auto add created date
});

// Main Category Model
const Maincategories = mongoose.model('MaincategoriesData', maincategoriesSchema);
module.exports = Maincategories;
