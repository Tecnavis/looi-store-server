const cloudinary = require('../config/cloudinary');
const fs = require('fs');

/**
 * Upload a local file path to Cloudinary (used for fallback / uploadRoutes)
 */
const uploadToCloudinary = async (filePath, folder = 'looi-store') => {
  const result = await cloudinary.uploader.upload(filePath, { folder });
  // Delete local file after upload
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  return result.secure_url;
};

module.exports = uploadToCloudinary;
