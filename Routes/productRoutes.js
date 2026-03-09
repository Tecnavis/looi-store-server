const express = require("express");
const router = express.Router();

const Product = require("../models/Product");
const upload = require("../middleware/upload"); // your multer/cloudinary middleware

// Create Product
router.post("/create", upload.single("image"), async (req, res) => {
  try {
    const { name, price, category, description, stock } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "Image is required" });
    }

    const product = new Product({
      name,
      price,
      maincategory: category,
      description,
      totalStock: stock || 0,
      coverImage: req.file.path, // Cloudinary URL
      sizes: [],
    });

    await product.save();

    return res.status(201).json({
      message: "Product created",
      product
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Server error"
    });
  }
});

module.exports = router;