const AdBannerModel = require('../models/adModel');
const asyncHandler = require('express-async-handler');

// post
exports.addBanner = asyncHandler(async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Image is required' });
    }

    // Use Cloudinary secure_url (file.path) instead of filename
    const imagePath = req.file.path;

    const newBanner = new AdBannerModel({ image: imagePath });
    await newBanner.save();

    res.status(200).json({ message: 'Banner added successfully', banner: newBanner });
  } catch (error) {
    res.status(500).json({ message: 'Error adding banner', error: error.message });
  }
});

exports.getBanner = asyncHandler(async (req, res) => {
  try {
    const banners = await AdBannerModel.find();
    res.status(200).json({ banners });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving banners', error: error.message });
  }
});

exports.deleteBanner = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid banner ID format.' });
    }
    const deletedBanner = await AdBannerModel.findByIdAndDelete(id);
    if (!deletedBanner) {
      return res.status(404).json({ message: 'Banner not found.' });
    }
    res.status(200).json({ message: 'Banner deleted successfully', banner: deletedBanner });
  } catch (error) {
    console.error('Error while deleting banner:', error);
    res.status(500).json({ message: 'An error occurred while deleting the banner', error: error.message });
  }
});
