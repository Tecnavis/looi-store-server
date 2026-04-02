// utils/shiprocketService.js
const axios = require('axios');
const shiprocketConfig = require('../config/shiprocketConfig');
const Order = require('../models/orderModel');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Shiprocket requires date as "YYYY-MM-DD HH:MM"
 * It REJECTS ISO strings like "2026-04-02T10:30:00.000Z"
 */
const formatShiprocketDate = (date) => {
    const d = new Date(date);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// ─── Authenticate ─────────────────────────────────────────────────────────────

const authenticateShiprocket = async () => {
    try {
        const response = await axios.post(`${shiprocketConfig.baseURL}/auth/login`, {
            email:    shiprocketConfig.email,
            password: shiprocketConfig.password,
        });
        return response.data.token;
    } catch (error) {
        console.error('[Shiprocket] Auth Error:', JSON.stringify(error.response?.data || error.message, null, 2));
        throw new Error('Failed to authenticate with Shiprocket');
    }
};

// ─── Post Order ───────────────────────────────────────────────────────────────

const postOrderToShiprocket = async (orderData) => {
    try {
        const token = await authenticateShiprocket();

        // order_items — flat, NO nested dimensions object
        const orderItems = orderData.orderItems.map(item => ({
            name:          item.productName,
            sku:           item.sku || `SKU-${Date.now()}`,
            units:         Number(item.quantity),
            selling_price: Number(item.price),
            discount:      0,
            tax:           0,
            hsn:           item.hsn || 0,
        }));

        const firstItem = orderData.orderItems[0];

        const payload = {
            order_id:              orderData.orderId,
            order_date:            formatShiprocketDate(orderData.orderDate), // ✅ correct format
            pickup_location:       shiprocketConfig.pickupLocation,           // ✅ "work"
            channel_id:            shiprocketConfig.channelId,                // ✅ 5486974

            billing_customer_name: orderData.shippingAddress.firstName,
            billing_last_name:     orderData.shippingAddress.lastName  || '',
            billing_address:       orderData.shippingAddress.houseBuilding,
            billing_address_2:     orderData.shippingAddress.streetArea || '',
            billing_city:          orderData.shippingAddress.cityDistrict,
            billing_pincode:       String(orderData.shippingAddress.postalCode),
            billing_state:         orderData.shippingAddress.state,
            billing_country:       'India',
            billing_email:         orderData.email || '',
            billing_phone:         String(orderData.shippingAddress.phoneNumber || orderData.shippingAddress.phone || '0000000000'),
            billing_isd_code:      '91',

            shipping_is_billing:   true,

            order_items:           orderItems, // ✅ no nested dimensions

            payment_method:        orderData.paymentMethod === 'COD' ? 'COD' : 'Prepaid',
            shipping_charges:      0,
            giftwrap_charges:      0,
            transaction_charges:   0,
            total_discount:        0,
            sub_total:             Number(orderData.totalAmount),

            // Package dimensions at ORDER root level (correct placement)
            length:                firstItem.length || 10,
            breadth:               firstItem.width  || 10,
            height:                firstItem.height || 10,
            weight:                firstItem.weight || 0.5,
        };

        console.log('[Shiprocket] Sending payload:', JSON.stringify(payload, null, 2));

        // ── Pre-flight check: warn if any critical field is empty/null ────────
        const requiredFields = ['order_id', 'order_date', 'billing_customer_name',
            'billing_address', 'billing_city', 'billing_pincode', 'billing_state',
            'billing_phone', 'sub_total'];
        const emptyFields = requiredFields.filter(f => !payload[f]);
        if (emptyFields.length > 0) {
            console.error('[Shiprocket] ⚠️  PRE-FLIGHT: Missing/empty required fields:', emptyFields);
        }

        const response = await axios.post(
            `${shiprocketConfig.baseURL}/orders/create/adhoc`,
            payload,
            { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } }
        );

        console.log('[Shiprocket] Response:', JSON.stringify(response.data, null, 2));

        // Shiprocket returns IDs at root OR inside payload — handle both
        const payload_data = response.data?.payload || response.data;
        const order_id    = payload_data?.order_id    || response.data?.order_id;
        const shipment_id = payload_data?.shipment_id || response.data?.shipment_id;
        const awb_code    = payload_data?.awb_code    || response.data?.awb_code;

        console.log('[Shiprocket] Parsed IDs → order_id:', order_id, '| shipment_id:', shipment_id);

        // Save Shiprocket IDs back to DB
        if (orderData._id) {
            const fields = {};
            if (order_id)    fields.shiprocket_order_id = String(order_id);
            if (shipment_id) fields.shipmentId          = String(shipment_id);
            if (awb_code)    fields.awbCode             = awb_code;
            if (Object.keys(fields).length) {
                await Order.findByIdAndUpdate(orderData._id, fields);
                console.log('[Shiprocket] Saved IDs to DB:', fields);
            }
        }

        // Auto-assign AWB (pass token to avoid a second auth round-trip)
        if (shipment_id) {
            await generateAWB(shipment_id, token);
        }

        // Return a normalised object so callers always get order_id at root
        return { ...response.data, order_id, shipment_id, awb_code };

    } catch (error) {
        const detail = error.response?.data || error.message;
        console.error('[Shiprocket] Order Error (full):', JSON.stringify(detail, null, 2));
        console.error('[Shiprocket] HTTP status:', error.response?.status);
        console.error('[Shiprocket] Payload that was sent:', JSON.stringify(
            // re-log just the top-level fields so we can see what Shiprocket got
            Object.fromEntries(
                Object.entries(error.config?.data ? JSON.parse(error.config.data) : {})
                    .filter(([k]) => !['order_items'].includes(k))
            ), null, 2
        ));
        throw new Error('Failed to post order to Shiprocket: ' + JSON.stringify(detail));
    }
};

// ─── Generate AWB ─────────────────────────────────────────────────────────────

const generateAWB = async (shipmentId, existingToken = null) => {
    try {
        const token = existingToken || await authenticateShiprocket();
        const response = await axios.post(
            `${shiprocketConfig.baseURL}/courier/assign/awb`,
            { shipment_id: shipmentId, courier_id: null },
            { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } }
        );
        if (response.data.status_code === 1) {
            console.log('[Shiprocket] AWB Generated:', response.data.response?.data?.awb_code);
            console.log('[Shiprocket] Courier:', response.data.response?.data?.courier_company);
        } else {
            console.error('[Shiprocket] AWB failed:', JSON.stringify(response.data, null, 2));
        }
        return response.data;
    } catch (error) {
        // Non-fatal — order is still visible in Shiprocket dashboard without AWB
        console.error('[Shiprocket] AWB Error:', JSON.stringify(error.response?.data || error.message, null, 2));
    }
};

// ─── Fetch Order Status ───────────────────────────────────────────────────────

const fetchShiprocketOrderStatus = async (shipmentId) => {
    try {
        const token = await authenticateShiprocket();
        const response = await axios.get(
            `${shiprocketConfig.baseURL}/courier/track/shipment/${shipmentId}`,
            { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
        );
        if (response.data?.status_code === 1) return response.data.tracking_data;
        throw new Error(response.data.message || 'Failed to fetch order status');
    } catch (error) {
        console.error('[Shiprocket] Status Error:', JSON.stringify(error.response?.data || error.message, null, 2));
        throw error;
    }
};

// ─── Cancel Order ─────────────────────────────────────────────────────────────

const cancelOrderInShiprocket = async ({ orderId, shiprocket_order_id }) => {
    try {
        const token = await authenticateShiprocket();
        if (!shiprocket_order_id) throw new Error('shiprocket_order_id is required');
        const response = await axios.post(
            `${shiprocketConfig.baseURL}/orders/cancel`,
            { ids: [shiprocket_order_id] },
            { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } }
        );
        console.log('[Shiprocket] Cancelled order:', shiprocket_order_id);
        return response.data;
    } catch (error) {
        console.error('[Shiprocket] Cancel Error:', JSON.stringify(error.response?.data || error.message, null, 2));
        throw error;
    }
};

module.exports = {
    postOrderToShiprocket,
    cancelOrderInShiprocket,
    generateAWB,
    fetchShiprocketOrderStatus,
};