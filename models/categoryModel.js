
const mongoose = require('mongoose');

// Category Schema
const categoriesSchema = new mongoose.Schema({
    name: { type: String, required: true }, // Category name
    maincategoriesData: { type: mongoose.Schema.Types.ObjectId, ref: 'MaincategoriesData', required: true }, // Reference to MaincategoriesData
    images: { type: [String], required: false },
    createdAt: { type: Date, default: Date.now } // Auto add created date
});

// Category Model
const CategoriesData = mongoose.model('CategoriesData', categoriesSchema);
module.exports = CategoriesData;



