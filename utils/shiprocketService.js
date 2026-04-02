// shiprocketService.js
const axios = require('axios');
const shiprocketConfig = require('../config/shiprocketConfig');
const Order = require('../models/orderModel');

// Authenticate with Shiprocket to get a token
const authenticateShiprocket = async () => {
    try {
        const response = await axios.post(
            `${shiprocketConfig.baseURL}/auth/login`,
            {
                email: shiprocketConfig.email,
                password: shiprocketConfig.password
            }
        );
        return response.data.token;
    } catch (error) {
        console.error('Shiprocket Authentication Error:', error.response?.data || error.message);
        throw new Error('Failed to authenticate with Shiprocket');
    }
};

// Post an order to Shiprocket
const postOrderToShiprocket = async (orderData) => {
    try {
        const token = await authenticateShiprocket();

        const firstItem = orderData.orderItems[0];

        const shiprocketOrderData = {
            order_id: orderData.orderId,
            // FIX: Shiprocket expects "YYYY-MM-DD HH:MM" not full ISO string
            order_date: new Date(orderData.orderDate).toISOString().replace('T', ' ').substring(0, 16),
            pickup_location: shiprocketConfig.pickupLocation,
            billing_customer_name: orderData.shippingAddress.firstName,
            billing_last_name: orderData.shippingAddress.lastName || '',
            billing_address: orderData.shippingAddress.houseBuilding,
            billing_city: orderData.shippingAddress.cityDistrict,
            billing_pincode: orderData.shippingAddress.postalCode,
            billing_state: orderData.shippingAddress.state,
            billing_country: 'India',
            billing_email: orderData.email,
            // FIX: guarantee phone is never empty
            billing_phone: orderData.shippingAddress.phoneNumber || '0000000000',
            shipping_is_billing: true,
            // FIX: flat dimensions per item (not nested), guaranteed non-zero defaults, guaranteed sku
            order_items: orderData.orderItems.map((item, index) => ({
                name: item.productName,
                sku: item.sku || `ITEM-${index + 1}`,
                units: item.quantity,
                selling_price: item.price,
                discount: 0,
                tax: 0,
                hsn: item.hsn || '',
                length: item.length || 10,
                breadth: item.width || 10,
                height: item.height || 10,
                weight: item.weight || 0.5,
            })),
            payment_method: orderData.paymentMethod === 'COD' ? 'COD' : 'Prepaid',
            sub_total: orderData.totalAmount,
            // FIX: guaranteed non-zero defaults at order level
            length:  firstItem.length  || 10,
            breadth: firstItem.width   || 10,
            height:  firstItem.height  || 10,
            weight:  firstItem.weight  || 0.5,
            is_return: 0
        };

        console.log('Posting to Shiprocket:', JSON.stringify(shiprocketOrderData, null, 2));

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

        console.log('Shiprocket Order Created:', response.data);

        // Save shipment_id and awb_code only if we have a valid DB order _id
        const { shipment_id, awb_code } = response.data;
        if (orderData._id && (shipment_id || awb_code)) {
            await Order.findByIdAndUpdate(orderData._id, {
                shipmentId: shipment_id,
                awbCode: awb_code
            });
        }

        if (shipment_id) {
            await generateAWB(shipment_id);
        }

        return response.data;
    } catch (error) {
        // FIX: log full Shiprocket response so you can see the exact rejection reason
        console.error('Error posting order to Shiprocket:', error.message);
        console.error('Shiprocket response data:', JSON.stringify(error.response?.data, null, 2));
        throw new Error('Failed to post order to Shiprocket');
    }
};

// Generate AWB
const generateAWB = async (shipmentId) => {
    const API_URL = 'https://apiv2.shiprocket.in/v1/external/courier/assign/awb';
    const token = await authenticateShiprocket();
    try {
        const response = await axios.post(
            API_URL,
            {
                shipment_id: shipmentId,
                courier_id: null,
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        if (response.data.status_code === 1) {
            console.log('AWB Generated Successfully');
            console.log('AWB Code:', response.data.response.data.awb_code);
            console.log('Courier Name:', response.data.response.data.courier_company);
        } else {
            console.error('Error in AWB Generation:', response.data.message);
        }
    } catch (error) {
        console.error('AWB Generation Failed:', error.response?.data || error.message);
    }
};

// Fetch order status
const fetchShiprocketOrderStatus = async (shipmentId) => {
    try {
        const token = await authenticateShiprocket();
        const response = await axios.get(
            `https://apiv2.shiprocket.in/v1/external/courier/track/shipment/${shipmentId}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (response.data && response.data.status_code === 1) {
            console.log('Order Status:', response.data.tracking_data);
            return response.data.tracking_data;
        } else {
            console.error('Failed to fetch status:', response.data.message);
            throw new Error(response.data.message || 'Failed to fetch order status');
        }
    } catch (error) {
        console.error('Error fetching order status:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Error fetching Shiprocket order status');
    }
};

// Cancel order in Shiprocket
const cancelOrderInShiprocket = async ({ orderId, shiprocket_order_id }) => {
    try {
        const token = await authenticateShiprocket();

        if (!shiprocket_order_id) {
            throw new Error('Shiprocket order ID is required');
        }

        const response = await axios.post(
            'https://apiv2.shiprocket.in/v1/external/orders/cancel',
            { ids: [shiprocket_order_id] },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        if (!response.data || response.status !== 200) {
            throw new Error('Invalid response from Shiprocket');
        }

        console.log('Shiprocket order cancellation successful:', {
            orderId,
            shiprocket_order_id,
            response: response.data
        });

        return response.data;

    } catch (error) {
        console.error('Shiprocket cancellation failed:', {
            orderId,
            shiprocket_order_id,
            error: error.message
        });
        throw new Error(
            error.response?.data?.message ||
            error.message ||
            'Failed to cancel order in Shiprocket'
        );
    }
};

module.exports = { postOrderToShiprocket, cancelOrderInShiprocket, generateAWB, fetchShiprocketOrderStatus };
