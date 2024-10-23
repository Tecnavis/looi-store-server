
const mongoose = require('mongoose');


const AdBannerSchema = new mongoose.Schema({
    image: {  // Change "images" to "image" and type to String
        type: String,  // Store a single image as a string
        required: true  // Ensure that image is required
    }
}, {
  timestamps: { createdAt: true, updatedAt: false }  
});

const AdBannerModel = mongoose.model('adbanner', AdBannerSchema);


module.exports = AdBannerModel;