const SubCategory = require("../models/subCategoryModel")

exports.addSubCategory = async(req,res)=>{

try{

const {name,category} = req.body

const image = req.file ? req.file.path : ""

const sub = new SubCategory({
name,
category,
image
})

await sub.save()

res.json(sub)

}catch(err){

res.status(500).json({message:"Error adding subcategory"})

}

}