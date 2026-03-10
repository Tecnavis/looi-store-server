const mongoose = require("mongoose")

const mainCategorySchema = new mongoose.Schema({

name:{
type:String,
required:true
},

image:{
type:String
}

},{timestamps:true})

module.exports = mongoose.model("MainCategory",mainCategorySchema)