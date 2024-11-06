
const Product = require('../models/productModel'); 
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

const generateProductId = () => {
  return `PROD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`; // Generates an ID like "PROD-ABCD12345"
};

// exports.addProduct = asyncHandler(async (req, res) => {
//   console.log('Request body:', req.body);
//   if (!req.files || req.files.length === 0) {
//     return res.status(400).json({ message: 'No images uploaded' });
//   }

//   const coverImageFile = req.files.find(file => file.fieldname === 'coverImage');
//   if (!coverImageFile) {
//     return res.status(400).json({ message: 'Cover image is required' });
//   }
  
//   const {
//     name,
//     oldPrice,
//     price,
//     sizes,
//     description,
//     countryOfOrigin,
//     manufacturer,
//     packedBy,
//     commodity,
//     maincategory,
//     subcategory,
//     hsn, 
//     sku, 
//     dimensions 
//   } = req.body;

//   try {
//     const sizeData = JSON.parse(sizes);
//     const dimensionData = JSON.parse(dimensions);

//     const formattedSizes = sizeData.map((size) => ({
//       size: size.size,
//       colors: size.colors.map((color) => ({
//         color: color.color,
//         stock: color.stock,
//         images: req.files
//           .filter(file => file.fieldname === 'productImages' && 
//                           file.originalname.startsWith(`size_${size.size}_color_${color.color}_image_`))
//           .map(file => file.filename)
//       }))
//     }));
   
//     const newProduct = new Product({
//       productId: generateProductId(),
//       name,
//       oldPrice,
//       price,
//       coverImage: coverImageFile.filename,
//       sizes: formattedSizes,
//       description,
//       countryOfOrigin,
//       manufacturer,
//       packedBy,
//       commodity,
//       maincategory,
//       subcategory,
//       hsn,
//       sku,
//       dimensions: dimensionData
//     });

//     const savedProduct = await newProduct.save();

//     return res.status(200).json({
//       message: 'Product added successfully',
//       product: savedProduct
//     });
//   } catch (error) {
//     console.error('Error adding product:', error);
//     if (error.name === 'ValidationError') {
//       return res.status(400).json({ message: 'Validation error', errors: error.errors });
//     }
//     return res.status(500).json({ message: 'Error adding product', error: error.message });
//   }
// });

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
    name,
    oldPrice,
    price,
    sizes,
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
    weight,
    
  } = req.body;

  try {
    const sizeData = JSON.parse(sizes);

    const formattedSizes = sizeData.map((size) => ({
      size: size.size,
      colors: size.colors.map((color) => ({
        color: color.color,
        stock: color.stock,
        images: req.files
          .filter(file => file.fieldname === 'productImages' &&
            file.originalname.startsWith(`size_${size.size}_color_${color.color}_image_`))
          .map(file => file.filename)
      }))
    }));

    const newProduct = new Product({
      productId: generateProductId(),
      name,
      oldPrice,
      price,
      coverImage: coverImageFile.filename,
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

    return res.status(200).json({
      message: 'Product added successfully',
      product: savedProduct
    });
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
    // Retrieve all products from the database
    const products = await Product.find()
  
    
    // Check if products were found
    if (!products || products.length === 0) {
      return res.status(404).json({ message: 'No products found' });
    }

    // Return the list of products
    return res.status(200).json({
      message: 'Products retrieved successfully',
      products
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error retrieving products', error });
  }
});

// get product by id
exports.getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;  

  try {
    
    const product = await Product.findById(id)
    .populate('subcategory');

  
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    return res.status(200).json({
      message: 'Product retrieved successfully',
      product
    });
  } catch (error) {
   
    return res.status(500).json({ message: 'Error retrieving product', error });
  }
});



// exports.updateProduct = asyncHandler(async (req, res) => {
//   const { id } = req.params;
//   const {
//       name,
//       price,
//       sizes: sizesJson,
//       description,
//       countryOfOrigin,
//       manufacturer,
//       packedBy,
//       commodity,
//       maincategory,
//       subcategory
//   } = req.body;

//   try {
//       let formattedSizes = [];
//       if (sizesJson) {
//           const sizesData = JSON.parse(sizesJson);
          
//           formattedSizes = sizesData.map(size => {
//               return {
//                   size: size.size,
//                   colors: size.colors.map(color => {
//                       // Find new uploaded images for this color
//                       const newImages = req.files ? req.files
//                           .filter(file => file.fieldname.startsWith(`size_${size.size}_color_${color.color}_image_`))
//                           .map(file => file.filename) : [];
                      
//                       // If new images were uploaded, replace the existing ones
//                       // If no new images, keep the existing ones
//                       const finalImages = newImages.length > 0 ? newImages : color.images;
                      
//                       return {
//                           color: color.color,
//                           stock: color.stock,
//                           images: finalImages
//                       };
//                   })
//               };
//           });
//       }

//       // Handle cover image
//       let coverImage;
//       if (req.files && req.files.find(file => file.fieldname === 'coverImage')) {
//           coverImage = req.files.find(file => file.fieldname === 'coverImage').filename;
//       }

//       const updateFields = {
//           name,
//           price,
//           sizes: formattedSizes,
//           description,
//           countryOfOrigin,
//           manufacturer,
//           packedBy,
//           commodity,
//           maincategory,
//           subcategory,
//           ...(coverImage && { coverImage })
//       };

//       // Remove undefined fields
//       Object.keys(updateFields).forEach(key => {
//           if (updateFields[key] === undefined) delete updateFields[key];
//       });

//       const updatedProduct = await Product.findByIdAndUpdate(
//           id,
//           updateFields,
//           { new: true, runValidators: true }
//       );

//       if (!updatedProduct) {
//           return res.status(404).json({ message: 'Product not found' });
//       }

//       return res.status(200).json({
//           message: 'Product updated successfully',
//           product: updatedProduct
//       });
//   } catch (error) {
//       console.error('Error during update:', error);
//       return res.status(500).json({
//           message: 'Error updating product',
//           error: error.message
//       });
//   }
// });


exports.updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  let {
      name,
      price,
      sizes: sizesJson,
      description,
      countryOfOrigin,
      manufacturer,
      packedBy,
      commodity,
      maincategory,
      subcategory
  } = req.body;

  try {
      // Debug log to see what we're receiving
      console.log('Received subcategory:', subcategory, typeof subcategory);

      // Handle subcategory - parse it if it's a stringified object
      let subcategoryId;
      if (subcategory) {
          try {
              // If it's a stringified object, try to parse it
              if (typeof subcategory === 'string' && subcategory.startsWith('{')) {
                  subcategory = JSON.parse(subcategory);
              }

              // Now handle different cases
              if (typeof subcategory === 'object' && subcategory._id) {
                  subcategoryId = subcategory._id;
              } else if (typeof subcategory === 'string' && 
                       subcategory !== '[object Object]' && 
                       mongoose.Types.ObjectId.isValid(subcategory)) {
                  subcategoryId = subcategory;
              } else {
                  // If we can't get a valid ID, try to fetch the existing product
                  // and use its current subcategory ID
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
              // If parsing fails, try to fetch the existing product
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
          
          formattedSizes = sizesData.map(size => {
              return {
                  size: size.size,
                  colors: size.colors.map(color => {
                      // Find new uploaded images for this color
                      const newImages = req.files ? req.files
                          .filter(file => file.fieldname.startsWith(`size_${size.size}_color_${color.color}_image_`))
                          .map(file => file.filename) : [];
                      
                      // If new images were uploaded, replace the existing ones
                      // If no new images, keep the existing ones
                      const finalImages = newImages.length > 0 ? newImages : color.images;
                      
                      return {
                          color: color.color,
                          stock: color.stock,
                          images: finalImages
                      };
                  })
              };
          });
      }

      // Handle cover image
      let coverImage;
      if (req.files && req.files.find(file => file.fieldname === 'coverImage')) {
          coverImage = req.files.find(file => file.fieldname === 'coverImage').filename;
      }

      const updateFields = {
          ...(name && { name }),
          ...(price && { price: Number(price) }),
          ...(formattedSizes.length > 0 && { sizes: formattedSizes }),
          ...(description && { description }),
          ...(countryOfOrigin && { countryOfOrigin }),
          ...(manufacturer && { manufacturer }),
          ...(packedBy && { packedBy }),
          ...(commodity && { commodity }),
          ...(maincategory && { maincategory }),
          // Only include subcategory if we have a valid ID
          ...(subcategoryId && { subcategory: subcategoryId })
      };

      // Log the final update fields for debugging
      console.log('Update fields:', updateFields);

      const updatedProduct = await Product.findByIdAndUpdate(
          id,
          updateFields,
          { new: true, runValidators: true }
      ).populate('subcategory');

      if (!updatedProduct) {
          return res.status(404).json({
              message: 'Product not found'
          });
      }

      return res.status(200).json({
          message: 'Product updated successfully',
          product: updatedProduct
      });
  } catch (error) {
      console.error('Error during update:', error);
      
      if (error instanceof SyntaxError) {
          return res.status(400).json({
              message: 'Invalid JSON format in sizes data',
              error: error.message
          });
      }
      
      return res.status(500).json({
          message: 'Error updating product',
          error: error.message
      });
  }
});

// delete by id
exports.deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params; 

  try {
    // Find the product by id and delete it
    const deletedProduct = await Product.findByIdAndDelete(id);

    // If no product is found, return 404
    if (!deletedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Return success message if deletion is successful
    return res.status(200).json({
      message: 'Product deleted successfully',
      product: deletedProduct
    });
  } catch (error) {
    // Handle errors (e.g., invalid id format or other errors)
    return res.status(500).json({ message: 'Error deleting product', error });
  }
});


const NEW_ARRIVAL_DAYS = 30;

exports.getNewArrivals = asyncHandler(async (req, res) => {
  try {
    // Calculate the date from 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - NEW_ARRIVAL_DAYS);

    // Query to find products created within the last 30 days and sort by newest
    const newArrivals = await Product.find({
      createdAt: { $gte: thirtyDaysAgo }
    }).sort({ createdAt: -1 })
    .populate('subcategory');

    // Check if any new products are found
    if (!newArrivals || newArrivals.length === 0) {
      return res.status(404).json({ message: 'No new arrivals found' });
    }

    // Return the new arrivals
    return res.status(200).json({
      message: 'New arrivals retrieved successfully',
      products: newArrivals
    });
  } catch (error) {
    // Handle errors
    return res.status(500).json({ message: 'Error retrieving new arrivals', error });
  }
});



// simlar products

exports.getProductAndSimilar = asyncHandler(async (req, res) => {
  const { id } = req.params; // Get the product ID from the request params

  try {
    // Step 1: Find the clicked product by ID and populate subcategory
    const product = await Product.findById(id).populate('subcategory');

    // If the product is not found
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Step 2: Find similar products by subcategory
    const similarProducts = await Product.find({
      subcategory: product.subcategory._id, // Use the subcategory of the clicked product
      _id: { $ne: product._id }, // Exclude the current product
    }).limit(5); // Optional: limit the number of similar products returned

    // Step 3: Return the product and similar products
    return res.status(200).json({
      message: 'Product and similar products retrieved successfully',
      product,           // The clicked product
      similarProducts,   // List of similar products
    });
  } catch (error) {
    // Handle errors
    return res.status(500).json({ message: 'Error retrieving similar products', error });
  }
});










