const CategoryModel = require("../models/categoryModel");
const asyncHandler = require("express-async-handler");



/*
CREATE CATEGORY
*/

exports.postCategories = asyncHandler(async (req, res) => {

  const name =
    req.body.name ||
    req.body.categoryName ||
    req.body.title ||
    req.body.category;

  const maincategoriesData =
    req.body.maincategoriesData ||
    req.body.mainCategoryId;


  if (!name) {
    return res.status(400).json({
      success:false,
      message:"Category name required"
    });
  }


  if (!maincategoriesData) {
    return res.status(400).json({
      success:false,
      message:"Main category required"
    });
  }


  const files = req.files || (req.file ? [req.file] : []);

  const imagePaths = files.length > 0
    ? files.map(file => file.filename)
    : [];


  const existingCategory = await CategoryModel.findOne({
    name: new RegExp(`^${name}$`, "i")
  });

  if (existingCategory) {
    return res.status(409).json({
      success:false,
      message:"Category already exists"
    });
  }


  const newCategory = await CategoryModel.create({
    name,
    maincategoriesData,
    images:imagePaths
  });


  res.status(201).json({
    success:true,
    message:"Category created",
    category:newCategory
  });

});



/*
GET ALL CATEGORIES
*/

exports.getCategories = asyncHandler(async (req, res) => {

  const categories = await CategoryModel
    .find()
    .populate("maincategoriesData")
    .sort({ createdAt: -1 });


  res.status(200).json({
    success:true,
    categories:categories || []
  });

});



/*
GET CATEGORY BY ID
*/

exports.getCategoriesById = asyncHandler(async (req, res) => {

  const { id } = req.params;

  const category = await CategoryModel
    .findById(id)
    .populate("maincategoriesData");


  if (!category) {
    return res.status(404).json({
      success:false,
      message:"Category not found"
    });
  }


  res.status(200).json({
    success:true,
    category
  });

});



/*
UPDATE CATEGORY
*/

exports.updateCategoriesById = asyncHandler(async (req, res) => {

  const { id } = req.params;

  const { name, maincategoriesData } = req.body;


  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({
      success:false,
      message:"Invalid category ID"
    });
  }


  const files = req.files || (req.file ? [req.file] : []);

  const imagePaths = files.length > 0
    ? files.map(file => file.filename)
    : undefined;


  const updateData = {
    ...(name && { name }),
    ...(maincategoriesData && { maincategoriesData }),
    ...(imagePaths && { images:imagePaths })
  };


  const updatedCategory = await CategoryModel.findByIdAndUpdate(
    id,
    updateData,
    { new:true }
  );


  if (!updatedCategory) {
    return res.status(404).json({
      success:false,
      message:"Category not found"
    });
  }


  res.status(200).json({
    success:true,
    message:"Category updated",
    category:updatedCategory
  });

});



/*
DELETE CATEGORY
*/

exports.deleteCategoriesById = asyncHandler(async (req, res) => {

  const { id } = req.params;

  const deleted = await CategoryModel.findByIdAndDelete(id);

  if (!deleted) {
    return res.status(404).json({
      success:false,
      message:"Category not found"
    });
  }

  res.status(200).json({
    success:true,
    message:"Category deleted"
  });

});



/*
COUNT CATEGORIES
*/

exports.countCategories = asyncHandler(async (req, res) => {

  const count = await CategoryModel.countDocuments();

  res.status(200).json({
    success:true,
    count
  });

});