const Subcategories = require('../models/subCategoryModel');
const asyncHandler = require('express-async-handler');
// const MainCategories = require('../models/mainCategory');


exports.postSubCategories = async (req, res) => {
    const { subcategoryname, maincategory, category } = req.body;

    // Validation: Check if all required fields are provided
    if (!subcategoryname || !maincategory || !category) {
        return res.status(400).json({
            message: 'Subcategory name, main category, and category are required',
        });
    }

    try {
        // Check if subcategory already exists (optional)
        // const existingSubcategory = await Subcategories.findOne({ subcategoryname });
        // if (existingSubcategory) {
        //     return res.status(409).json({
        //         message: 'Subcategory already exists',
        //     });
        // }

        // Create the new subcategory
        const newSubcategory = await Subcategories.create({
            subcategoryname: subcategoryname,
            maincategory: maincategory,
            category: category,
        });

        res.status(200).json({
            message: 'Sub Category posted successfully',
            subcategory: newSubcategory,
        });
    } catch (err) {
        console.error('Error posting subcategory:', err);
        res.status(500).json({
            message: 'An error occurred while posting subcategory',
            error: err.message,
        });
    }
};


exports.getSubCategories = async (req, res) => {
    try {
       
        const response = await Subcategories.find().populate('category');
        res.status(200).json(response);
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred while fetching data');
    }
};


exports.getCategoriesById = async (req, res) => {
    const { id } = req.params;

    try {
        const response = await Subcategories.findById(id).populate('category');
        res.status(200).json(response); // Ensure response contains the data you expect
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred while fetching data');
    }
};


    exports.updateCategoriesById = async (req, res) => {
    const { id } = req.params;
    const { subcategoryname, category } = req.body;

    try {
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ err: 'Invalid ID format.' });
        }

        const subcategory = await Subcategories.findById(id);
        if (!subcategory) {
            return res.status(404).json({ err: 'Category not found.' });
        }

        const update = { subcategoryname, category };
        const updatedCategory = await Subcategories.findByIdAndUpdate(id, update, { new: true });
        res.status(200).json(updatedCategory);
    } catch (err) {
        res.status(500).json({ err: 'Error updating category', message: err.message });
    }
};


exports.deleteCategoriesById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
        const response = await Subcategories.findByIdAndDelete(id);
        res.status(200).json(response);
    } catch (err) {
        console.error(err);
        res.status(500).json({ err: 'An error occurred while deleting data' });
    }
});


exports.countSubCategories = asyncHandler(async (req, res) => {
    try {
        const count = await Subcategories.countDocuments();
        res.status(200).json({ count });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred while counting categories');
    }
});





