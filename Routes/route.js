const express=require('express')
const router=new express.Router()


const  jwtMiddleware  = require('../Middleware/jwtMiddleware');
const adminController=require('../controller/AdminController')
const mainCategoryController=require('../controller/MainCategoryController');
const categoryController=require('../controller/categoryController');
const subCategoryController=require('../controller/subCategoryController');
const productController=require('../controller/productController')
const bannerController=require('../controller/bannerController')

const cartController=require('../controller/cartContoller');
const wishlistController=require('../controller/WishlistController')
const userController=require('../controller/userController')

const upload = require('../config/multerconfig');


router.post('/admin-register',adminController.registerAdmin);

// admin login
router.post('/admin-login',adminController.loginAdmin);

// main-category
router.post('/main-category', jwtMiddleware, mainCategoryController.postMaincategories);
router.get('/get-maincategory',  mainCategoryController.getMaincategories);
router.post('/get-maincategoryid/:id', jwtMiddleware, mainCategoryController.getMaincategories);
router.put('/update-maincategoryid/:id', jwtMiddleware, mainCategoryController.updateMaincategoriesById);
router.delete('/delete-maincategory/:id',jwtMiddleware, mainCategoryController.deleteMaincategoriesById);
router.get('/maincategoriescount',jwtMiddleware, mainCategoryController.countMaincategories);

// category
router.post('/add-category', jwtMiddleware, categoryController.postCategories);
router.get('/get-category',  categoryController.getCategories);
router.get('/get-categoryid/:id', jwtMiddleware, categoryController.getCategoriesById);
router.put('/update-categoryid/:id', jwtMiddleware,categoryController.updateCategoriesById);
router.delete('/delete-category/:id',jwtMiddleware, categoryController.deleteCategoriesById);
router.get('/categoriescount',jwtMiddleware,categoryController.countCategories);

// sub-category
router.post('/add-subcategory',jwtMiddleware,subCategoryController.postSubCategories);
router.get('/get-subcategory', subCategoryController.getSubCategories);
router.get('/get-subcategoryid/:id', jwtMiddleware,subCategoryController.getCategoriesById);
router.put('/update-subcategoryid/:id', jwtMiddleware,subCategoryController.updateCategoriesById);
router.delete('/delete-subcategory/:id',jwtMiddleware,subCategoryController.deleteCategoriesById);
router.get('/subcategoriescount',jwtMiddleware,subCategoryController.countSubCategories);

// products

// router.post('/add-product',jwtMiddleware,upload.array('images',4),productController.addProduct);
router.post('/add-product',jwtMiddleware,upload.any(),productController.addProduct);
router.get('/get-allproduct',productController.getAllProducts);
router.get('/get-productid/:id',productController.getProductById);
router.put('/update-productid/:id',jwtMiddleware,upload.any(),productController.updateProduct);
router.delete('/delete-product/:id',jwtMiddleware,productController.deleteProduct);
router.get('/newarrival-product',productController.getNewArrivals);

// banner 

router.post('/add-banner', jwtMiddleware, upload.array('banners'), bannerController.postBanner);
router.get('/get-allbanner',bannerController.getBanner);
router.get('/get-bannerid/:id',jwtMiddleware,bannerController.getBannerById);
// router.put('/update-bannerid/:id',jwtMiddleware,upload.array('images'),bannerController.putBannerById);
router.delete('/delete-banner/:id',jwtMiddleware,bannerController.deleteBannerById);


// cart
router.post('/cart/:productId',jwtMiddleware,cartController.addToCart);
router.get('/cart',jwtMiddleware,cartController.getCart);
router.put('/cart/:productId',jwtMiddleware,cartController.updateCart);
router.delete('/delete-cart/:productId',jwtMiddleware,cartController.deleteCart);

// wishlist
router.post('/add-wishlist/:productId',jwtMiddleware,wishlistController.addToWishlist);
router.get('/get-wishlist',jwtMiddleware,wishlistController.getWishlist);
router.delete('/delete-wishlist/:productId',jwtMiddleware,wishlistController.deleteWishlistProduct);

// router.post('/move-wishlist-to-cart/:productId',jwtMiddleware,wishlistController.moveWishlistToCart);

// ------user-------
router.post('/user-register',userController.registerUser);
router.post('/user-login',userController.loginUser);
router.put('/update-address/:userId',jwtMiddleware,userController.updateUserAddress)




module.exports=router; 