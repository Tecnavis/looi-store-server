// shiprocketConfig.js
module.exports = {
    baseURL: process.env.SHIPROCKET_API_BASE_URL || 'https://apiv2.shiprocket.in/v1/external',
    email: process.env.SHIPROCKET_EMAIL,
    password: process.env.SHIPROCKET_PASSWORD,
    pickupLocation: 'work',   // ✅ Fixed: matches your MADARI TRADERS pickup location
};