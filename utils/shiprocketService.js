// utils/shiprocketService.js
const axios = require('axios');
const shiprocketConfig = require('../config/shiprocketConfig');
const Order = require('../models/orderModel');

const BASE = shiprocketConfig.baseURL || 'https://apiv2.shiprocket.in/v1/external';

// ─── Token cache — reuse token for 4 hours, prevents account lockout ──────────
let _cachedToken = null;
let _tokenExpiry  = 0;

const getToken = async () => {
    const now = Date.now();
    if (_cachedToken && now < _tokenExpiry) {
        console.log('[SR] Using cached token');
        return _cachedToken;
    }
    console.log('[SR] Authenticating...');
    const res = await axios.post(`${BASE}/auth/login`, {
        email:    shiprocketConfig.email,
        password: shiprocketConfig.password,
    });
    if (!res.data?.token) throw new Error('No token in Shiprocket auth response');
    _cachedToken = res.data.token;
    _tokenExpiry  = now + (4 * 60 * 60 * 1000); // 4 hours
    console.log('[SR] Auth OK, token cached for 4h');
    return _cachedToken;
};

// ─── Date formatter ───────────────────────────────────────────────────────────
const fmtDate = (date) => {
    const d = new Date(date);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

// ─── Build payload ────────────────────────────────────────────────────────────
const buildPayload = (orderData) => {
    const addr = orderData.shippingAddress || {};
    const phone = String(
        addr.phoneNumber || addr.phone || addr.mobile || '0000000000'
    ).replace(/\D/g, '').slice(-10) || '0000000000';

    const orderItems = (orderData.orderItems || []).map((item, i) => ({
        name:          item.productName   || `Item ${i + 1}`,
        sku:           item.sku           || `SKU-${Date.now()}-${i}`,
        units:         Number(item.quantity) || 1,
        selling_price: Number(item.price)    || 0,
        discount:      0,
        tax:           0,
        hsn:           item.hsn ? Number(item.hsn) : 0,
    }));

    const first = orderData.orderItems?.[0] || {};
    const pm    = String(orderData.paymentMethod || '').trim();

    return {
        order_id:              String(orderData.orderId),
        order_date:            fmtDate(orderData.orderDate || new Date()),
        pickup_location:       'work',
        channel_id:            5486974,

        billing_customer_name: addr.firstName    || 'Customer',
        billing_last_name:     addr.lastName     || '',
        billing_address:       addr.houseBuilding || addr.address || 'N/A',
        billing_address_2:     addr.streetArea   || '',
        billing_city:          addr.cityDistrict || addr.city    || 'N/A',
        billing_pincode:       String(addr.postalCode || addr.pincode || '000000'),
        billing_state:         addr.state        || 'N/A',
        billing_country:       'India',
        billing_email:         orderData.email   || '',
        billing_phone:         phone,
        billing_isd_code:      '91',

        shipping_is_billing:   true,
        order_items:           orderItems,

        payment_method:        pm === 'COD' ? 'COD' : 'Prepaid',
        shipping_charges:      0,
        giftwrap_charges:      0,
        transaction_charges:   0,
        total_discount:        0,
        sub_total:             Number(orderData.totalAmount) || 0,

        length:  Number(first.length) || 10,
        breadth: Number(first.width)  || 10,
        height:  Number(first.height) || 10,
        weight:  Number(first.weight) || 0.5,
    };
};

// ─── Post Order ───────────────────────────────────────────────────────────────
const postOrderToShiprocket = async (orderData) => {
    let token;
    try {
        token = await getToken();
    } catch (e) {
        // Clear cache on auth failure so next attempt retries
        _cachedToken = null;
        _tokenExpiry  = 0;
        console.error('[SR] AUTH FAILED:', e.response?.data || e.message);
        throw new Error('Shiprocket auth failed: ' + (e.response?.data?.message || e.message));
    }

    const payload = buildPayload(orderData);
    console.log('[SR] Sending payload:\n', JSON.stringify(payload, null, 2));

    let srRes;
    try {
        srRes = await axios.post(
            `${BASE}/orders/create/adhoc`,
            payload,
            { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } }
        );
    } catch (e) {
        // If 401, clear token cache and report
        if (e.response?.status === 401) {
            _cachedToken = null;
            _tokenExpiry  = 0;
        }
        console.error('[SR] ❌ HTTP ERROR:', e.response?.status);
        console.error('[SR] SR Body:', JSON.stringify(e.response?.data, null, 2));
        console.error('[SR] Payload:', JSON.stringify(payload, null, 2));
        throw new Error('[SR] HTTP error: ' + JSON.stringify(e.response?.data || e.message));
    }

    const data = srRes.data;
    console.log('[SR] Raw response:', JSON.stringify(data, null, 2));

    // Shiprocket returns HTTP 200 even on failure — check status field
    if (data?.status === 0 || data?.status_code === 0) {
        const errMsg = data?.message || data?.error || JSON.stringify(data);
        console.error('[SR] ❌ Rejected (HTTP 200 but status=0):', errMsg);
        throw new Error('[SR] Rejected: ' + errMsg);
    }

    const p           = data?.payload || data;
    const order_id    = p?.order_id    ?? data?.order_id;
    const shipment_id = p?.shipment_id ?? data?.shipment_id;
    const awb_code    = p?.awb_code    ?? data?.awb_code;

    if (!order_id) {
        console.error('[SR] ❌ No order_id in response:', JSON.stringify(data, null, 2));
        throw new Error('[SR] No order_id returned: ' + JSON.stringify(data));
    }

    console.log(`[SR] ✅ order_id=${order_id} | shipment_id=${shipment_id}`);

    if (orderData._id) {
        const update = {};
        if (order_id)    update.shiprocket_order_id = String(order_id);
        if (shipment_id) update.shipmentId           = String(shipment_id);
        if (awb_code)    update.awbCode              = awb_code;
        if (Object.keys(update).length) {
            await Order.findByIdAndUpdate(orderData._id, update);
            console.log('[SR] Saved to DB:', update);
        }
    }

    if (shipment_id) {
        generateAWB(shipment_id, token).catch(e =>
            console.error('[SR] AWB non-fatal:', e.message)
        );
    }

    return { ...data, order_id, shipment_id, awb_code };
};

// ─── Re-push existing DB order ────────────────────────────────────────────────
const repushOrderById = async (dbOrderId) => {
    const order = await Order.findById(dbOrderId);
    if (!order) throw new Error('Order not found: ' + dbOrderId);
    return postOrderToShiprocket({
        _id:             order._id,
        orderId:         order.orderId + '-R' + Date.now(),
        orderDate:       order.orderDate,
        orderItems:      order.orderItems,
        shippingAddress: order.shippingAddress,
        paymentMethod:   order.paymentMethod,
        totalAmount:     order.totalAmount,
        email:           order.email,
    });
};

// ─── Generate AWB ─────────────────────────────────────────────────────────────
const generateAWB = async (shipmentId, existingToken = null) => {
    const token = existingToken || await getToken();
    const res = await axios.post(
        `${BASE}/courier/assign/awb`,
        { shipment_id: String(shipmentId), courier_id: null },
        { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } }
    );
    if (res.data?.status_code === 1) {
        console.log('[SR] AWB:', res.data.response?.data?.awb_code);
    } else {
        console.error('[SR] AWB failed:', JSON.stringify(res.data, null, 2));
    }
    return res.data;
};

// ─── Track ────────────────────────────────────────────────────────────────────
const fetchShiprocketOrderStatus = async (shipmentId) => {
    const token = await getToken();
    const res = await axios.get(
        `${BASE}/courier/track/shipment/${shipmentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
    );
    if (res.data?.status_code === 1) return res.data.tracking_data;
    throw new Error(res.data?.message || 'Failed to fetch status');
};

// ─── Cancel ───────────────────────────────────────────────────────────────────
const cancelOrderInShiprocket = async ({ orderId, shiprocket_order_id }) => {
    if (!shiprocket_order_id) throw new Error('shiprocket_order_id is required to cancel');
    const token = await getToken();
    const res = await axios.post(
        `${BASE}/orders/cancel`,
        { ids: [Number(shiprocket_order_id)] },
        { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } }
    );
    console.log('[SR] Cancelled:', shiprocket_order_id);
    return res.data;
};

module.exports = {
    postOrderToShiprocket,
    repushOrderById,
    cancelOrderInShiprocket,
    generateAWB,
    fetchShiprocketOrderStatus,
};