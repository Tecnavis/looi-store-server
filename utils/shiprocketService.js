// Shiprocket disabled intentionally

module.exports = {
  createShippingOrder: async () => {
    return {
      success: false,
      message: "Shiprocket disabled"
    };
  }
};
