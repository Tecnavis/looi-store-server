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
const razorpayController=require('../controller/razorpayController')
const orderController=require('../controller/orderController')
const invoiceController=require('../controller/invoiceController')

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

// router.post('/add-product',jwtMiddleware,upload.array('images',4),productController.addProduct);
router.post('/add-product',jwtMiddleware,upload.any(),productController.addProduct);
router.get('/get-allproduct',productController.getAllProducts);
router.get('/get-productid/:id',productController.getProductById);
router.put('/update-productid/:id',jwtMiddleware,upload.any(),productController.updateProduct);
router.delete('/delete-product/:id',jwtMiddleware,productController.deleteProduct);
router.get('/newarrival-product',productController.getNewArrivals);
router.get('/similar-product',productController.getProductAndSimilar);

// banner 
router.post('/add-banner', jwtMiddleware, upload.array('banners'), bannerController.postBanner);
router.get('/get-allbanner',bannerController.getBanner);
router.get('/get-bannerid/:id',jwtMiddleware,bannerController.getBannerById);
// router.put('/update-bannerid/:id',jwtMiddleware,upload.array('images'),bannerController.putBannerById);
router.delete('/delete-banner/:id',jwtMiddleware,bannerController.deleteBannerById);

// Adbanner
router.post('/add-adbanner', jwtMiddleware, upload.single('banners'),AdBannerController.addBanner);
router.get('/get-adbanner',AdBannerController.getBanner);
router.delete('/delete-adbanner/:id',jwtMiddleware,AdBannerController.deleteBanner);

// Add print
router.post('/add-print', jwtMiddleware, upload.single('banners'),AddPrint.addPrint);
router.get('/get-print',AddPrint.getPrint);
router.delete('/delete-print/:id',jwtMiddleware,AddPrint.deletePrint);

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
router.get('/total-users', userController.getUserCount);
router.post('/add-address/:userId',jwtMiddleware,userController.addUserAddress);
router.delete('/delete-user/:userId',jwtMiddleware,userController.deleteUserById);
router.get('/get-user/:userId',jwtMiddleware,userController.getUserById);
router.put('/update-user/:userId',jwtMiddleware,userController.updateUserById);


router.get('/user-details/:userId',jwtMiddleware,userController.getUserDetails);
router.get('/all-users',userController.getAllUsers);
router.delete('/delete-user/:userId/address/:addressId', jwtMiddleware, userController.deleteUserAddress);
router.put('/update-user/:userId/address/:addressId', jwtMiddleware, userController.editUserAddress);

router.post('/forgot-password',userController.resetPasswordRequest);
router.post('/reset-password/:token',userController.resetPassword);

// payment
router.post('/order',jwtMiddleware,razorpayController.order);
router.post('/verify-payment',jwtMiddleware,razorpayController.validate);

router.post('/postOrder',jwtMiddleware,orderController.createOrder);
router.post('/order-success',jwtMiddleware,orderController.orderSuccessHandler);
router.get('/getOrders',orderController.getAllOrders);
router.get('/getOrders/:orderId',jwtMiddleware,orderController.getOrderById);
router.put('/update-order/:orderId',orderController.updateOrderById);
router.get('/getordercount',jwtMiddleware,orderController.getTotalOrderCount);
router.get('/getOrdersPerDay', orderController.getOrdersByDay);
router.post('/orders/:orderId/cancel', orderController.cancelOrder);
router.delete('/delete-order/:orderId',orderController.deleteOrderById);

router.put('/mark-as-delivered/:orderId',orderController.markOrderAsDelivered);

// Admin: re-push any saved order to Shiprocket (use when SR push failed on creation)
router.post('/repush-shiprocket/:orderId', orderController.repushToShiprocket);

router.get('/user/orders', jwtMiddleware, orderController.getOrdersByUser);

router.get('/invoice/:orderId',jwtMiddleware,invoiceController.generateInvoice);


module.exports=router; 
// ── TEMP DEBUG: mirrors testshiprocket.js exactly, call GET /api/test-shiprocket
router.get('/test-shiprocket', async (req, res) => {
    const axios = require('axios');
    const BASE_URL = 'https://apiv2.shiprocket.in/v1/external';
    const EMAIL    = process.env.SHIPROCKET_EMAIL;
    const PASSWORD = process.env.SHIPROCKET_PASSWORD;

    const result = { steps: {} };

    // Step 1: Auth
    result.steps.auth = { email: EMAIL, passwordSet: !!PASSWORD };
    let token;
    try {
        const r = await axios.post(`${BASE_URL}/auth/login`, { email: EMAIL, password: PASSWORD });
        token = r.data.token;
        result.steps.auth.status = 'OK';
        result.steps.auth.tokenPreview = token?.substring(0, 20) + '...';
    } catch (e) {
        result.steps.auth.status = 'FAILED';
        result.steps.auth.error = e.response?.data || e.message;
        return res.json(result);
    }

    // Step 2: Create order — EXACT same payload as testshiprocket.js
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const orderDate = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const testOrder = {
        order_id:              `TEST-SERVER-${Date.now()}`,
        order_date:            orderDate,
        pickup_location:       'work',
        channel_id:            5486974,
        billing_customer_name: 'Thabu',
        billing_last_name:     'User',
        billing_address:       '123 Test Street',
        billing_city:          'mpm',
        billing_pincode:       '676505',
        billing_state:         'Kerala',
        billing_country:       'India',
        billing_email:         'test@example.com',
        billing_phone:         '9876543210',
        billing_isd_code:      '91',
        shipping_is_billing:   true,
        order_items: [{ name: 'Test Product', sku: 'SKU-TEST-001', units: 1, selling_price: 499, discount: 0, tax: 0, hsn: 0 }],
        payment_method:        'Prepaid',
        shipping_charges: 0, giftwrap_charges: 0, transaction_charges: 0, total_discount: 0,
        sub_total: 499, length: 10, breadth: 10, height: 10, weight: 0.5,
    };

    result.steps.orderCreate = { payload: testOrder };
    try {
        const r = await axios.post(`${BASE_URL}/orders/create/adhoc`, testOrder, {
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
        });
        result.steps.orderCreate.httpStatus = r.status;
        result.steps.orderCreate.response   = r.data;
        result.steps.orderCreate.status     = (r.data?.status === 0 || r.data?.status_code === 0) ? 'SR_REJECTED' : 'OK';
    } catch (e) {
        result.steps.orderCreate.status     = 'HTTP_ERROR';
        result.steps.orderCreate.httpStatus = e.response?.status;
        result.steps.orderCreate.error      = e.response?.data || e.message;
    }

    return res.json(result);
});