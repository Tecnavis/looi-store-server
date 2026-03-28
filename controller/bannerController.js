const asyncHandler = require('express-async-handler');
const BannerModel = require('../models/bannerModel');

exports.postBanner = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'No banner images uploaded' });
  }

  const maincategoriesData = req.body.category;
  if (!maincategoriesData) {
    return res.status(400).json({ message: 'Main category is required' });
  }

  // Use Cloudinary secure_url (file.path) instead of filename
  const imagePaths = req.files.map(file => file.path);

  try {
    const newBanner = new BannerModel({ images: imagePaths, maincategoriesData });
    await newBanner.save();

    const populatedBanner = await BannerModel.findById(newBanner._id)
      .populate('maincategoriesData', 'mainCategoryName');

    return res.status(200).json({ message: 'Banners posted successfully', banner: populatedBanner });
  } catch (error) {
    console.error('Banner save error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid main category ID format' });
    }
    return res.status(500).json({ message: 'Error posting banners', error: error.message, details: error.toString() });
  }
});

exports.getBanner = asyncHandler(async (req, res) => {
  try {
    const banners = await BannerModel.find()
      .populate({ path: 'maincategoriesData', select: 'mainCategoryName' })
      .sort({ createdAt: -1 });

    if (!banners || banners.length === 0) {
      return res.status(404).json({ success: false, message: 'No banners found' });
    }

    const transformedBanners = banners.map(banner => ({
      _id: banner._id,
      images: banner.images,
      categoryName: banner.maincategoriesData?.mainCategoryName || 'Unknown Category',
      categoryId: banner.maincategoriesData?._id,
      createdAt: banner.createdAt
    }));

    res.status(200).json({ success: true, message: 'Banners retrieved successfully', banners: transformedBanners });
  } catch (error) {
    console.error('Error fetching banners:', error);
    res.status(500).json({ success: false, message: 'An error occurred while fetching banners', error: error.message });
  }
});

exports.getBannersByCategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;
  try {
    const banners = await BannerModel.find({ maincategoriesData: categoryId })
      .populate({ path: 'maincategoriesData', select: 'mainCategoryName' })
      .sort({ createdAt: -1 });

    if (!banners || banners.length === 0) {
      return res.status(404).json({ success: false, message: `No banners found for category ID: ${categoryId}` });
    }

    const transformedBanners = banners.map(banner => ({
      _id: banner._id,
      images: banner.images,
      categoryName: banner.maincategoriesData?.mainCategoryName || 'Unknown Category',
      categoryId: banner.maincategoriesData?._id,
      createdAt: banner.createdAt
    }));

    res.status(200).json({ success: true, message: 'Banners retrieved successfully', banners: transformedBanners });
  } catch (error) {
    console.error('Error fetching banners by category:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid category ID format' });
    }
    res.status(500).json({ success: false, message: 'An error occurred while fetching banners', error: error.message });
  }
});

exports.getBannerById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid banner ID format' });
    }
    const banner = await BannerModel.findById(id);
    if (!banner) {
      return res.status(404).json({ message: 'Banner not found' });
    }
    res.status(200).json({ message: 'Banner retrieved successfully', banner });
  } catch (error) {
    console.error('Error fetching banner:', error);
    res.status(500).json({ message: 'An error occurred while fetching the banner', error });
  }
});

exports.putBannerById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const files = req.files || [];
  // Use Cloudinary secure URLs
  const imagePaths = files.map(file => file.path);

  try {
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid banner ID format.' });
    }
    const banner = await BannerModel.findById(id);
    if (!banner) {
      return res.status(404).json({ message: 'Banner not found.' });
    }

    const update = { ...(files.length && { images: imagePaths }) };
    const updatedBanner = await BannerModel.findByIdAndUpdate(id, { $set: update }, { new: true });

    res.status(200).json({ message: 'Banner updated successfully', banner: updatedBanner });
  } catch (error) {
    console.error('Error while updating banner:', error);
    res.status(500).json({ message: 'Error while updating banner', error: error.message });
  }
});

exports.deleteBannerById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid banner ID format.' });
    }
    const deletedBanner = await BannerModel.findByIdAndDelete(id);
    if (!deletedBanner) {
      return res.status(404).json({ message: 'Banner not found.' });
    }
    res.status(200).json({ message: 'Banner deleted successfully', banner: deletedBanner });
  } catch (error) {
    console.error('Error while deleting banner:', error);
    res.status(500).json({ message: 'An error occurred while deleting the banner', error: error.message });
  }
});
