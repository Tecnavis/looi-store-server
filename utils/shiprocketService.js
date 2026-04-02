const axios = require('axios');
const shiprocketConfig = require('../config/shiprocketConfig');
const Order = require('../models/orderModel');

// ================= TOKEN CACHE =================
let cachedToken = null;
let tokenExpiry = null;

// ================= AUTH =================
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
        tokenExpiry = Date.now() + (240 * 60 * 60 * 1000); // 240 hours

        return cachedToken;
    } catch (error) {
        console.error('Auth Error:', error.response?.data || error.message);
        throw new Error('Shiprocket authentication failed');
    }
};

// ================= GET BEST COURIER =================
const getCourierId = async (pickup, delivery, weight = 0.5) => {
    const token = await authenticateShiprocket();

    try {
        const response = await axios.get(
            `${shiprocketConfig.baseURL}/courier/serviceability/`,
            {
                params: {
                    pickup_postcode: pickup,
                    delivery_postcode: delivery,
                    weight
                },
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const couriers = response.data?.data?.available_courier_companies;

        if (!couriers || couriers.length === 0) {
            throw new Error('No courier available');
        }

        // Select cheapest courier
        const bestCourier = couriers.sort((a, b) => a.rate - b.rate)[0];

        return bestCourier.courier_company_id;

    } catch (error) {
        console.error('Courier Error:', error.response?.data || error.message);
        throw new Error('Failed to fetch courier');
    }
};

// ================= FORMAT DATE =================
const formatDate = () => {
    const d = new Date();
    return d.toISOString().slice(0, 16).replace("T", " ");
};

// ================= CREATE ORDER =================
const postOrderToShiprocket = async (orderData) => {
    try {
        const token = await authenticateShiprocket();

        const firstItem = orderData.orderItems[0];

        const shiprocketOrderData = {
            order_id: orderData.orderId,
            order_date: formatDate(),
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

            order_items: orderData.orderItems.map((item, index) => ({
                name: item.productName,
                sku: item.sku || `ITEM-${index + 1}`,
                units: item.quantity,
                selling_price: item.price,
                tax: 0,
                hsn: item.hsn || '',
                length: item.length || 10,
                breadth: item.width || 10,
                height: item.height || 10,
                weight: item.weight || 0.5,
            })),

            payment_method: orderData.paymentMethod === 'COD' ? 'COD' : 'Prepaid',
            sub_total: orderData.totalAmount,

            length: firstItem.length || 10,
            breadth: firstItem.width || 10,
            height: firstItem.height || 10,
            weight: firstItem.weight || 0.5,

            is_return: 0
        };

        const response = await axios.post(
            `${shiprocketConfig.baseURL}/orders/create/adhoc`,
            shiprocketOrderData,
            {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const { order_id, shipment_id } = response.data;

        // ================= GET COURIER =================
        const courierId = await getCourierId(
            orderData.shippingAddress.postalCode,
            orderData.shippingAddress.postalCode
        );

        // ================= ASSIGN AWB =================
        const awbData = await assignAWB(shipment_id, courierId);

        // ================= SAVE TO DB =================
        if (orderData._id) {
            await Order.findByIdAndUpdate(orderData._id, {
                shipmentId: shipment_id,
                awbCode: awbData.awb_code,
                shiprocketOrderId: order_id
            });
        }

        return {
            shipment_id,
            awb_code: awbData.awb_code
        };

    } catch (error) {
        console.error('Order Error:', error.response?.data || error.message);
        throw new Error('Order creation failed');
    }
};

// ================= ASSIGN AWB =================
const assignAWB = async (shipmentId, courierId) => {
    const token = await authenticateShiprocket();

    try {
        const response = await axios.post(
            `${shiprocketConfig.baseURL}/courier/assign/awb`,
            {
                shipment_id: shipmentId,
                courier_id: courierId
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                }
            }
        );

        return response.data.response.data;

    } catch (error) {
        console.error('AWB Error:', error.response?.data || error.message);
        throw new Error('AWB generation failed');
    }
};

// ================= TRACK =================
const fetchShiprocketOrderStatus = async (awbCode) => {
    try {
        const token = await authenticateShiprocket();

        const response = await axios.get(
            `${shiprocketConfig.baseURL}/courier/track/awb/${awbCode}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        return response.data;

    } catch (error) {
        console.error('Tracking Error:', error.response?.data || error.message);
        throw new Error('Tracking failed');
    }
};

// ================= CANCEL =================
const cancelOrderInShiprocket = async (shiprocketOrderId) => {
    try {
        const token = await authenticateShiprocket();

        const response = await axios.post(
            `${shiprocketConfig.baseURL}/orders/cancel`,
            { ids: [shiprocketOrderId] },
            {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                }
            }
        );

        return response.data;

    } catch (error) {
        console.error('Cancel Error:', error.response?.data || error.message);
        throw new Error('Cancel failed');
    }
};

module.exports = {
    postOrderToShiprocket,
    fetchShiprocketOrderStatus,
    cancelOrderInShiprocket
};