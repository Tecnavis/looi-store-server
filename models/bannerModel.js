const mongoose = require('mongoose');

// Define the schema for the banner
const BannerSchema = new mongoose.Schema({
  images: [{ type: String, required: true }],
  maincategoriesData: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'MaincategoriesData', 
    required: true 
  },
}, {
  timestamps: { createdAt: true, updatedAt: false }  
});

const BannerModel = mongoose.model('banner', BannerSchema);

// Export the model
module.exports = BannerModel;