const Cart = require("../models/cartModel");
const Product = require("../models/productModel");

// ============================
// ✅ ADD TO CART (FIXED)
// ============================
exports.addToCart = async (req, res) => {
  try {
    const userId = req.user?._id;
    const productId = req.params.productId;
    const { quantity = 1, size, color } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!size || !color) {
      return res.status(400).json({
        success: false,
        message: "Size and color are required",
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      cart = new Cart({
        user: userId,
        items: [],
        totalPrice: 0,
      });
    }

    const existingItemIndex = cart.items.findIndex(
      (item) =>
        item.product.toString() === productId &&
        item.size === size &&
        item.color === color
    );

    if (existingItemIndex >= 0) {
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      cart.items.push({
        product: productId,
        productName: product.name,
        coverImage: product.coverImage,
        size,
        color,
        quantity,
        price: product.price,
      });
    }

    cart.totalPrice = cart.items.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );

    await cart.save();

    return res.status(200).json({
      success: true,
      message: "Product added to cart successfully",
      cart,
    });
  } catch (error) {
    console.error("Add to cart error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add to cart",
    });
  }
};

// ============================
// ✅ GET CART (FIXED)
// ============================
exports.getCart = async (req, res) => {
  try {
    const userId = req.user._id;

    const cart = await Cart.findOne({ user: userId }).populate(
      "items.product",
      "name price coverImage"
    );

    if (!cart || cart.items.length === 0) {
      return res.status(200).json({
        success: true,
        cart: { items: [], totalPrice: 0 },
      });
    }

    res.status(200).json({
      success: true,
      cart,
    });
  } catch (error) {
    console.error("Get cart error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving cart",
    });
  }
};

// ============================
// ✅ UPDATE CART (FIXED)
// ============================
exports.updateCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const productId = req.params.productId;
    const { size, color, quantity } = req.body;

    if (!productId || !size || !color) {
      return res.status(400).json({
        success: false,
        message: "ProductId, size and color are required",
      });
    }

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found" });
    }

    const itemIndex = cart.items.findIndex(
      (item) =>
        item.product.toString() === productId &&
        item.size === size &&
        item.color === color
    );

    if (itemIndex < 0) {
      return res.status(404).json({
        success: false,
        message: "Item not found in cart",
      });
    }

    if (quantity <= 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      cart.items[itemIndex].quantity = quantity;
    }

    cart.totalPrice = cart.items.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );

    await cart.save();

    res.status(200).json({
      success: true,
      message: "Cart updated successfully",
      cart,
    });
  } catch (error) {
    console.error("Update cart error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating cart",
    });
  }
};

// ============================
// ✅ DELETE FROM CART (FIXED)
// ============================
exports.deleteCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const productId = req.params.productId;
    const { size, color } = req.body;

    if (!productId || !size || !color) {
      return res.status(400).json({
        success: false,
        message: "ProductId, size and color are required",
      });
    }

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    cart.items = cart.items.filter(
      (item) =>
        !(
          item.product.toString() === productId &&
          item.size === size &&
          item.color === color
        )
    );

    cart.totalPrice = cart.items.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );

    await cart.save();

    res.status(200).json({
      success: true,
      message: "Product removed from cart successfully",
      cart,
    });
  } catch (error) {
    console.error("Delete cart error:", error);
    res.status(500).json({
      success: false,
      message: "Error removing product from cart",
    });
  }
};
