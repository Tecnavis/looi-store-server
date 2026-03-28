const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: 'looi-store',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    };
  },
});

const upload = multer({ storage });

module.exports = upload;
