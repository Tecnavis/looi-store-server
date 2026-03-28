// This controller handles single image uploads via the /upload route.
// Since multer-storage-cloudinary is now used, the file is already uploaded
// to Cloudinary by the time this handler runs. We just return the secure URL.

exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // file.path is the Cloudinary secure_url when using multer-storage-cloudinary
    res.status(200).json({
      success: true,
      url: req.file.path,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Upload failed' });
  }
};
