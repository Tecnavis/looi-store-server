const Maincategories = require('../Models/mainCategory');
const asyncHandler = require('express-async-handler');


exports.postMaincategories = async (req, res, next) => {
    try {
        const { mainCategoryName } = req.body;

        if (!mainCategoryName) {
            return res.status(400).send('Main category name is required');
        }

        const existingCategory = await Maincategories.findOne({
            mainCategoryName: { $regex: new RegExp(`^${mainCategoryName}$`, 'i') }
        });
        if (existingCategory) {
            return res.status(409).send('Main category already exists');
        }

        await Maincategories.create({ mainCategoryName });
        res.status(200).send('MainCategory posted successfully');
    } catch (err) {
        res.status(500).send(`An error occurred while posting categories: ${err.message}`);
    }
};



exports.getMaincategories = asyncHandler(async (req, res) => {
    try {
        const response = await Maincategories.find();
        res.status(200).json(response);
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred while fetching data');
    }
});

exports.getMaincategoriesById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    try {
        const response = await Maincategories.findById(id);
        res.status(200).json(response);
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred while fetching data');
    }
});

exports.updateMaincategoriesById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { mainCategoryName } = req.body;

    try {
        const update = { mainCategoryName };
        const updatedData = await Maincategories.findByIdAndUpdate(id, { $set: update }, { new: true });
        res.status(200).json(updatedData);
    } catch (err) {
        console.error(err);
        res.status(500).json({ err: 'Error while updating data' });
    }
});

exports.countMaincategories = asyncHandler(async (req, res) => {
    try {
        const count = await Maincategories.countDocuments();
        res.status(200).json({ count });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred while counting main categories');
    }
});


exports.deleteMaincategoriesById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
        const response = await Maincategories.findByIdAndDelete(id);
        // When deleting a main category, also delete associated categories
        await Maincategories.deleteMany({ maincategoriesData: id });
        res.status(200).json("main category delete successfully");
    } catch (err) {
        console.error(err);
        res.status(500).json({ err: 'An error occurred while deleting data' });
    }
});




