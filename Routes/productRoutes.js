const express = require("express");
const router = express.Router();

const Product = require("../models/productModel");
const upload = require("../middleware/uploadCloudinary");

// CREATE PRODUCT
router.post("/add", upload.single("coverImage"), async (req, res) => {
  try {

    const sizes = JSON.parse(req.body.sizes || "[]");

    const product = new Product({
      name: req.body.name,
      price: req.body.price,
      oldPrice: req.body.oldPrice,
      description: req.body.description,

      hsn: req.body.hsn,
      sku: req.body.sku,

      length: req.body.length,
      width: req.body.width,
      height: req.body.height,
      weight: req.body.weight,

      maincategory: req.body.maincategory,
      subcategory: req.body.subcategory,

      coverImage: req.file?.path || "",

      sizes
    });

    await product.save();

    res.status(201).json({
      success: true,
      product
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Product creation failed"
    });

  }
});


// GET ALL PRODUCTS
router.get("/", async (req, res) => {

  const products = await Product
  .find()
  .populate("maincategory")
  .populate("subcategory");

  res.json({
    success:true,
    products
  });

});

module.exports = router;