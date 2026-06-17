const express=require('express')
const router=new express.Router()

const  jwtMiddleware  = require('../middleware/jwtMiddleware');
const adminController=require('../controller/AdminController')
const mainCategoryController=require('../controller/MainCategoryController');
const categoryController=require('../controller/categoryController');
const subCategoryController=require('../controller/subCategoryController');
const productController=require('../controller/productController')
const bannerController=require('../controller/bannerController')
const AdBannerController=require('../controller/AdController')
const AddPrint=require('../controller/printController')
const cartController=require('../controller/cartContoller');
const wishlistController=require('../controller/WishlistController')
const userController=require('../controller/userController')
const otpController=require('../controller/otpController')
const razorpayController=require('../controller/razorpayController')
const orderController=require('../controller/orderController')
const invoiceController=require('../controller/invoiceController')
const notificationSettingsController = require('../controller/notificationSettingsController');
const marqueeController = require('../controller/marqueeController');

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
router.post('/add-category',jwtMiddleware,upload.array('images',1),categoryController.postCategories);
router.get('/get-category',  categoryController.getCategories);
router.get('/get-categoryid/:id', jwtMiddleware, categoryController.getCategoriesById);
router.put('/update-categoryid/:id', jwtMiddleware,categoryController.updateCategoriesById);
router.delete('/delete-category/:id',jwtMiddleware, categoryController.deleteCategoriesById);
router.get('/categoriescount',jwtMiddleware,categoryController.countCategories);

// sub-category
router.post('/add-subcategory',jwtMiddleware,upload.array('images',1),subCategoryController.postSubCategories);
router.get('/get-subcategory', subCategoryController.getSubCategories);
router.get('/get-subcategoryid/:id', jwtMiddleware,subCategoryController.getCategoriesById);
router.put('/update-subcategoryid/:id', jwtMiddleware,subCategoryController.updateCategoriesById);
router.delete('/delete-subcategory/:id',jwtMiddleware,subCategoryController.deleteCategoriesById);
router.get('/subcategoriescount',jwtMiddleware,subCategoryController.countSubCategories);

// product
router.post('/add-product',jwtMiddleware,upload.any(),productController.addProduct);
router.get('/get-allproduct',productController.getAllProducts);
// FIX #1: renamed /get-productid/:id → /get-product/:id to match client
router.get('/get-product/:id',productController.getProductById);
router.put('/update-productid/:id',jwtMiddleware,upload.any(),productController.updateProduct);
router.delete('/delete-product/:id',jwtMiddleware,productController.deleteProduct);
router.get('/newarrival-product',productController.getNewArrivals);
// FIX #2: added /:id param so getProductAndSimilar can read req.params.id
router.get('/similar-product/:id',productController.getProductAndSimilar);

// banner
router.post('/add-banner', jwtMiddleware, upload.array('banners'), bannerController.postBanner);
router.get('/get-allbanner',bannerController.getBanner);
router.get('/get-bannerid/:id',jwtMiddleware,bannerController.getBannerById);
router.delete('/delete-banner/:id',jwtMiddleware,bannerController.deleteBannerById);

// Adbanner
router.post('/add-adbanner', jwtMiddleware, upload.single('banners'),AdBannerController.addBanner);
router.get('/get-adbanner',AdBannerController.getBanner);
router.delete('/delete-adbanner/:id',jwtMiddleware,AdBannerController.deleteBanner);

// Add print
router.post('/add-print', jwtMiddleware, upload.single('banners'),AddPrint.addPrint);
router.get('/get-print',AddPrint.getPrint);
router.delete('/delete-print/:id',jwtMiddleware,AddPrint.deletePrint);

// marquee / promo ticker
router.get('/get-marquee',           marqueeController.getMarquee);
router.get('/get-marquee-all',       jwtMiddleware, marqueeController.getAllMarquee);
router.post('/add-marquee',          jwtMiddleware, marqueeController.addMarquee);
router.put('/update-marquee/:id',    jwtMiddleware, marqueeController.updateMarquee);
router.delete('/delete-marquee/:id', jwtMiddleware, marqueeController.deleteMarquee);

// cart
router.post('/cart/:productId',jwtMiddleware,cartController.addToCart);
router.get('/cart',jwtMiddleware,cartController.getCart);
router.put('/cart/:productId',jwtMiddleware,cartController.updateCart);
router.delete('/delete-cart/:productId',jwtMiddleware,cartController.deleteCart);
router.delete('/clear-cart',jwtMiddleware,cartController.clearCart);

// wishlist
router.post('/add-wishlist/:productId',jwtMiddleware,wishlistController.addToWishlist);
router.get('/get-wishlist',jwtMiddleware,wishlistController.getWishlist);
router.delete('/delete-wishlist/:productId',jwtMiddleware,wishlistController.deleteWishlistProduct);

// user
router.post('/user-register',userController.registerUser);
router.post('/user-login',userController.loginUser);
router.get('/total-users', userController.getUserCount);
router.post('/add-address/:userId',jwtMiddleware,userController.addUserAddress);
router.delete('/delete-user/:userId',jwtMiddleware,userController.deleteUserById);
router.get('/get-user/:userId',jwtMiddleware,userController.getUserById);
router.put('/update-user/:userId',jwtMiddleware,userController.updateUserById);
router.get('/user-details/:userId',jwtMiddleware,userController.getUserDetails);
// FIX #4: /all-users now requires JWT
router.get('/all-users',jwtMiddleware,userController.getAllUsers);
router.delete('/delete-user/:userId/address/:addressId', jwtMiddleware, userController.deleteUserAddress);
router.put('/update-user/:userId/address/:addressId', jwtMiddleware, userController.editUserAddress);
router.post('/forgot-password',userController.resetPasswordRequest);
router.post('/reset-password/:token',userController.resetPassword);

// OTP-based passwordless auth (email or phone) — used by the new login/signup flow
router.post('/send-otp', otpController.sendOtp);
router.post('/verify-otp', otpController.verifyOtp);

// payment
router.post('/order',jwtMiddleware,razorpayController.order);
router.post('/verify-payment',jwtMiddleware,razorpayController.validate);

// orders
router.post('/postOrder',jwtMiddleware,orderController.createOrder);
router.post('/order-success',jwtMiddleware,orderController.orderSuccessHandler);
// FIX #3: /getOrders now requires JWT
router.get('/getOrders',jwtMiddleware,orderController.getAllOrders);
router.get('/getOrders/:orderId',jwtMiddleware,orderController.getOrderById);
router.put('/update-order/:orderId',jwtMiddleware,orderController.updateOrderById);
router.get('/getordercount',jwtMiddleware,orderController.getTotalOrderCount);
router.get('/getOrdersPerDay', jwtMiddleware, orderController.getOrdersByDay);
// FIX #5: cancel and repush now require JWT
router.post('/orders/:orderId/cancel', jwtMiddleware, orderController.cancelOrder);
router.delete('/delete-order/:orderId',jwtMiddleware,orderController.deleteOrderById);
router.put('/mark-as-delivered/:orderId',jwtMiddleware,orderController.markOrderAsDelivered);
router.post('/repush-shiprocket/:orderId', jwtMiddleware, orderController.repushToShiprocket);
router.get('/user/orders', jwtMiddleware, orderController.getOrdersByUser);

// invoice
router.get('/invoice/:orderId',jwtMiddleware,invoiceController.generateInvoice);

// notification settings
router.get('/notification-settings', jwtMiddleware, notificationSettingsController.getSettings);
router.put('/notification-settings', jwtMiddleware, notificationSettingsController.updateSettings);

// FIX #7: /test-shiprocket debug route removed — never expose in production

module.exports=router;
