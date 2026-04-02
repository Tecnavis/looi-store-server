module.exports = {
    baseURL: 'https://apiv2.shiprocket.in/v1/external',
    email: process.env.SHIPROCKET_EMAIL, // API USER EMAIL
    password: process.env.SHIPROCKET_PASSWORD, // API USER PASSWORD
    pickupLocation: 'Primary', // Must match Shiprocket panel exactly
};