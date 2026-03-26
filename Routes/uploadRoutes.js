const express = require("express");
const multer = require("multer");
const cloudinary = require("../config/cloudinary"); // ✅ FIXED
const fs = require("fs");

const router = express.Router();

// temp storage
const upload = multer({ dest: "uploads/" });

router.post("/", upload.single("image"), async (req, res) => {
  try {
    // ✅ check file exists
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    // ✅ upload to cloudinary using file path
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "looi-products",
    });

    // ✅ delete local file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      url: result.secure_url, // 🔥 match frontend
    });

  } catch (error) {
    console.error("UPLOAD ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;