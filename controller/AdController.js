const AdBannerModel=require('../models/adModel')
const asyncHandler = require('express-async-handler');


// post
exports.addBanner = asyncHandler(async (req, res) => {
    try {
        // Check if a file was uploaded
        if (!req.file) {  // Use req.file for single file
            return res.status(400).json({ message: "Image is required" });
        }

        // Get the file path of the uploaded image
        const imagePath = req.file.filename;  // Use req.file to get the filename

        const newBanner = new AdBannerModel({
            image: imagePath  // Store the single image path in the database
        });

        await newBanner.save();  // Save the new banner to the database

        res.status(200).json({ message: "Banner added successfully", banner: newBanner });
    } catch (error) {
        res.status(500).json({ message: "Error adding banner", error: error.message });
    }
});



// getBanner
exports.getBanner = asyncHandler(async (req, res) => {
    try {
      const banners = await AdBannerModel.find();
  
      res.status(200).json({ banners });
    } catch (error) {
      res.status(500).json({ message: "Error retrieving banners", error: error.message });
    }
  });

//   delete banner
exports.deleteBanner = asyncHandler(async (req, res) => {
    const { id } = req.params;
  
    try {
      // Validate the ID format
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        console.error('Invalid ID format.');
        return res.status(400).json({ message: 'Invalid banner ID format.' });
      }
  
      // Find and delete the banner
      const deletedBanner = await AdBannerModel.findByIdAndDelete(id);
  
      // If no banner is found, return a 404 error
      if (!deletedBanner) {
        return res.status(404).json({ message: 'Banner not found.' });
      }
  
      // Respond with a success message
      res.status(200).json({
        message: 'Banner deleted successfully',
        banner: deletedBanner
      });
    } catch (error) {
      console.error('Error while deleting banner:', error);
      res.status(500).json({ message: 'An error occurred while deleting the banner', error: error.message });
    }
}
    );
