const Product = require("../models/productModel");

exports.addProduct = async (req, res) => {

  try {

    const {
      name,
      price,
      oldPrice,
      description,
      hsn,
      sku,
      length,
      width,
      height,
      weight,
      maincategory,
      subcategory,
      sizes
    } = req.body;

    const coverImage = req.file ? req.file.path : "";

    const product = new Product({

      name,
      price,
      oldPrice,
      description,
      hsn,
      sku,
      length,
      width,
      height,
      weight,
      maincategory,
      subcategory,
      coverImage,
      sizes: JSON.parse(sizes)

    });

    await product.save();

    res.status(200).json({
      message: "Product added successfully",
      product
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Error adding product"
    });

  }
};