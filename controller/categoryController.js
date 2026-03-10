const Category = require("../models/categoryModel");

/*
ADD CATEGORY
*/
exports.postCategories = async (req, res) => {
  try {

    const { name, maincategoriesData, description } = req.body;

    const image = req.file ? req.file.path : "";

    const category = new Category({
      name,
      maincategoriesData,
      description,
      images: image
    });

    await category.save();

    res.status(200).json({
      success: true,
      message: "Category Added Successfully",
      category
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Error creating category"
    });

  }
};


/*
GET CATEGORIES
*/
exports.getCategories = async (req, res) => {

  const categories = await Category
    .find()
    .populate("maincategoriesData");

  res.json(categories);

};


/*
GET CATEGORY BY ID
*/
exports.getCategoriesById = async (req, res) => {

  const category = await Category.findById(req.params.id);

  res.json(category);

};


/*
UPDATE CATEGORY
*/
exports.updateCategoriesById = async (req, res) => {

  const { name, maincategoriesData, description } = req.body;

  const image = req.file ? req.file.path : undefined;

  const updateData = {
    name,
    maincategoriesData,
    description
  };

  if (image) {
    updateData.images = image;
  }

  const updated = await Category.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true }
  );

  res.json(updated);

};


/*
DELETE CATEGORY
*/
exports.deleteCategoriesById = async (req, res) => {

  await Category.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: "Category deleted"
  });

};


/*
COUNT
*/
exports.countCategories = async (req, res) => {

  const count = await Category.countDocuments();

  res.json({ count });

};