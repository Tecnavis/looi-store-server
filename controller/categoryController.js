const CategoryModel = require('../models/categoryModel');
const asyncHandler = require('express-async-handler');

// exports.postCategories = async (req, res) => {
//     const { name, maincategoriesData } = req.body;
   
//     if (!name) {
//         return res.status(400).send('Category name is required');
//     }
//     try {
      
//         const existingCategory = await CategoryModel.findOne({
//             name: { $regex: new RegExp(`^${name}$`, 'i') }
//         });

//         // Create a new category if it does not exist
//         const newCategory = await CategoryModel.create({
//             name: name,
//             maincategoriesData: maincategoriesData
//         });

//         res.status(200).json({
//             message: 'Category posted successfully',
//             category: newCategory
//         });
//     } catch (err) {
//         console.error(err);
//         res.status(500).send(`An error occurred while posting category: ${err.message}`);
//     }
// };

exports.postCategories = async (req, res) => {
  try {
    // ✅ Accept name from any key (frontend compatibility)
    const name =
      req.body.name ||
      req.body.categoryName ||
      req.body.title ||
      req.body.category;

    // ✅ main category id from frontend
    const maincategoriesData =
      req.body.maincategoriesData || req.body.mainCategoryId;

    if (!name) {
      return res.status(400).json({ message: "Category name is required" });
    }

    if (!maincategoriesData) {
      return res.status(400).json({ message: "Main category is required" });
    }

    // ✅ Support both req.files and req.file
    const files = req.files || (req.file ? [req.file] : []);

    // ✅ OPTIONAL images (no validation error)
    const imagePaths =
      files && files.length > 0
        ? files.map((file) => file.path || file.filename)
        : [];

    // ✅ Check if category already exists
    const existingCategory = await CategoryModel.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });

    if (existingCategory) {
      return res.status(406).json({ message: "Category already exists" });
    }

    // ✅ Save category (images optional)
    const newCategory = await CategoryModel.create({
      name: name,
      maincategoriesData: maincategoriesData,
      images: imagePaths, // can be empty []
    });

    return res.status(200).json({
      message: "Category posted successfully",
      category: newCategory,
    });
  } catch (err) {
    console.error("Error posting category:", err);
    return res.status(500).json({
      message: `An error occurred while posting the category: ${err.message}`,
    });
  }
};



exports.getCategories = async (req, res) => {
    try {
        // Populate maincategoriesData with actual data
        const response = await CategoryModel.find().populate('maincategoriesData');
        res.status(200).json(response);
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred while fetching data');
    }
};

exports.getCategoriesById = async (req, res) => {
    const { id } = req.params;

    try {
        const response = await CategoryModel.findById(id).populate('maincategoriesData');
        res.status(200).json(response); // Ensure response contains the data you expect
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred while fetching data');
    }
};


    exports.updateCategoriesById = async (req, res) => {
    const { id } = req.params;
    const { name, maincategoriesData } = req.body;

    try {
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ err: 'Invalid ID format.' });
        }

        const category = await CategoryModel.findById(id);
        if (!category) {
            return res.status(404).json({ err: 'Category not found.' });
        }

        const update = { name, maincategoriesData };
        const updatedCategory = await CategoryModel.findByIdAndUpdate(id, update, { new: true });
        res.status(200).json(updatedCategory);
    } catch (err) {
        res.status(500).json({ err: 'Error updating category', message: err.message });
    }
};


exports.deleteCategoriesById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
        const response = await CategoryModel.findByIdAndDelete(id);
        res.status(200).json(response);
    } catch (err) {
        console.error(err);
        res.status(500).json({ err: 'An error occurred while deleting data' });
    }
});


exports.countCategories = asyncHandler(async (req, res) => {
    try {
        const count = await CategoryModel.countDocuments();
        res.status(200).json({ count });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred while counting categories');
    }
});




