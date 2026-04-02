const axios = require('axios');
const shiprocketConfig = require('../config/shiprocketConfig');
const Order = require('../models/orderModel');

// TOKEN CACHE
let cachedToken = null;
let tokenExpiry = null;

// AUTH
const authenticateShiprocket = async () => {
    try {
        if (cachedToken && tokenExpiry > Date.now()) {
            return cachedToken;
        }

        const response = await axios.post(
            `${shiprocketConfig.baseURL}/auth/login`,
            {
                email: shiprocketConfig.email,
                password: shiprocketConfig.password
            }
        );

        cachedToken = response.data.token;
        tokenExpiry = Date.now() + (240 * 60 * 60 * 1000);

        return cachedToken;

    } catch (error) {
        console.error("❌ Auth Error:", error.response?.data || error.message);
        throw new Error("Shiprocket auth failed");
    }
};

// GET COURIER
const getCourierId = async (deliveryPincode, weight = 0.5) => {
    const token = await authenticateShiprocket();

    try {
        const response = await axios.get(
            `${shiprocketConfig.baseURL}/courier/serviceability/`,
            {
                params: {
                    pickup_postcode: "676509", // 🔥 CHANGE THIS
                    delivery_postcode: deliveryPincode,
                    weight
                },
                headers: { Authorization: `Bearer ${token}` }
            }
        );

        const couriers = response.data?.data?.available_courier_companies;

        if (!couriers || couriers.length === 0) {
            throw new Error("No courier available");
        }

        return couriers[0].courier_company_id;

    } catch (error) {
        console.error("❌ Courier Error:", error.response?.data || error.message);
        throw new Error("Courier fetch failed");
    }
};

// CREATE ORDER
const postOrderToShiprocket = async (orderData) => {
    try {
        const token = await authenticateShiprocket();

        const firstItem = orderData.orderItems[0];

        const payload = {
            order_id: orderData.orderId,
            order_date: new Date().toISOString().slice(0, 16).replace("T", " "),
            pickup_location: shiprocketConfig.pickupLocation,

            billing_customer_name: orderData.shippingAddress.firstName,
            billing_last_name: orderData.shippingAddress.lastName || '',
            billing_address: orderData.shippingAddress.houseBuilding,
            billing_city: orderData.shippingAddress.cityDistrict,
            billing_pincode: orderData.shippingAddress.postalCode,
            billing_state: orderData.shippingAddress.state,
            billing_country: 'India',
            billing_email: orderData.email,
            billing_phone: orderData.shippingAddress.phoneNumber || '9999999999',

            shipping_is_billing: true,

            order_items: orderData.orderItems.map((item, i) => ({
                name: item.productName,
                sku: item.sku || `ITEM-${i}`,
                units: item.quantity,
                selling_price: item.price,
                tax: 0,
                length: item.length || 10,
                breadth: item.width || 10,
                height: item.height || 10,
                weight: item.weight || 0.5
            })),

            payment_method: orderData.paymentMethod === 'COD' ? 'COD' : 'Prepaid',
            sub_total: orderData.totalAmount,

            length: firstItem.length || 10,
            breadth: firstItem.width || 10,
            height: firstItem.height || 10,
            weight: firstItem.weight || 0.5,

            is_return: 0
        };

        console.log("📦 Shiprocket Payload:", payload);

        const orderRes = await axios.post(
            `${shiprocketConfig.baseURL}/orders/create/adhoc`,
            payload,
            { headers: { Authorization: `Bearer ${token}` } }
        );

        const shipmentId = orderRes.data.shipment_id;

        // GET COURIER
        const courierId = await getCourierId(orderData.shippingAddress.postalCode);

        // ASSIGN AWB
        const awbRes = await axios.post(
            `${shiprocketConfig.baseURL}/courier/assign/awb`,
            {
                shipment_id: shipmentId,
                courier_id: courierId
            },
            { headers: { Authorization: `Bearer ${token}` } }
        );

        const awb = awbRes.data.response.data.awb_code;

        return {
            shipment_id: shipmentId,
            awb_code: awb
        };

    } catch (error) {
        console.error("❌ Shiprocket Error:", error.response?.data || error.message);
        throw error;
    }
};

module.exports = { postOrderToShiprocket };