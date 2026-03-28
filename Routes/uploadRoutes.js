const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { uploadImage } = require('../controller/uploadController');

// Single image upload — Cloudinary storage handles the upload automatically
router.post('/', upload.single('image'), uploadImage);

module.exports = router;
