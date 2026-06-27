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
    const { size, color = '', quantity } = req.body;
    const productId = req.params.productId;
    const userId = req.user._id;

    if (!productId || !size || !quantity) {
      return res.status(400).json({ message: 'ProductId, size, and quantity are required' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Use toObject() so .length and other reserved JS properties work correctly
    const p = product.toObject();

    const normalizedSize  = size.trim().toUpperCase();
    const normalizedColor = (color || '').trim();
    const qty             = Number(quantity) || 1;

    // Each unit becomes its own cart line item (quantity is always 1 per row).
    // Adding 3 of the same product — whether via 3 separate "Add to Cart"
    // clicks or one click with quantity=3 selected — produces 3 separate
    // rows in the cart, each independently removable, rather than one row
    // with quantity incremented. This intentionally replaces the previous
    // "merge into existing row" behavior.
    const newItems = Array.from({ length: qty }, () => ({
      product:     productId,
      productId:   String(p._id),
      productName: p.name       || '',
      coverImage:  p.coverImage || '',
      size:        normalizedSize,
      color:       normalizedColor,
      quantity:    1,
      price:       Number(p.price)  || 0,
      hsn:         p.hsn            || '',
      sku:         p.sku            || '',
      length:      Number(p.length) || 0,
      width:       Number(p.width)  || 0,
      height:      Number(p.height) || 0,
      weight:      Number(p.weight) || 0,
    }));

    const savedCart = await Cart.findOneAndUpdate(
      { user: userId },
      {
        $push: { items: { $each: newItems } },
        $setOnInsert: { user: userId, totalPrice: 0 },
      },
      { new: true, upsert: true }
    ).populate('items.product');

    // Recalculate totalPrice
    if (savedCart) {
      const total = savedCart.items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
      await Cart.findOneAndUpdate({ user: userId }, { $set: { totalPrice: total } });
      savedCart.totalPrice = total;
    }

    return res.status(200).json({
      message: 'Product added to cart successfully',
      cart: savedCart,
    });

  } catch (error) {
    console.error('addToCart error:', error);
    if (error.name === 'ValidationError') {
      const fieldErrors = Object.keys(error.errors).map(f => ({
        field:   f,
        message: error.errors[f].message,
        value:   error.errors[f].value,
      }));
      console.error('Failing fields:', fieldErrors);
      return res.status(400).json({ message: 'Validation error', fieldErrors });
    }
    res.status(500).json({ message: 'Error adding to cart', error: error.message });
  }
};


exports.getCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const cart = await Cart.findOne({ user: userId }).populate('items.product', 'name price coverImage');
    if (!cart) {
      // Return empty cart instead of 404 to prevent client errors on first visit
      return res.status(200).json({ cart: { items: [], totalPrice: 0 } });
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
    const { size, color, quantity } = req.body;
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

    // Find the item in the cart by productId, size, AND color (when provided).
    // Matching on productId + size alone can hit the wrong line item if the
    // same product/size exists in more than one color.
    const itemIndex = cart.items.findIndex(item => {
      if (item.product.toString() !== productId) return false;
      if (item.size !== size) return false;
      if (color !== undefined && item.color !== color) return false;
      return true;
    });

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
    // This is the cart line item's own _id (each row — even duplicates of the
    // same product/size/color — now has its own unique _id, since adding the
    // same product twice creates two separate rows instead of merging into
    // one row with quantity 2). The param is still named productId for
    // backward compatibility with existing client calls.
    const itemId = req.params.productId;
    // Optional fallback, kept for any older client still matching by
    // product+size+color instead of by line item id.
    const { size, color } = req.query;

    if (!itemId) {
      return res.status(400).json({ message: 'Item id is required' });
    }

    // Find the user's cart
    const cart = await Cart.findOne({ user: userId });

    // Check if cart exists
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    // Prefer matching the exact line item by its own _id — this is the only
    // way to remove precisely one of several identical (same product/size/
    // color) rows without affecting the others.
    let productIndex = cart.items.findIndex((item) => item._id.toString() === itemId);

    // Fallback for older calls that still pass the product's _id instead of
    // the line item's _id — removes the first matching row only.
    if (productIndex === -1) {
      productIndex = cart.items.findIndex((item) => {
        if (item.product.toString() !== itemId) return false;
        if (size && item.size !== size) return false;
        if (color && item.color !== color) return false;
        return true;
      });
    }

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
// Clear entire cart (called after order is placed)
exports.clearCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(200).json({ message: 'Cart already empty' });
    }
    cart.items = [];
    await cart.save();
    res.status(200).json({ message: 'Cart cleared successfully' });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({ message: 'Error clearing cart', error: error.message });
  }
};
