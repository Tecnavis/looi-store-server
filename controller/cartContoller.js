const Cart=require('../models/cartModel')
const Product=require('../models/productModel')
const asyncHandler = require('express-async-handler');


// exports.addToCart = async (req, res) => {
//   try {
//     const { size, color, quantity } = req.body;
//     const productId = req.params.productId;
//     const userId = req.user._id;

//     // Validate required fields
//     if (!productId || !size || !color || !quantity) {
//       return res.status(400).json({ 
//         message: 'ProductId, size, color, and quantity are required' 
//       });
//     }

//     // Find the product
//     const product = await Product.findById(productId);
//     if (!product) {
//       return res.status(404).json({ message: 'Product not found' });
//     }

//     // Find user's cart
//     let cart = await Cart.findOne({ user: userId });
//     if (!cart) {
//       cart = new Cart({
//         user: userId,
//         items: []
//       });
//     }

//     // Update existing items to ensure they all have coverImage
//     const updatedItems = await Promise.all(cart.items.map(async (item) => {
//       if (!item.coverImage) {
//         const itemProduct = await Product.findById(item.product);
//         if (itemProduct && itemProduct.coverImage) {
//           item.coverImage = itemProduct.coverImage;
//         }
//       }
//       return item;
//     }));
//     cart.items = updatedItems;

//     // Prepare the new item data
//     const itemData = {
//       product: productId,
//       productName: product.name,
//       coverImage: product.coverImage,
//       size,
//       color,
//       quantity,
//       price: product.price,
//       hsn,
//       sku,
//       length,
//       width,
//       height,
//       weight
//     };

//     // Check if item exists in cart
//     const existingItemIndex = cart.items.findIndex(item =>
//       item.product.toString() === productId &&
//       item.size === size &&
//       item.color === color
//     );

//     if (existingItemIndex >= 0) {
//       cart.items[existingItemIndex].quantity += quantity;
//     } else {
//       cart.items.push(itemData);
//     }

//     // Calculate total price
//     cart.totalPrice = cart.items.reduce((total, item) => {
//       return total + (item.price * item.quantity);
//     }, 0);

//     // Save the updated cart
//     const savedCart = await cart.save();
    
//     res.status(200).json({
//       message: 'Product added to cart successfully',
//       cart: await savedCart.populate('items.product')
//     });

//   } catch (error) {
//     console.error('Cart Error:', error);
//     if (error.name === 'ValidationError') {
//       return res.status(400).json({ 
//         message: 'Validation error', 
//         errors: error.errors 
//       });
//     }
//     res.status(500).json({ 
//       message: 'Error adding to cart', 
//       error: error.message 
//     });
//   }
// };

// Get user cart

exports.addToCart = async (req, res) => {
  try {
    const { size, color, quantity } = req.body;
    const productId = req.params.productId;
    const userId = req.user._id;

    // Validate required fields
    if (!productId || !size || !color || !quantity) {
      return res.status(400).json({ 
        message: 'ProductId, size, color, and quantity are required' 
      });
    }

    // Find the product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Destructure additional details from the product
    const { hsn, sku, length, width, height, weight } = product;

    // Find user's cart
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({
        user: userId,
        items: []
      });
    }

    // Update existing items to ensure they all have coverImage
    const updatedItems = await Promise.all(cart.items.map(async (item) => {
      if (!item.coverImage) {
        const itemProduct = await Product.findById(item.product);
        if (itemProduct && itemProduct.coverImage) {
          item.coverImage = itemProduct.coverImage;
        }
      }
      return item;
    }));
    cart.items = updatedItems;

    // Prepare the new item data
    const itemData = {
      product: productId,
      productId,
      productName: product.name,
      coverImage: product.coverImage,
      size,
      color,
      quantity,
      price: product.price,
      hsn,
      sku,
      length,
      width,
      height,
      weight
    };

    // Check if item exists in cart
    const existingItemIndex = cart.items.findIndex(item =>
      item.product.toString() === productId &&
      item.size === size &&
      item.color === color
    );

    if (existingItemIndex >= 0) {
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      cart.items.push(itemData);
    }

    // Calculate total price
    cart.totalPrice = cart.items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);

    // Save the updated cart
    const savedCart = await cart.save();
    
    res.status(200).json({
      message: 'Product added to cart successfully',
      cart: await savedCart.populate('items.product')
    });

  } catch (error) {
    console.error('Cart Error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: error.errors 
      });
    }
    res.status(500).json({ 
      message: 'Error adding to cart', 
      error: error.message 
    });
  }
};


exports.getCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const cart = await Cart.findOne({ user: userId }).populate('items.product', 'name');
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }
    res.status(200).json({ cart });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving cart', error: error.message });
  }
};

// update cart
// exports.updateCart = async (req, res) => {
//   try {
//     const { size, color, quantity } = req.body;
//     const productId = req.params.productId;
//     const userId = req.user._id;

//     // Validate required fields
//     if (!productId || !size || !color || !quantity) {
//       return res.status(400).json({
//         message: 'ProductId, size, color, and quantity are required'
//       });
//     }

//     // Find the user's cart
//     let cart = await Cart.findOne({ user: userId });
//     if (!cart) {
//       return res.status(404).json({ message: 'Cart not found' });
//     }

//     // Find the item in the cart
//     const itemIndex = cart.items.findIndex(item =>
//       item.product.toString() === productId &&
//       item.size === size &&
//       item.color === color
//     );

//     if (itemIndex < 0) {
//       return res.status(404).json({ message: 'Item not found in cart' });
//     }

//     // Update item quantity
//     cart.items[itemIndex].quantity = quantity;

//     // If needed, update size or color
//     if (req.body.newSize) {
//       cart.items[itemIndex].size = req.body.newSize;
//     }
//     if (req.body.newColor) {
//       cart.items[itemIndex].color = req.body.newColor;
//     }

//     // Remove item if quantity is set to 0
//     if (quantity <= 0) {
//       cart.items.splice(itemIndex, 1);
//     }

//     // Recalculate total price
//     cart.totalPrice = cart.items.reduce((total, item) => {
//       return total + (item.price * item.quantity);
//     }, 0);

//     // Save the updated cart
//     const updatedCart = await cart.save();

//     res.status(200).json({
//       message: 'Cart updated successfully',
//       cart: await updatedCart.populate('items.product')
//     });

//   } catch (error) {
//     console.error('Update Cart Error:', error);
//     if (error.name === 'ValidationError') {
//       return res.status(400).json({
//         message: 'Validation error',
//         errors: error.errors
//       });
//     }
//     res.status(500).json({
//       message: 'Error updating cart',
//       error: error.message
//     });
//   }
// };

exports.updateCart = async (req, res) => {
  try {
    const { size, quantity } = req.body;
    const productId = req.params.productId;
    const userId = req.user._id; // Assuming you have user information from authentication

    // Validate required fields
    if (!productId || !size || !quantity) {
      return res.status(400).json({
        message: 'ProductId, size, and quantity are required'
      });
    }

    // Find the user's cart
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    // Find the item in the cart by productId and size
    const itemIndex = cart.items.findIndex(item =>
      item.product.toString() === productId && item.size === size
    );

    if (itemIndex < 0) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    // Update the item quantity
    cart.items[itemIndex].quantity = quantity;

    // Remove the item if quantity is set to 0
    if (quantity <= 0) {
      cart.items.splice(itemIndex, 1);
    }

    // Recalculate the total price of the cart
    cart.totalPrice = cart.items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);

    // Save the updated cart
    const updatedCart = await cart.save();

    res.status(200).json({
      message: 'Cart updated successfully',
      cart: await updatedCart.populate('items.product')
    });

  } catch (error) {
    console.error('Update Cart Error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Validation error',
        errors: error.errors
      });
    }
    res.status(500).json({
      message: 'Error updating cart',
      error: error.message
    });
  }
};




exports.deleteCart = async (req, res) => {
  try {
    const userId = req.user._id; // Assuming user ID is stored in req.user
    const productId = req.params.productId;

    // Check if productId is provided
    if (!productId) {
      return res.status(400).json({ message: 'ProductId is required' });
    }

    // Find the user's cart
    const cart = await Cart.findOne({ user: userId });

    // Check if cart exists
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    // Check if the product exists in the cart
    const productIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );

    // If product not found in cart
    if (productIndex === -1) {
      return res.status(404).json({ message: 'Product not found in cart' });
    }

    // Remove the product from the cart
    cart.items.splice(productIndex, 1);

    // Save the updated cart
    await cart.save();

    // Optionally, you can populate the cart items if needed
    const updatedCart = await cart.populate('items.product');

    res.status(200).json({
      message: 'Product removed from cart successfully',
      cart: updatedCart,
    });
  } catch (error) {
    console.error('Error removing product from cart:', error);
    res.status(500).json({ message: 'Error removing product from cart', error: error.message });
  }
};

  
 
