// shiprocketConfig.js
module.exports = {
    baseURL:        process.env.SHIPROCKET_API_BASE_URL || 'https://apiv2.shiprocket.in/v1/external',
    email:          process.env.SHIPROCKET_EMAIL,
    password:       process.env.SHIPROCKET_PASSWORD,
    pickupLocation: 'work',    // ✅ exact pickup location name from Shiprocket account
    channelId:      5486974,   // ✅ your CUSTOM channel id
};
