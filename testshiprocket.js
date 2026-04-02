/**
 * SHIPROCKET DIAGNOSTIC SCRIPT
 * Run this on your server: node test-shiprocket.js
 * It will show you EXACTLY what Shiprocket API returns at each step.
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
    // ── STEP 1: Authenticate ──────────────────────────────────────────
    console.log('\n[1] Authenticating with:', EMAIL);
    let token;
    try {
        const res = await axios.post(`${BASE_URL}/auth/login`, { email: EMAIL, password: PASSWORD });
        token = res.data.token;
        log('AUTH SUCCESS', { token: token?.slice(0, 40) + '...' });
    } catch (e) {
        log('AUTH FAILED', e.response?.data || e.message);
        process.exit(1);
    }

    // ── STEP 2: Check pickup locations ───────────────────────────────
    console.log('\n[2] Fetching your pickup locations...');
    try {
        const res = await axios.get(`${BASE_URL}/settings/company/pickup`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        log('PICKUP LOCATIONS', res.data);
    } catch (e) {
        log('PICKUP LOCATIONS FAILED', e.response?.data || e.message);
    }

    // ── STEP 3: Check channels ───────────────────────────────────────
    console.log('\n[3] Fetching your channels...');
    try {
        const res = await axios.get(`${BASE_URL}/channels`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        log('CHANNELS', res.data);
    } catch (e) {
        log('CHANNELS FAILED', e.response?.data || e.message);
    }

    // ── STEP 4: Try creating a test order ────────────────────────────
    console.log('\n[4] Creating a test order...');

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const orderDate = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const testOrder = {
        order_id:              `TEST-${Date.now()}`,
        order_date:            orderDate,
        pickup_location:       'Primary',            // ← Change if your pickup is named differently
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

    log('SENDING PAYLOAD', testOrder);

    try {
        const res = await axios.post(
            `${BASE_URL}/orders/create/adhoc`,
            testOrder,
            { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } }
        );
        log('ORDER CREATE SUCCESS ✅', res.data);
    } catch (e) {
        log('ORDER CREATE FAILED ❌', e.response?.data || e.message);
        if (e.response?.data?.errors) {
            console.log('\n⚠️  VALIDATION ERRORS:');
            console.log(JSON.stringify(e.response.data.errors, null, 2));
        }
    }
}

run().catch(console.error);