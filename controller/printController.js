const PrintModel=require('../models/printModel')
const asyncHandler = require('express-async-handler');

// post
exports.addPrint = asyncHandler(async (req, res) => {
    try {
        // Check if a file was uploaded
        if (!req.file) {  // Use req.file for single file
            return res.status(400).json({ message: "Image is required" });
        }

        // ✅ Cloudinary gives file.path as URL. fallback to filename for local storage
        const imagePath = req.file.path || req.file.filename;

        const newPrint = new PrintModel({
            image: imagePath  // Store the single image path in the database
        });

        await newPrint.save();  // Save the new banner to the database

        res.status(200).json({ message: "Print added successfully", prints: newPrint });
    } catch (error) {
        res.status(500).json({ message: "Error adding print", error: error.message });
    }
});

// getBanner
exports.getPrint = asyncHandler(async (req, res) => {
    try {
      const prints = await PrintModel.find();
  
      res.status(200).json({ prints });
    } catch (error) {
      res.status(500).json({ message: "Error retrieving banners", error: error.message });
    }
  });

//   delete banner
exports.deletePrint = asyncHandler(async (req, res) => {
    const { id } = req.params;
    try {
      // Validate the ID format
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        console.error('Invalid ID format.');
        return res.status(400).json({ message: 'Invalid print ID format.' });
      }
     
      // Find and delete the banner
      const deletePrint = await PrintModel.findByIdAndDelete(id);
  
      // If no banner is found, return a 404 error
      if (!deletePrint) {
        return res.status(404).json({ message: 'Print not found.' });
      }
      // Respond with a success message
      res.status(200).json({
        message: 'Print deleted successfully',
        prints: deletePrint
      });
    } catch (error) {
      console.error('Error while deleting print:', error);
      res.status(500).json({ message: 'An error occurred while deleting the print', error: error.message });
    }
}
    );
