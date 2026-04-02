/**
 * SHIPROCKET DIAGNOSTIC v2
 * Run: node test-shiprocket-v2.js
 */

require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'https://apiv2.shiprocket.in/v1/external';
const EMAIL    = process.env.SHIPROCKET_EMAIL;
const PASSWORD = process.env.SHIPROCKET_PASSWORD;

const log = (label, data) => {
    console.log('\n' + '='.repeat(60));
    console.log(label);
    console.log('='.repeat(60));
    console.log(JSON.stringify(data, null, 2));
};

async function run() {
    // ── STEP 1: Auth ─────────────────────────────────────────────────
    console.log('\n[1] Authenticating...');
    let token;
    try {
        const res = await axios.post(`${BASE_URL}/auth/login`, { email: EMAIL, password: PASSWORD });
        token = res.data.token;
        console.log('✅ Auth OK');
    } catch (e) {
        log('❌ AUTH FAILED', e.response?.data || e.message);
        process.exit(1);
    }

    // ── STEP 2: Create order with pickup_location = "work" ───────────
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const orderDate = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const testOrder = {
        order_id:              `TEST-${Date.now()}`,
        order_date:            orderDate,
        pickup_location:       'work',            // ✅ correct name
        channel_id:            5486974,           // your CUSTOM channel id
        billing_customer_name: 'Test',
        billing_last_name:     'User',
        billing_address:       '123 Test Street',
        billing_city:          'Thrissur',
        billing_pincode:       '680001',
        billing_state:         'Kerala',
        billing_country:       'India',
        billing_email:         'test@example.com',
        billing_phone:         '9876543210',
        billing_isd_code:      '91',
        shipping_is_billing:   true,
        order_items: [{
            name:          'Test Product',
            sku:           'SKU-TEST-001',
            units:         1,
            selling_price: 499,
            discount:      0,
            tax:           0,
            hsn:           0,
        }],
        payment_method:      'Prepaid',
        shipping_charges:    0,
        giftwrap_charges:    0,
        transaction_charges: 0,
        total_discount:      0,
        sub_total:           499,
        length:              10,
        breadth:             10,
        height:              10,
        weight:              0.5,
    };

    log('[2] SENDING ORDER PAYLOAD', testOrder);

    try {
        const res = await axios.post(
            `${BASE_URL}/orders/create/adhoc`,
            testOrder,
            {
                headers: {
                    'Content-Type':  'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }
        );
        log('✅ ORDER CREATE RESPONSE (HTTP ' + res.status + ')', res.data);

        const orderId = res.data?.order_id || res.data?.payload?.order_id;
        const shipmentId = res.data?.shipment_id || res.data?.payload?.shipment_id;
        console.log('\n>> order_id:', orderId);
        console.log('>> shipment_id:', shipmentId);

        // ── STEP 3: Verify the order exists in Shiprocket ────────────
        if (orderId) {
            console.log('\n[3] Verifying order in Shiprocket...');
            try {
                const verify = await axios.get(`${BASE_URL}/orders/show/${orderId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                log('✅ ORDER FOUND IN SHIPROCKET', verify.data);
            } catch (e) {
                log('❌ ORDER NOT FOUND', e.response?.data || e.message);
            }
        }

    } catch (e) {
        log('❌ ORDER CREATE FAILED', e.response?.data || e.message);
        console.log('\nHTTP Status:', e.response?.status);
        console.log('Headers sent:', e.config?.headers);
    }
}

run().catch(console.error);