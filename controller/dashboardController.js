const Product = require("../models/Product")
const Order = require("../models/Order")
const User = require("../models/User")

exports.dashboard = async(req,res)=>{

 const products = await Product.countDocuments()
 const orders = await Order.countDocuments()
 const users = await User.countDocuments()

 res.json({
  products,
  orders,
  users
 })

}