const express = require("express");
const router = express.Router();

const Order = require("../models/order");
const generateInvoice = require("../utils/invoice");

router.post("/orders", async(req,res)=>{

try{

const order = new Order(req.body);

await order.save();

generateInvoice(order);

res.json({
success:true,
order
});

}catch(err){

res.status(500).json({error:err.message})

}

});

router.get("/orders", async(req,res)=>{

const orders = await Order.find().sort({createdAt:-1});

res.json(orders);

});

router.put("/orders/:id", async(req,res)=>{

await Order.findByIdAndUpdate(req.params.id,req.body);

res.json({message:"updated"});

});

module.exports = router;