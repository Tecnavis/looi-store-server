// shiprocketService.js
const axios = require('axios');
const shiprocketConfig = require('../config/shiprocketConfig');

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
        console.error('Shiprocket Authentication Error:', error.message);
        throw new Error('Failed to authenticate with Shiprocket');
    }
};

// Post an order to Shiprocket
const postOrderToShiprocket = async (orderData) => {
    try {
        const token = await authenticateShiprocket();
        
        const shiprocketOrderData = {
            order_id: orderData.orderId,
            order_date: orderData.orderDate.toISOString(),
            pickup_location: shiprocketConfig.pickupLocation,
            billing_customer_name: orderData.shippingAddress.firstName,
            billing_last_name: orderData.shippingAddress.lastName,
            billing_address: orderData.shippingAddress.houseBuilding,
            billing_city: orderData.shippingAddress.cityDistrict,
            billing_pincode: orderData.shippingAddress.postalCode,
            // billing_state: orderData.shippingAddress.state,
            billing_state: "California", 
            // billing_country: orderData.shippingAddress.country,
            billing_country: "India",
            billing_email: orderData.email,
            billing_phone: orderData.shippingAddress.phoneNumber,
            shipping_is_billing: true,
            order_items: orderData.orderItems.map(item => ({
                name: item.productName,
                sku: item.sku,
                units: item.quantity,
                selling_price: item.price,
                discount: 0, // Adjust if any discounts
                tax: 0, // Adjust if any tax
                hsn: item.hsn,
                dimensions: {
                    length: item.length,
                    width: item.width,
                    height: item.height,
                    weight: item.weight
                }
            })),
            payment_method: orderData.paymentMethod === 'COD' ? 'COD' : 'Prepaid',
            sub_total: orderData.totalAmount,
            length: orderData.orderItems[0].length, // Sample, may require adjustments
            breadth: orderData.orderItems[0].width,
            height: orderData.orderItems[0].height,
            weight: orderData.orderItems[0].weight,
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

        console.log('Shiprocket Order Created:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error posting order to Shiprocket:', error.message);
        throw new Error('Failed to post order to Shiprocket');
    }
};

// cancel each order
// const cancelOrderInShiprocket = async (shiprocketOrderId) => {
//     try {
//         const token = await authenticateShiprocket();

//         const response = await axios.post(
//             'https://apiv2.shiprocket.in/v1/external/orders/cancel',
//             {
//                 ids: [shiprocketOrderId] // Array of Shiprocket order IDs to cancel
//             },
//             {
//                 headers: {
//                     'Content-Type': 'application/json',
//                     Authorization: `Bearer ${token}`
//                 }
//             }
//         );

//         console.log('Order canceled successfully:', response.data);
//         return response.data;
//     } catch (error) {
//         console.error('Error canceling order in Shiprocket:', error.message);
//         throw new Error('Failed to cancel order in Shiprocket');
//     }
// };


const cancelOrderInShiprocket = async ({ orderId, shiprocket_order_id }) => {
    try {
        const token = await authenticateShiprocket();
        
        if (!shiprocket_order_id) {
            throw new Error('Shiprocket order ID is required');
        }

        const response = await axios.post(
            'https://apiv2.shiprocket.in/v1/external/orders/cancel',
            {
                ids: [shiprocket_order_id]
            },
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

        // Throw a more detailed error
        throw new Error(
            error.response?.data?.message || 
            error.message || 
            'Failed to cancel order in Shiprocket'
        );
    }
};



module.exports = { postOrderToShiprocket,cancelOrderInShiprocket };
