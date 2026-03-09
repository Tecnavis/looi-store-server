const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({

customer:{
name:String,
phone:String,
address:String,
city:String,
pincode:String
},

items:[
{
name:String,
price:Number,
quantity:Number,
image:String
}
],

totalAmount:Number,

paymentMethod:String,

paymentStatus:{
type:String,
default:"pending"
},

orderStatus:{
type:String,
default:"pending"
},

createdAt:{
type:Date,
default:Date.now
}

});

module.exports = mongoose.model("Order",orderSchema);