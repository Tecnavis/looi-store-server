const Product = require('../models/productModel');
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

const generateProductId = () => {
  return `PROD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
};

exports.addProduct = asyncHandler(async (req, res) => {
  console.log('Request body:', req.body);
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'No images uploaded' });
  }

  const coverImageFile = req.files.find(file => file.fieldname === 'coverImage');
  if (!coverImageFile) {
    return res.status(400).json({ message: 'Cover image is required' });
  }

  const {
    name, oldPrice, price, sizes, description,
    countryOfOrigin, manufacturer, packedBy, commodity,
    maincategory, subcategory, hsn, sku, height, width, length, weight,
  } = req.body;

  try {
    const sizeData = JSON.parse(sizes);

    const formattedSizes = sizeData.map((size) => ({
      size: size.size,
      colors: size.colors.map((color) => ({
        color: color.color,
        stock: color.stock,
        // Store Cloudinary secure_url (file.path) instead of filename
        images: req.files
          .filter(file =>
            file.fieldname === 'productImages' &&
            file.originalname.startsWith(`size_${size.size}_color_${color.color}_image_`)
          )
          .map(file => file.path)
      }))
    }));

    const newProduct = new Product({
      productId: generateProductId(),
      name,
      oldPrice,
      price,
      // Store Cloudinary URL for cover image
      coverImage: coverImageFile.path,
      sizes: formattedSizes,
      description,
      countryOfOrigin,
      manufacturer,
      packedBy,
      commodity,
      maincategory,
      subcategory,
      hsn,
      sku,
      height,
      width,
      length,
      weight
    });

    const savedProduct = await newProduct.save();
    return res.status(200).json({ message: 'Product added successfully', product: savedProduct });
  } catch (error) {
    console.error('Error adding product:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    return res.status(500).json({ message: 'Error adding product', error: error.message });
  }
});

exports.getAllProducts = asyncHandler(async (req, res) => {
  try {
    const products = await Product.find();
    if (!products || products.length === 0) {
      return res.status(404).json({ message: 'No products found' });
    }
    return res.status(200).json({ message: 'Products retrieved successfully', products });
  } catch (error) {
    return res.status(500).json({ message: 'Error retrieving products', error });
  }
});

exports.getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const product = await Product.findById(id).populate('subcategory');
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    return res.status(200).json({ message: 'Product retrieved successfully', product });
  } catch (error) {
    return res.status(500).json({ message: 'Error retrieving product', error });
  }
});

exports.updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  let {
    name, price, sizes: sizesJson, description,
    countryOfOrigin, manufacturer, packedBy, commodity,
    maincategory, subcategory,
    length, width, height, weight
  } = req.body;

  try {
    console.log('Received subcategory:', subcategory, typeof subcategory);

    let subcategoryId;
    if (subcategory) {
      try {
        if (typeof subcategory === 'string' && subcategory.startsWith('{')) {
          subcategory = JSON.parse(subcategory);
        }
        if (typeof subcategory === 'object' && subcategory._id) {
          subcategoryId = subcategory._id;
        } else if (
          typeof subcategory === 'string' &&
          subcategory !== '[object Object]' &&
          mongoose.Types.ObjectId.isValid(subcategory)
        ) {
          subcategoryId = subcategory;
        } else {
          const existingProduct = await Product.findById(id);
          if (existingProduct && existingProduct.subcategory) {
            subcategoryId = existingProduct.subcategory;
          } else {
            return res.status(400).json({
              message: 'Invalid subcategory format and no existing subcategory found',
              receivedValue: subcategory
            });
          }
        }
      } catch (parseError) {
        console.error('Error parsing subcategory:', parseError);
        const existingProduct = await Product.findById(id);
        if (existingProduct && existingProduct.subcategory) {
          subcategoryId = existingProduct.subcategory;
        } else {
          return res.status(400).json({
            message: 'Invalid subcategory format and no existing subcategory found',
            receivedValue: subcategory
          });
        }
      }
    }

    let formattedSizes = [];
    if (sizesJson) {
      const sizesData = JSON.parse(sizesJson);
      formattedSizes = sizesData.map(size => ({
        size: size.size,
        colors: size.colors.map(color => {
          // New uploaded images will have Cloudinary URLs (file.path)
          const newImages = req.files
            ? req.files
                .filter(file => file.fieldname.startsWith(`size_${size.size}_color_${color.color}_image_`))
                .map(file => file.path)
            : [];
          const finalImages = newImages.length > 0 ? newImages : color.images;
          return { color: color.color, stock: color.stock, images: finalImages };
        })
      }));
    }

    // Handle cover image update
    let coverImage;
    if (req.files && req.files.find(file => file.fieldname === 'coverImage')) {
      coverImage = req.files.find(file => file.fieldname === 'coverImage').path;
    }

    const updateFields = {
      ...(name && { name }),
      ...(price && { price: Number(price) }),
      ...(coverImage && { coverImage }),
      ...(formattedSizes.length > 0 && { sizes: formattedSizes }),
      ...(description && { description }),
      ...(countryOfOrigin && { countryOfOrigin }),
      ...(manufacturer && { manufacturer }),
      ...(packedBy && { packedBy }),
      ...(commodity && { commodity }),
      ...(maincategory && { maincategory }),
      ...(subcategoryId && { subcategory: subcategoryId }),
      ...(length !== undefined && length !== '' && { length: Number(length) }),
      ...(width !== undefined && width !== '' && { width: Number(width) }),
      ...(height !== undefined && height !== '' && { height: Number(height) }),
      ...(weight !== undefined && weight !== '' && { weight: Number(weight) }),
    };

    console.log('Update fields:', updateFields);

    const updatedProduct = await Product.findByIdAndUpdate(id, updateFields, {
      new: true,
      runValidators: true
    }).populate('subcategory');

    if (!updatedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    return res.status(200).json({ message: 'Product updated successfully', product: updatedProduct });
  } catch (error) {
    console.error('Error during update:', error);
    if (error instanceof SyntaxError) {
      return res.status(400).json({ message: 'Invalid JSON format in sizes data', error: error.message });
    }
    return res.status(500).json({ message: 'Error updating product', error: error.message });
  }
});

exports.deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const deletedProduct = await Product.findByIdAndDelete(id);
    if (!deletedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }
    return res.status(200).json({ message: 'Product deleted successfully', product: deletedProduct });
  } catch (error) {
    return res.status(500).json({ message: 'Error deleting product', error });
  }
});

const NEW_ARRIVAL_DAYS = 30;

exports.getNewArrivals = asyncHandler(async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - NEW_ARRIVAL_DAYS);
    const searchQuery = req.query.search || '';
    const newArrivals = await Product.find({
      createdAt: { $gte: thirtyDaysAgo },
      name: { $regex: searchQuery, $options: 'i' }
    }).sort({ createdAt: -1 }).populate('subcategory');

    if (!newArrivals || newArrivals.length === 0) {
      return res.status(404).json({ message: 'No new arrivals found' });
    }
    return res.status(200).json({ message: 'New arrivals retrieved successfully', products: newArrivals });
  } catch (error) {
    return res.status(500).json({ message: 'Error retrieving new arrivals', error });
  }
});

exports.getProductAndSimilar = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const product = await Product.findById(id).populate('subcategory');
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    const similarProducts = await Product.find({
      subcategory: product.subcategory._id,
      _id: { $ne: product._id }
    }).limit(5);

    return res.status(200).json({
      message: 'Product and similar products retrieved successfully',
      product,
      similarProducts
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error retrieving similar products', error });
  }
});