const express = require("express");
const router = express.Router();

const Order = require("../models/Order");

router.get("/dashboard", async(req,res)=>{

const totalOrders = await Order.countDocuments();

const revenue = await Order.aggregate([
{$match:{paymentStatus:"paid"}},
{$group:{_id:null,total:{$sum:"$totalAmount"}}}
]);

res.json({
orders:totalOrders,
revenue:revenue[0]?.total || 0
});

});

module.exports = router;