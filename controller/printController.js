const PrintModel = require('../models/printModel');
const asyncHandler = require('express-async-handler');

exports.addPrint = asyncHandler(async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Image is required' });
    }

    // Use Cloudinary secure_url (file.path) instead of filename
    const imagePath = req.file.path;

    const newPrint = new PrintModel({ image: imagePath });
    await newPrint.save();

    res.status(200).json({ message: 'Print added successfully', prints: newPrint });
  } catch (error) {
    res.status(500).json({ message: 'Error adding print', error: error.message });
  }
});

exports.getPrint = asyncHandler(async (req, res) => {
  try {
    const prints = await PrintModel.find();
    res.status(200).json({ prints });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving prints', error: error.message });
  }
});

exports.deletePrint = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid print ID format.' });
    }
    const deletePrint = await PrintModel.findByIdAndDelete(id);
    if (!deletePrint) {
      return res.status(404).json({ message: 'Print not found.' });
    }
    res.status(200).json({ message: 'Print deleted successfully', prints: deletePrint });
  } catch (error) {
    console.error('Error while deleting print:', error);
    res.status(500).json({ message: 'An error occurred while deleting the print', error: error.message });
  }
});
