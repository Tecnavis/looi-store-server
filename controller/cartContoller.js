const Cart = require("../models/cartModel");
const Product = require("../models/productModel");
const asyncHandler = require("express-async-handler");

/* -------------------------------------------------------------------------- */
/*                               ADD TO CART                                  */
/* -------------------------------------------------------------------------- */

exports.addToCart = asyncHandler(async (req, res) => {
  const { size, color, quantity } = req.body;
  const productId = req.params.productId;
  const userId = req.user._id;

  if (!productId || !size || !color || quantity == null) {
    return res.status(400).json({
      message: "productId, size, color and quantity are required"
    });
  }

  const qty = Number(quantity);
  if (qty <= 0) {
    return res.status(400).json({ message: "Quantity must be greater than 0" });
  }

  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  // Find size & color stock
  const sizeData = product.sizes.find(s => s.size === size);
  if (!sizeData) {
    return res.status(400).json({ message: "Invalid size" });
  }

  const colorData = sizeData.colors.find(c => c.color === color);
  if (!colorData) {
    return res.status(400).json({ message: "Invalid color" });
  }

  if (qty > colorData.stock) {
    return res.status(400).json({ message: "Insufficient stock" });
  }

  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = new Cart({ user: userId, items: [] });
  }

  const existingItemIndex = cart.items.findIndex(
    item =>
      item.product.toString() === productId &&
      item.size === size &&
      item.color === color
  );

  if (existingItemIndex > -1) {
    cart.items[existingItemIndex].quantity += qty;
  } else {
    cart.items.push({
      product: productId,
      productName: product.name,
      coverImage: product.coverImage,
      size,
      color,
      quantity: qty,
      price: product.price,
      hsn: product.hsn,
      sku: product.sku,
      length: product.length,
      width: product.width,
      height: product.height,
      weight: product.weight
    });
  }

  cart.totalPrice = cart.items.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const savedCart = await cart.save();

  res.status(200).json({
    message: "Product added to cart successfully",
    cart: await savedCart.populate("items.product")
  });
});

/* -------------------------------------------------------------------------- */
/*                                 GET CART                                   */
/* -------------------------------------------------------------------------- */

exports.getCart = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const cart = await Cart.findOne({ user: userId }).populate(
    "items.product",
    "name price coverImage"
  );

  if (!cart) {
    return res.status(200).json({ cart: { items: [], totalPrice: 0 } });
  }

  res.status(200).json({ cart });
});

/* -------------------------------------------------------------------------- */
/*                               UPDATE CART                                  */
/* -------------------------------------------------------------------------- */

exports.updateCart = asyncHandler(async (req, res) => {
  const { size, color, quantity } = req.body;
  const productId = req.params.productId;
  const userId = req.user._id;

  if (!productId || !size || !color || quantity == null) {
    return res.status(400).json({
      message: "productId, size, color and quantity are required"
    });
  }

  const qty = Number(quantity);

  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    return res.status(404).json({ message: "Cart not found" });
  }

  const itemIndex = cart.items.findIndex(
    item =>
      item.product.toString() === productId &&
      item.size === size &&
      item.color === color
  );

  if (itemIndex < 0) {
    return res.status(404).json({ message: "Item not found in cart" });
  }

  if (qty <= 0) {
    cart.items.splice(itemIndex, 1);
  } else {
    cart.items[itemIndex].quantity = qty;
  }

  cart.totalPrice = cart.items.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const updatedCart = await cart.save();

  res.status(200).json({
    message: "Cart updated successfully",
    cart: await updatedCart.populate("items.product")
  });
});

/* -------------------------------------------------------------------------- */
/*                               DELETE CART ITEM                              */
/* -------------------------------------------------------------------------- */

exports.deleteCart = asyncHandler(async (req, res) => {
  const { size, color } = req.body;
  const productId = req.params.productId;
  const userId = req.user._id;

  if (!productId || !size || !color) {
    return res.status(400).json({
      message: "productId, size and color are required"
    });
  }

  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    return res.status(404).json({ message: "Cart not found" });
  }

  const itemIndex = cart.items.findIndex(
    item =>
      item.product.toString() === productId &&
      item.size === size &&
      item.color === color
  );

  if (itemIndex < 0) {
    return res.status(404).json({ message: "Item not found in cart" });
  }

  cart.items.splice(itemIndex, 1);

  cart.totalPrice = cart.items.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const updatedCart = await cart.save();

  res.status(200).json({
    message: "Product removed from cart",
    cart: await updatedCart.populate("items.product")
  });
});
