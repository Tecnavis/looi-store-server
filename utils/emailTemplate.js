// // utils/emailTemplates.js
// const getOrderConfirmationTemplate = (order) => {
//     return `
//         <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
//             <h1 style="color: #333; text-align: center;">Order Confirmation</h1>
//             <p>Dear ${order.shippingAddress.firstName},</p>
//             <p>Thank you for your order! Here are your order details:</p>
            
//             <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px;">
//                 <p><strong>Order ID:</strong> ${order.orderId}</p>
//                 <p><strong>Order Date:</strong> ${new Date(order.orderDate).toLocaleDateString()}</p>
//                 <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
//                 <p><strong>Payment Status:</strong> ${order.paymentStatus}</p>
//             </div>

//             <h3>Order Items:</h3>
//             <table style="width: 100%; border-collapse: collapse;">
//                 <tr style="background-color: #f8f9fa;">
//                     <th style="padding: 10px; text-align: left;">Product</th>
//                     <th style="padding: 10px; text-align: right;">Quantity</th>
//                     <th style="padding: 10px; text-align: right;">Price</th>
//                 </tr>
//                 ${order.orderItems.map(item => `
//                     <tr>
//                         <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.productName}</td>
//                         <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">${item.quantity}</td>
//                         <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">₹${item.price}</td>
//                     </tr>
//                 `).join('')}
//                 <tr>
//                     <td colspan="2" style="padding: 10px; text-align: right;"><strong>Total Amount:</strong></td>
//                     <td style="padding: 10px; text-align: right;"><strong>₹${order.totalAmount}</strong></td>
//                 </tr>
//             </table>

//             <div style="margin-top: 20px;">
//                 <h3>Shipping Address:</h3>
//                 <p>
//                     ${order.shippingAddress.firstName} ${order.shippingAddress.lastName}<br>
//                     ${order.shippingAddress.houseBuilding}<br>
//                     ${order.shippingAddress.streetArea}<br>
//                     ${order.shippingAddress.cityDistrict}, ${order.shippingAddress.postalCode}
//                 </p>
//             </div>

//             <p style="margin-top: 20px;">
//                 If you have any questions about your order, please contact our customer support.
//             </p>
//         </div>
//     `;
// };

// module.exports = {
//     getOrderConfirmationTemplate
// };