// const transporter = require('../config/emailConfig');
// const { getOrderConfirmationTemplate } = require('../utils/emailTemplate');

// const sendOrderConfirmationEmail = async (order) => {
//     try {
//         if (!order.email) {
//             console.error('No email address provided for order:', order.orderId);
//             return;
//         }

//         const mailOptions = {
//             from: process.env.EMAIL_USER,
//             to: order.email,
//             subject: `Order Confirmation - ${order.orderId}`,
//             html: getOrderConfirmationTemplate(order)
//         };

//         const info = await transporter.sendMail(mailOptions);
//         console.log('Order confirmation email sent:', info.messageId);
//         return true;
//     } catch (error) {
//         console.error('Error sending order confirmation email:', error);
//         throw error;
//     }
// };

// module.exports = {
//     sendOrderConfirmationEmail
// };