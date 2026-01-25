const asyncHandler = require('express-async-handler');
const BannerModel = require('../models/bannerModel');


exports.postBanner = asyncHandler(async (req, res) => {
  // Check for files
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'No banner images uploaded' });
  }

  // Check for maincategoriesData in the request body
  const maincategoriesData = req.body.category; // Assuming 'category' is sent from frontend

  if (!maincategoriesData) {
    return res.status(400).json({ message: 'Main category is required' });
  }

  // ✅ Cloudinary gives file.path as URL. fallback to filename for local storage
  const imagePaths = req.files.map(file => file.path || file.filename);

  try {
    const newBanner = new BannerModel({
      images: imagePaths,
      maincategoriesData // This matches your schema field name
    });

    await newBanner.save();

    const populatedBanner = await BannerModel.findById(newBanner._id)
      .populate('maincategoriesData', 'mainCategoryName');

    return res.status(200).json({
      message: 'Banners posted successfully',
      banner: populatedBanner
    });
  } catch (error) {
    console.error('Banner save error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid main category ID format' });
    }
    return res.status(500).json({ 
      message: 'Error posting banners', 
      error: error.message,
      details: error.toString()
    });
  }
});



exports.getBanner = asyncHandler(async (req, res) => {
  try {
    // Fetch all banners and populate the maincategoriesData field
    const banners = await BannerModel.find()
      .populate({
        path: 'maincategoriesData',
        select: 'mainCategoryName' // Only get the mainCategoryName field
      })
      .sort({ createdAt: -1 }); // Sort by newest first

    // Check if banners exist
    if (!banners || banners.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'No banners found' 
      });
    }

    // Transform the data to include category name if needed
    const transformedBanners = banners.map(banner => ({
      _id: banner._id,
      images: banner.images,
      categoryName: banner.maincategoriesData?.mainCategoryName || 'Unknown Category',
      categoryId: banner.maincategoriesData?._id,
      createdAt: banner.createdAt
    }));

    // Send a success response with the fetched banners
    res.status(200).json({
      success: true,
      message: 'Banners retrieved successfully',
      banners: transformedBanners
    });
  } catch (error) {
    console.error('Error fetching banners:', error);
    res.status(500).json({ 
      success: false,
      message: 'An error occurred while fetching banners', 
      error: error.message 
    });
  }
});

// Optional: Add a method to get banners by category
exports.getBannersByCategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;

  try {
    const banners = await BannerModel.find({
      maincategoriesData: categoryId
    }).populate({
      path: 'maincategoriesData',
      select: 'mainCategoryName'
    }).sort({ createdAt: -1 });

    if (!banners || banners.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No banners found for category ID: ${categoryId}`
      });
    }

    const transformedBanners = banners.map(banner => ({
      _id: banner._id,
      images: banner.images,
      categoryName: banner.maincategoriesData?.mainCategoryName || 'Unknown Category',
      categoryId: banner.maincategoriesData?._id,
      createdAt: banner.createdAt
    }));

    res.status(200).json({
      success: true,
      message: 'Banners retrieved successfully',
      banners: transformedBanners
    });
  } catch (error) {
    console.error('Error fetching banners by category:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID format'
      });
    }
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching banners',
      error: error.message
    });
  }
});

  
//   get banner by id

exports.getBannerById = asyncHandler(async (req, res) => {
    const { id } = req.params;
  
    try {
      // Validate the ID format
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ message: 'Invalid banner ID format' });
      }
  
      // Fetch the banner by ID
      const banner = await BannerModel.findById(id);
  
      // If no banner is found, return a 404 response
      if (!banner) {
        return res.status(404).json({ message: 'Banner not found' });
      }
  
      // Return the found banner
      res.status(200).json({
        message: 'Banner retrieved successfully',
        banner
      });
    } catch (error) {
      console.error('Error fetching banner:', error);
      res.status(500).json({ message: 'An error occurred while fetching the banner', error });
    }
  });
  


  exports.putBannerById = asyncHandler(async (req, res) => {
    const { id } = req.params;
  
    // Process files if present
    const files = req.files || [];
    const imagePaths = files.map(file => file.path || file.filename);
  
    try {
      // Validate the ID format
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        console.error('Invalid ID format.');
        return res.status(400).json({ message: 'Invalid banner ID format.' });
      }
  
      // Check if the banner exists
      const banner = await BannerModel.findById(id);
      if (!banner) {
        console.error('Banner not found.');
        return res.status(404).json({ message: 'Banner not found.' });
      }
  
      // Prepare the fields to update
      const update = {
        ...(files.length && { images: imagePaths }) // Only update images if new ones are provided
      };
  
      // Update the banner and return the new version
      const updatedBanner = await BannerModel.findByIdAndUpdate(id, { $set: update }, { new: true });
  
      // Return updated banner
      res.status(200).json({
        message: 'Banner updated successfully',
        banner: updatedBanner
      });
    } catch (error) {
      console.error('Error while updating banner:', error);
      res.status(500).json({ message: 'Error while updating banner', error: error.message });
    }
  });
  


exports.deleteBannerById = asyncHandler(async (req, res) => {
    const { id } = req.params;
  
    try {
      // Validate the ID format
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        console.error('Invalid ID format.');
        return res.status(400).json({ message: 'Invalid banner ID format.' });
      }
  
      // Find and delete the banner
      const deletedBanner = await BannerModel.findByIdAndDelete(id);
  
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
  });
  
