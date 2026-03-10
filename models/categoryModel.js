const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({

  name:{
    type:String,
    required:true
  },

  maincategoriesData:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"MainCategory",
    required:true
  },

  description:{
    type:String
  },

  images:{
    type:String
  }

},{timestamps:true});

module.exports = mongoose.model("Category",categorySchema);