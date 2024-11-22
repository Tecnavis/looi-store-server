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
            billing_state: orderData.shippingAddress.state, 
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
            is_return: 0 // Indicating a forward (non-return) shipment
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
        // Save `shipment_id` and `awb_code` in the database
        const { shipment_id, awb_code } = response.data;

        await Order.findByIdAndUpdate(orderData._id, {

            shipmentId: shipment_id,
            awbCode: awb_code
        });

        console.log('Shiprocket Order Created:', response.data);
        await generateAWB(shipment_id);
        return response.data;
    } catch (error) {
        console.error('Error posting order to Shiprocket:', error.message);
        throw new Error('Failed to post order to Shiprocket');
    }
};

// generate AWB
// const generateAWB = async (shipmentId) => {
//     const API_URL = 'https://apiv2.shiprocket.in/v1/external/courier/assign/awb';

//     const token = await authenticateShiprocket();

//     try {
//         const response = await axios.post(
//             API_URL,
//             {
//                 shipment_id: shipmentId, // Replace with the actual Shipment ID
//                 courier_id: null,       // Optional: leave null for auto-assignment
//             },
//             {
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${token}`
//                 }
//             }
//         );

//         // Check if the AWB generation is successful
//         if (response.data.status_code === 1) {
//             console.log('AWB Generated Successfully');
//             console.log('AWB Code:', response.data.response.data.awb_code);
//             console.log('Courier Name:', response.data.response.data.courier_company);
//         } else {
//             console.error('Error in AWB Generation:', response.data.message);
//         }
//     } catch (error) {
//         console.error('AWB Generation Failed:', error.response?.data || error.message);
//     }
// };

const generateAWB = async (shipmentId) => {
    const API_URL = 'https://apiv2.shiprocket.in/v1/external/courier/assign/awb';
    const token = await authenticateShiprocket();
    try {
      const response = await axios.post(
        API_URL,
        {
          shipment_id: shipmentId, 
          courier_id: null,         // Optional: leave null for auto-assignment
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );
  
      // Check if the AWB generation is successful
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


//   order status
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
            return response.data.tracking_data; // Returns tracking details
        } else {
            console.error('Failed to fetch status:', response.data.message);
            throw new Error(response.data.message || 'Failed to fetch order status');
        }
    } catch (error) {
        console.error('Error fetching order status:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Error fetching Shiprocket order status');
    }
};

// track order

// const trackShipmentById = async (shipmentId) => {
//     try {
//         const token = await authenticateShiprocket();
//         const response = await axios.get(
//             `https://apiv2.shiprocket.in/v1/external/courier/track/shipment/${shipmentId}`,
//             {
//                 headers: {
//                     Authorization: `Bearer ${token}`,
//                     'Content-Type': 'application/json',
//                 },
//             }
//         );

//         if (response.data.status_code === 1) {
//             console.log('Tracking Details:', response.data.tracking_data);
//             return response.data.tracking_data; // Tracking information
//         } else {
//             console.error('Failed to fetch tracking:', response.data.message);
//             return null;
//         }
//     } catch (error) {
//         console.error('Error tracking shipment:', error.response?.data || error.message);
//         return null;
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

module.exports = { postOrderToShiprocket,cancelOrderInShiprocket ,generateAWB,fetchShiprocketOrderStatus};
