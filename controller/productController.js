
const Product = require('../models/productModel'); 
const asyncHandler = require('express-async-handler');

const generateProductId = () => {
  return `PROD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`; // Generates an ID like "PROD-ABCD12345"
};

// this is save image name
// exports.addProduct = asyncHandler(async (req, res) => {
//   // console.log('Received files:', req.files.map(f => ({ name: f.originalname, fieldname: f.fieldname })));
//   // console.log('Received body:', req.body);

//   // Check if files are uploaded
//   if (!req.files || req.files.length === 0) {
//     return res.status(400).json({ message: 'No images uploaded' });
//   }

//     // Extract the cover image
//     const coverImageFile = req.files.find(file => file.fieldname === 'coverImage');
//     if (!coverImageFile) {
//       return res.status(400).json({ message: 'Cover image is required' });
//     }

//   const {
//     // productId,
//     name,
//     price,
//     sizes, // This will now be a JSON string
//     description,
//     countryOfOrigin,
//     manufacturer,
//     packedBy,
//     commodity,
//     maincategory,
//     subcategory
//   } = req.body;

//   try {
//     // Parse the sizes JSON string
//     const sizeData = JSON.parse(sizes);
//     // console.log('Parsed size data:', JSON.stringify(sizeData, null, 2));

//     // Create the sizes array structure with images
//     const formattedSizes = sizeData.map((size) => {
//       return {
//         size: size.size,
//         colors: size.colors.map((color) => {
//           // Match files based on their fieldnames
//           const colorImages = req.files
//             .filter(file => file.fieldname === 'productImages' && 
//                             file.originalname.startsWith(`size_${size.size}_color_${color.color}_image_`))
//             .map(file => file.filename); // Save the filenames

//           // console.log(`Images for size ${size.size}, color ${color.color}:`, colorImages);

//           return {
//             color: color.color,
//             stock: color.stock,
//             images: colorImages
//           };
//         })
//       };
//     });

//     // console.log('Formatted sizes:', JSON.stringify(formattedSizes, null, 2));
   

//     // Create a new product instance
//     const newProduct = new Product({
//       productId: generateProductId(), // Automatically generate product ID
//       name,
//       price,
//       coverImage: coverImageFile.filename, // Add coverImage filename
//       sizes: formattedSizes,
//       description,
//       countryOfOrigin,
//       manufacturer,
//       packedBy,
//       commodity,
//       maincategory,
//       subcategory
//     });

//     await newProduct.save();

//     return res.status(200).json({
//       message: 'Product added successfully',
//       product: newProduct
//     });
//   } catch (error) {
//     console.error('Error adding product:', error);
//     return res.status(500).json({ message: 'Error adding product', error: error.message });
//   }
// });

exports.addProduct = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'No images uploaded' });
  }

  const coverImageFile = req.files.find(file => file.fieldname === 'coverImage');
  if (!coverImageFile) {
    return res.status(400).json({ message: 'Cover image is required' });
  }

  const {
    name,
    price,
    sizes,
    description,
    countryOfOrigin,
    manufacturer,
    packedBy,
    commodity,
    maincategory,
    subcategory
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
      price,
      coverImage: coverImageFile.filename,
      sizes: formattedSizes,
      description,
      countryOfOrigin,
      manufacturer,
      packedBy,
      commodity,
      maincategory,
      subcategory
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
    const products = await Product.find();

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
    
    const product = await Product.findById(id);

  
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

// first code
// exports.updateProduct = asyncHandler(async (req, res) => {
//   const { id } = req.params;  // Extract product ID from request parameters

//   // Extract the updated product details from req.body
//   const {
//     productId,
//     name,
//     price,
//     size,
//     color,
//     description,
//     countryOfOrigin,
//     manufacturer,
//     packedBy,
//     commodity,
//      stock,
//     maincategory,
//     subcategory
//   } = req.body;

//   console.log(req.body, 'this is the req body');

//   try {
//     // Prepare the updated fields, including images if uploaded
//     const updateFields = {
//       productId,
//       name,
//       price,
//       size,
//       color,
//       description,
//       countryOfOrigin,
//       manufacturer,
//       packedBy,
//       commodity,
//        stock,
//       maincategory,
//       subcategory,
//       ...(req.files ? { images: req.files.map(file => file.filename) } : {}) // Handle uploaded images
//     };

//     // Update the product by ID
//     const updatedProduct = await Product.findByIdAndUpdate(id, updateFields, { new: true, runValidators: true });

//     console.log('Updated Product:', updatedProduct); // Log updated product

//     if (!updatedProduct) {
//       return res.status(404).json({ message: 'Product not found' });
//     }

//     return res.status(200).json({
//       message: 'Product updated successfully',
//       product: updatedProduct
//     });
//   } catch (error) {
//     console.error('Error during update:', error); // Log any errors
//     return res.status(500).json({ message: 'Error updating product', error });
//   }
// });
// in this code we are not updating images,cover image
// exports.updateProduct = asyncHandler(async (req, res) => {
//   const { id } = req.params;  // Extract product ID from request parameters

//   // Extract the updated product details from req.body
//   const {
//     name,
//     price,
//     sizes, // This could be a JSON string or an object
//     description,
//     countryOfOrigin,
//     manufacturer,
//     packedBy,
//     commodity,
//     maincategory,
//     subcategory
//   } = req.body;

//   try {
//     // Check if sizes is a JSON string, if not, assume it's an object
//     let formattedSizes = [];
//     if (sizes) {
//       const sizeData = typeof sizes === 'string' ? JSON.parse(sizes) : sizes; // Check if sizes is a string and parse it if necessary

//       // Create the sizes array structure with images
//       formattedSizes = sizeData.map((size) => {
//         return {
//           size: size.size,
//           colors: size.colors.map((color) => {
//             // Safely check if req.files exists and filter only if there are files uploaded
//             const colorImages = req.files ? req.files
//               .filter(file => file.fieldname === 'productImages' && 
//                               file.originalname.startsWith(`size_${size.size}_color_${color.color}_image_`))
//               .map(file => file.filename) : [];

//             return {
//               color: color.color,
//               stock: color.stock,
//               images: colorImages.length > 0 ? colorImages : color.images // Keep existing images if none are uploaded
//             };
//           })
//         };
//       });
//     }

//     // Prepare the updated fields, including sizes and images if uploaded
//     const updateFields = {
//       name,
//       price,
//       sizes: formattedSizes.length > 0 ? formattedSizes : undefined, // Update sizes if provided
//       description,
//       countryOfOrigin,
//       manufacturer,
//       packedBy,
//       commodity,
//       maincategory,
//       subcategory,
//       ...(req.files ? { images: req.files.map(file => file.filename) } : {}) // Handle other uploaded images if any
//     };

//     // Remove undefined fields (to avoid overwriting existing data with 'undefined')
//     Object.keys(updateFields).forEach(key => {
//       if (updateFields[key] === undefined) delete updateFields[key];
//     });

//     // Update the product by ID
//     const updatedProduct = await Product.findByIdAndUpdate(id, updateFields, { new: true, runValidators: true });

//     if (!updatedProduct) {
//       return res.status(404).json({ message: 'Product not found' });
//     }

//     return res.status(200).json({
//       message: 'Product updated successfully',
//       product: updatedProduct
//     });
//   } catch (error) {
//     console.error('Error during update:', error); // Log any errors
//     return res.status(500).json({ message: 'Error updating product', error: error.message });
//   }
// });
// this save cover and array iamge but in diifernt format blob
// exports.updateProduct = asyncHandler(async (req, res) => {
//   const { id } = req.params;
  
//   const {
//     name,
//     price,
//     sizes,
//     description,
//     countryOfOrigin,
//     manufacturer,
//     packedBy,
//     commodity,
//     maincategory,
//     subcategory
//   } = req.body;

//   try {
//     // Handle sizes and color images
//     let formattedSizes = [];
//     if (sizes) {
//       const sizeData = typeof sizes === 'string' ? JSON.parse(sizes) : sizes;
      
//       formattedSizes = sizeData.map((size) => {
//         return {
//           size: size.size,
//           colors: size.colors.map((color) => {
//             // Handle color-specific images
//             const colorImages = req.files ? req.files
//               .filter(file => file.fieldname.startsWith(`size_${size.size}_color_${color.color}_image_`))
//               .map(file => file.filename) : [];
            
//             return {
//               color: color.color,
//               stock: color.stock,
//               images: colorImages.length > 0 ? colorImages : color.images
//             };
//           })
//         };
//       });
//     }

//     // Handle cover image
//     let coverImage;
//     if (req.files && req.files.find(file => file.fieldname === 'coverImage')) {
//       coverImage = req.files.find(file => file.fieldname === 'coverImage').filename;
//     }

//     // Prepare update fields
//     const updateFields = {
//       name,
//       price,
//       sizes: formattedSizes.length > 0 ? formattedSizes : undefined,
//       description,
//       countryOfOrigin,
//       manufacturer,
//       packedBy,
//       commodity,
//       maincategory,
//       subcategory,
//       ...(coverImage && { coverImage }) // Only add coverImage if it exists
//     };

//     // Remove undefined fields
//     Object.keys(updateFields).forEach(key => {
//       if (updateFields[key] === undefined) delete updateFields[key];
//     });

//     // Update the product
//     const updatedProduct = await Product.findByIdAndUpdate(
//       id, 
//       updateFields, 
//       { new: true, runValidators: true }
//     );

//     if (!updatedProduct) {
//       return res.status(404).json({ message: 'Product not found' });
//     }

//     return res.status(200).json({
//       message: 'Product updated successfully',
//       product: updatedProduct
//     });
//   } catch (error) {
//     console.error('Error during update:', error);
//     return res.status(500).json({ 
//       message: 'Error updating product', 
//       error: error.message 
//     });
//   }
// });

exports.updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
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
          name,
          price,
          sizes: formattedSizes,
          description,
          countryOfOrigin,
          manufacturer,
          packedBy,
          commodity,
          maincategory,
          subcategory,
          ...(coverImage && { coverImage })
      };

      // Remove undefined fields
      Object.keys(updateFields).forEach(key => {
          if (updateFields[key] === undefined) delete updateFields[key];
      });

      const updatedProduct = await Product.findByIdAndUpdate(
          id,
          updateFields,
          { new: true, runValidators: true }
      );

      if (!updatedProduct) {
          return res.status(404).json({ message: 'Product not found' });
      }

      return res.status(200).json({
          message: 'Product updated successfully',
          product: updatedProduct
      });
  } catch (error) {
      console.error('Error during update:', error);
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


const NEW_ARRIVAL_DAYS = 6;

exports.getNewArrivals = asyncHandler(async (req, res) => {
  try {
    // Calculate the date from 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - NEW_ARRIVAL_DAYS);

    // Query to find products created within the last 30 days and sort by newest
    const newArrivals = await Product.find({
      createdAt: { $gte: thirtyDaysAgo }
    }).sort({ createdAt: -1 }); // Sort by most recent

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










