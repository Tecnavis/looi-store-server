const express = require("express");
const router = express.Router();

const categoryController = require("../controller/categoryController");
const jwtMiddleware = require("../middleware/jwtMiddleware");
const upload = require("../middleware/uploadCloudinary");

/*
ADD CATEGORY
*/
router.post(
  "/add-category",
  jwtMiddleware,
  upload.single("images"),
  categoryController.postCategories
);

/*
GET ALL CATEGORIES
*/
router.get("/get-category", categoryController.getCategories);

/*
GET CATEGORY BY ID
*/
router.get(
  "/get-categoryid/:id",
  jwtMiddleware,
  categoryController.getCategoriesById
);

/*
UPDATE CATEGORY
*/
router.put(
  "/update-categoryid/:id",
  jwtMiddleware,
  upload.single("images"),
  categoryController.updateCategoriesById
);

/*
DELETE CATEGORY
*/
router.delete(
  "/delete-category/:id",
  jwtMiddleware,
  categoryController.deleteCategoriesById
);

/*
COUNT
*/
router.get(
  "/categoriescount",
  jwtMiddleware,
  categoryController.countCategories
);

module.exports = router;