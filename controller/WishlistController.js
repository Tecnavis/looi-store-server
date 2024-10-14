const Wishlist=require('../models/wishlistModel')
const Product=require('../models/productModel')
const Cart=require('../models/cartModel')
const asyncHandler = require('express-async-handler');

// Add product to wishlist
// exports.addToWishlist = async (req, res) => {
//   try {
//     const productId = req.params.productId;
//     const userId = req.user._id;

//     // Validate productId
//     if (!productId) {
//       return res.status(400).json({ message: 'ProductId is required' });
//     }

//     // Find the product
//     const product = await Product.findById(productId);
//     if (!product) {
//       return res.status(404).json({ message: 'Product not found' });
//     }

//     // Find user's wishlist
//     let wishlist = await Wishlist.findOne({ userId: userId });
//     if (!wishlist) {
//       wishlist = new Wishlist({
//         userId: userId,
//         products: [],
//       });
//     }

//     // Check if product already exists in the wishlist
//     const existingProductIndex = wishlist.products.findIndex(item =>
//       item.productId.toString() === productId
//     );

//     if (existingProductIndex >= 0) {
//       return res.status(400).json({ message: 'Product already in wishlist' });
//     } else {
//       // Add product to wishlist
//       wishlist.products.push({ productId });
//     }

//     // Save the updated wishlist
//     const savedWishlist = await wishlist.save();
    
//     res.status(200).json({
//       message: 'Product added to wishlist successfully',
//       wishlist: await savedWishlist.populate('products.productId')
//     });

//   } catch (error) {
//     console.error('Wishlist Error:', error);
//     if (error.name === 'ValidationError') {
//       return res.status(400).json({ 
//         message: 'Validation error', 
//         errors: error.errors 
//       });
//     }
//     res.status(500).json({ 
//       message: 'Error adding to wishlist', 
//       error: error.message 
//     });
//   }
// };

exports.addToWishlist = async (req, res) => {
  try {
    const productId = req.params.productId;
    const userId = req.user._id;

    if (!productId) {
      return res.status(400).json({ message: 'ProductId is required' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    let wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      wishlist = new Wishlist({ userId, products: [] });
    }

    const productExists = wishlist.products.some(
      item => item.productId.toString() === productId
    );

    if (productExists) {
      return res.status(400).json({ message: 'Product already in wishlist' });
    } else {
      wishlist.products.push({ productId });
    }

    const savedWishlist = await wishlist.save();

    res.status(200).json({
      message: 'Product added to wishlist successfully',
      wishlist: await savedWishlist.populate('products.productId'),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error adding to wishlist', error: error.message });
  }
};

//  get wishlist
exports.getWishlist = async (req, res) => {
  try {
    const userId = req.user._id;
    const wishlist = await Wishlist.findOne({ userId: userId }).populate('products.productId');
    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }
    res.status(200).json({ wishlist });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving wishlist', error: error.message });
  }
}


// delete wishlist
// exports.deleteWishlist = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const wishlist = await Wishlist.findOneAndDelete({ userId: userId });
//     if (!wishlist) {
//       return res.status(404).json({ message: 'Wishlist not found' });
//     }
//     res.status(200).json({ message: 'Wishlist deleted successfully' });
//   } catch (error) {
//     res.status(500).json({ message: 'Error deleting wishlist', error: error.message });
//   }
// }

// Delete a single product from the wishlist
exports.deleteWishlistProduct = async (req, res) => {
  try {
    const userId = req.user._id;
    const productId = req.params.productId;

    if (!productId) {
      return res.status(400).json({ message: 'ProductId is required' });
    }

    // Find the user's wishlist
    const wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }

    // Check if the product exists in the wishlist
    const productIndex = wishlist.products.findIndex(
      item => item.productId.toString() === productId
    );

    if (productIndex === -1) {
      return res.status(404).json({ message: 'Product not found in wishlist' });
    }

    // Remove the product from the wishlist
    wishlist.products.splice(productIndex, 1);

    // Save the updated wishlist
    await wishlist.save();

    res.status(200).json({
      message: 'Product removed from wishlist successfully',
      wishlist: await wishlist.populate('products.productId'),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error removing product from wishlist', error: error.message });
  }
};


// move from wishlist to cart
// exports.moveWishlistToCart = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const productId = req.params.productId;  // If you are moving specific products

//     // Find the user's wishlist
//     const wishlist = await Wishlist.findOne({ userId });
//     if (!wishlist || wishlist.products.length === 0) {
//       return res.status(404).json({ message: 'Wishlist not found or empty' });
//     }

//     // Find or create user's cart
//     let cart = await Cart.findOne({ user: userId });
//     if (!cart) {
//       cart = new Cart({ user: userId, items: [] });
//     }

//     // If moving the entire wishlist to the cart
//     if (!productId) {
//       for (const wishlistItem of wishlist.products) {
//         const product = await Product.findById(wishlistItem.productId);

//         if (!product) {
//           return res.status(404).json({ message: `Product not found for ID: ${wishlistItem.productId}` });
//         }

//         // Check if the product already exists in the cart
//         const existingItemIndex = cart.items.findIndex(item => 
//           item.product.toString() === wishlistItem.productId.toString()
//         );

//         const cartItem = {
//           product: wishlistItem.productId,
//           productName: product.name,
//           price: product.price,
//           coverImage: product.coverImage,
//           color: wishlistItem.color || product.defaultColor,
//           size: wishlistItem.size || product.defaultSize,
//           quantity: wishlistItem.quantity || 1,
//         };

//         if (existingItemIndex >= 0) {
//           // Update quantity if the item exists in the cart
//           cart.items[existingItemIndex].quantity += 1;
//         } else {
//           // Add new item to cart
//           cart.items.push(cartItem);
//         }
//       }

//       // Clear the wishlist after moving items
//       await Wishlist.deleteOne({ userId });

//     } else {
//       // Move only a specific product from the wishlist
//       const wishlistItem = wishlist.products.find(item => item.productId.toString() === productId);

//       if (!wishlistItem) {
//         return res.status(404).json({ message: 'Product not found in wishlist' });
//       }

//       const product = await Product.findById(wishlistItem.productId);
//       if (!product) {
//         return res.status(404).json({ message: 'Product not found' });
//       }

//       const cartItem = {
//         product: wishlistItem.productId,
//         productName: product.name,
//         price: product.price,
//         coverImage: product.coverImage,
//         color: wishlistItem.color || product.defaultColor,
//         size: wishlistItem.size || product.defaultSize,
//         quantity: wishlistItem.quantity || 1,
//       };

//       const existingItemIndex = cart.items.findIndex(item => 
//         item.product.toString() === wishlistItem.productId.toString()
//       );

//       if (existingItemIndex >= 0) {
//         cart.items[existingItemIndex].quantity += 1;
//       } else {
//         cart.items.push(cartItem);
//       }

//       // Remove the specific product from wishlist
//       wishlist.products = wishlist.products.filter(item => item.productId.toString() !== productId);
//       await wishlist.save();
//     }

//     // Save the updated cart
//     await cart.save();
//     res.status(200).json({ message: 'Wishlist moved to cart successfully', cart });

//   } catch (error) {
//     console.error('Error moving wishlist to cart:', error);
//     res.status(500).json({ message: 'Error moving wishlist to cart', error: error.message });
//   }
// };