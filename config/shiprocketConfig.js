// shiprocketConfig.js
module.exports = {
    baseURL: 'https://apiv2.shiprocket.in/v1/external',
    email: process.env.SHIPROCKET_EMAIL, // Set your Shiprocket email in .env
    password: process.env.SHIPROCKET_PASSWORD, // Set your Shiprocket password in .env
    pickupLocation: 'Primary', // Your pickup location
};
