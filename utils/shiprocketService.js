// shiprocketService.js
const axios = require('axios');
const shiprocketConfig = require('../config/shiprocketConfig');
const Order = require('../models/orderModel');

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Format a JS Date to Shiprocket's required format: "YYYY-MM-DD HH:MM"
 * Shiprocket REJECTS ISO strings like "2026-04-02T10:30:00.000Z"
 */
const formatShiprocketDate = (date) => {
    const d = new Date(date);
    const yyyy = d.getFullYear();
    const MM   = String(d.getMonth() + 1).padStart(2, '0');
    const dd   = String(d.getDate()).padStart(2, '0');
    const HH   = String(d.getHours()).padStart(2, '0');
    const mm   = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${MM}-${dd} ${HH}:${mm}`;
};

// ─── Authenticate ────────────────────────────────────────────────────────────

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
        const detail = error.response?.data || error.message;
        console.error('[Shiprocket] Auth Error:', JSON.stringify(detail, null, 2));
        throw new Error('Failed to authenticate with Shiprocket');
    }
};

// ─── Post Order ──────────────────────────────────────────────────────────────

const postOrderToShiprocket = async (orderData) => {
    try {
        const token = await authenticateShiprocket();

        // FIX 1: Correct date format "YYYY-MM-DD HH:MM" — NOT ISO string
        const formattedDate = formatShiprocketDate(orderData.orderDate);

        // FIX 2: order_items must NOT contain nested dimensions object
        //         Dimensions go at the top-level of the order payload only
        const orderItems = orderData.orderItems.map(item => ({
            name:          item.productName,
            sku:           item.sku || `SKU-${Date.now()}`,
            units:         item.quantity,
            selling_price: item.price,
            discount:      0,
            tax:           0,
            hsn:           item.hsn || 0,
        }));

        // Use first item's dimensions for the shipment package
        const firstItem = orderData.orderItems[0];

        const shiprocketOrderData = {
            order_id:              orderData.orderId,
            order_date:            formattedDate,              // FIX 1
            pickup_location:       shiprocketConfig.pickupLocation,
            channel_id:            '',
            comment:               '',

            // Billing info
            billing_customer_name: orderData.shippingAddress.firstName,
            billing_last_name:     orderData.shippingAddress.lastName || '',
            billing_address:       orderData.shippingAddress.houseBuilding,
            billing_address_2:     orderData.shippingAddress.streetArea || '',
            billing_city:          orderData.shippingAddress.cityDistrict,
            billing_pincode:       String(orderData.shippingAddress.postalCode),
            billing_state:         orderData.shippingAddress.state,
            billing_country:       'India',
            billing_email:         orderData.email || '',
            billing_phone:         String(orderData.shippingAddress.phoneNumber),
            billing_isd_code:      '91',

            // Shipping same as billing
            shipping_is_billing:   true,

            // FIX 2: No nested dimensions inside order_items
            order_items:           orderItems,

            payment_method:        orderData.paymentMethod === 'COD' ? 'COD' : 'Prepaid',
            shipping_charges:      0,
            giftwrap_charges:      0,
            transaction_charges:   0,
            total_discount:        0,
            sub_total:             Number(orderData.totalAmount),

            // Package dimensions at ORDER root (correct placement)
            length:                firstItem.length || 10,
            breadth:               firstItem.width  || 10,
            height:                firstItem.height || 10,
            weight:                firstItem.weight || 0.5,
        };

        console.log('[Shiprocket] Sending payload:', JSON.stringify(shiprocketOrderData, null, 2));

        const response = await axios.post(
            `${shiprocketConfig.baseURL}/orders/create/adhoc`,
            shiprocketOrderData,
            {
                headers: {
                    'Content-Type':  'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        // FIX 3: Log full response so you can see exactly what Shiprocket returns
        console.log('[Shiprocket] Response:', JSON.stringify(response.data, null, 2));

        // Save Shiprocket IDs back to your DB
        const { order_id, shipment_id, awb_code } = response.data;

        if (orderData._id) {
            const updateFields = {};
            if (order_id)    updateFields.shiprocket_order_id = order_id;
            if (shipment_id) updateFields.shipmentId          = shipment_id;
            if (awb_code)    updateFields.awbCode             = awb_code;

            if (Object.keys(updateFields).length > 0) {
                await Order.findByIdAndUpdate(orderData._id, updateFields);
                console.log('[Shiprocket] DB updated with IDs:', updateFields);
            }
        }

        // Auto-generate AWB if shipment_id returned
        if (shipment_id) {
            await generateAWB(shipment_id);
        }

        return response.data;

    } catch (error) {
        // FIX 3: Always log the full Shiprocket error body, not just error.message
        const detail = error.response?.data || error.message;
        console.error('[Shiprocket] Error posting order:', JSON.stringify(detail, null, 2));
        throw new Error('Failed to post order to Shiprocket');
    }
};

// ─── Generate AWB ────────────────────────────────────────────────────────────

const generateAWB = async (shipmentId) => {
    try {
        const token = await authenticateShiprocket();

        const response = await axios.post(
            `${shiprocketConfig.baseURL}/courier/assign/awb`,
            {
                shipment_id: shipmentId,
                courier_id:  null, // null = auto-assign best courier
            },
            {
                headers: {
                    'Content-Type':  'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        if (response.data.status_code === 1) {
            console.log('[Shiprocket] AWB Generated:', response.data.response?.data?.awb_code);
            console.log('[Shiprocket] Courier:', response.data.response?.data?.courier_company);
        } else {
            console.error('[Shiprocket] AWB failed:', JSON.stringify(response.data, null, 2));
        }

        return response.data;

    } catch (error) {
        const detail = error.response?.data || error.message;
        console.error('[Shiprocket] AWB Error:', JSON.stringify(detail, null, 2));
        // Non-fatal — order is still in Shiprocket dashboard even if AWB fails
    }
};

// ─── Fetch Order Status ──────────────────────────────────────────────────────

const fetchShiprocketOrderStatus = async (shipmentId) => {
    try {
        const token = await authenticateShiprocket();

        const response = await axios.get(
            `${shiprocketConfig.baseURL}/courier/track/shipment/${shipmentId}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type':  'application/json',
                },
            }
        );

        if (response.data?.status_code === 1) {
            return response.data.tracking_data;
        } else {
            console.error('[Shiprocket] Status fetch failed:', JSON.stringify(response.data, null, 2));
            throw new Error(response.data.message || 'Failed to fetch order status');
        }

    } catch (error) {
        const detail = error.response?.data || error.message;
        console.error('[Shiprocket] Status Error:', JSON.stringify(detail, null, 2));
        throw new Error(detail?.message || 'Error fetching Shiprocket order status');
    }
};

// ─── Cancel Order ────────────────────────────────────────────────────────────

const cancelOrderInShiprocket = async ({ orderId, shiprocket_order_id }) => {
    try {
        const token = await authenticateShiprocket();

        if (!shiprocket_order_id) {
            throw new Error('Shiprocket order ID is required for cancellation');
        }

        const response = await axios.post(
            `${shiprocketConfig.baseURL}/orders/cancel`,
            { ids: [shiprocket_order_id] },
            {
                headers: {
                    'Content-Type':  'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        if (!response.data || response.status !== 200) {
            throw new Error('Invalid response from Shiprocket during cancellation');
        }

        console.log('[Shiprocket] Cancelled:', { orderId, shiprocket_order_id });
        return response.data;

    } catch (error) {
        const detail = error.response?.data || error.message;
        console.error('[Shiprocket] Cancel Error:', JSON.stringify(detail, null, 2));
        throw new Error(detail?.message || error.message || 'Failed to cancel order in Shiprocket');
    }
};

module.exports = {
    postOrderToShiprocket,
    cancelOrderInShiprocket,
    generateAWB,
    fetchShiprocketOrderStatus
};
