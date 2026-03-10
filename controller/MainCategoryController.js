const MainCategory = require("../models/mainCategoryModel")

exports.addMainCategory = async(req,res)=>{

try{

const {name} = req.body

const image = req.file ? req.file.path : ""

const category = new MainCategory({
name,
image
})

await category.save()

res.json(category)

}catch(err){

res.status(500).json({message:"Error creating main category"})

}

}


exports.getMainCategories = async(req,res)=>{

const categories = await MainCategory.find()

res.json(categories)

}