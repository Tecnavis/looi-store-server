// utils/emailTemplates.js

const SERVER_URL = process.env.SERVER_URL || 'https://looi-store-server-izvs.onrender.com/api';

/**
 * Customer order confirmation email — includes tax breakdown + invoice download link
 */
const getCustomerOrderConfirmationHtml = (order) => {
    const TAX_RATE = 5; // default GST 5%
    const totalAmount = Number(order.totalAmount) || 0;
    const subtotalExclTax = totalAmount / (1 + TAX_RATE / 100);
    const totalTaxAmount = totalAmount - subtotalExclTax;
    const cgst = totalTaxAmount / 2;
    const sgst = totalTaxAmount / 2;

    const itemsHtml = order.orderItems.map(item => {
        const taxRate = Number(item.taxRate || TAX_RATE);
        const lineTotal = Number(item.price) || 0;
        const qty = Number(item.quantity) || 1;
        const unitExclTax = (lineTotal / qty) / (1 + taxRate / 100);
        const lineTaxAmt = lineTotal - (unitExclTax * qty);
        return `
        <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #333;">
                ${item.productName}
                ${item.size ? `<br><span style="font-size:12px;color:#888;">Size: ${item.size}</span>` : ''}
                ${item.color ? `<span style="font-size:12px;color:#888;"> | Color: ${item.color}</span>` : ''}
                ${item.hsn ? `<span style="font-size:11px;color:#aaa;"> | HSN: ${item.hsn}</span>` : ''}
            </td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #333; text-align: center;">${qty}</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; font-size: 12px; color: #555; text-align: right;">
                ₹${(unitExclTax * qty).toFixed(2)}<br>
                <span style="font-size:11px;color:#888;">+GST(${taxRate}%): ₹${lineTaxAmt.toFixed(2)}</span>
            </td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; font-size: 14px; font-weight:600; color: #1a1a2e; text-align: right;">₹${lineTotal.toFixed(2)}</td>
        </tr>
    `}).join('');

    const shippingAddr = order.shippingAddress || {};
    const addressLine = [
        shippingAddr.houseBuilding,
        shippingAddr.streetArea,
        shippingAddr.landmark,
        shippingAddr.cityDistrict,
        shippingAddr.state,
        shippingAddr.postalCode ? `PIN: ${shippingAddr.postalCode}` : ''
    ].filter(Boolean).join(', ');

    const invoiceUrl = `${SERVER_URL}/invoice/${order._id}`;

    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0; padding:0; background-color:#f4f4f4; font-family: 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4; padding: 32px 0;">
    <tr>
      <td align="center">
        <table width="620" cellpadding="0" cellspacing="0" style="max-width:620px; width:100%; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.07);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 32px 40px; text-align:center;">
              <h1 style="margin:0; color:#ffffff; font-size:28px; font-weight:700; letter-spacing:3px;">LOOI STORE</h1>
              <p style="margin:8px 0 0; color:rgba(255,255,255,0.7); font-size:13px; letter-spacing:1px;">ORDER CONFIRMED</p>
            </td>
          </tr>

          <!-- Success Banner -->
          <tr>
            <td style="background:#f0fdf4; padding: 20px 40px; text-align:center; border-bottom: 1px solid #dcfce7;">
              <span style="display:inline-block; background:#22c55e; color:#fff; border-radius:50%; width:40px; height:40px; line-height:40px; font-size:20px; text-align:center;">✓</span>
              <p style="margin:8px 0 0; color:#166534; font-size:15px; font-weight:600;">Your order has been placed successfully!</p>
            </td>
          </tr>

          <!-- Order ID -->
          <tr>
            <td style="padding: 28px 40px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#f8fafc; border-radius:8px; padding:16px 20px;">
                    <p style="margin:0; font-size:12px; color:#888; text-transform:uppercase; letter-spacing:1px;">Order ID</p>
                    <p style="margin:4px 0 0; font-size:20px; font-weight:700; color:#1a1a2e;">${order.orderId}</p>
                  </td>
                  <td style="background:#f8fafc; border-radius:8px; padding:16px 20px; text-align:right;">
                    <p style="margin:0; font-size:12px; color:#888; text-transform:uppercase; letter-spacing:1px;">Order Date</p>
                    <p style="margin:4px 0 0; font-size:14px; font-weight:600; color:#1a1a2e;">${new Date(order.orderDate || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Order Items -->
          <tr>
            <td style="padding: 28px 40px 0;">
              <p style="margin:0 0 12px; font-size:13px; font-weight:700; color:#888; text-transform:uppercase; letter-spacing:1px;">Order Summary</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius:8px; overflow:hidden;">
                <thead>
                  <tr style="background:#f8fafc;">
                    <th style="padding: 10px 16px; text-align:left; font-size:12px; color:#888; font-weight:600; text-transform:uppercase;">Item</th>
                    <th style="padding: 10px 16px; text-align:center; font-size:12px; color:#888; font-weight:600; text-transform:uppercase;">Qty</th>
                    <th style="padding: 10px 16px; text-align:right; font-size:12px; color:#888; font-weight:600; text-transform:uppercase;">Price (+ GST)</th>
                    <th style="padding: 10px 16px; text-align:right; font-size:12px; color:#888; font-weight:600; text-transform:uppercase;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Tax Breakdown -->
          <tr>
            <td style="padding: 16px 40px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td colspan="2" style="padding:0 0 6px;border-bottom:1px solid #e5e7eb;"></td>
                </tr>
                <tr>
                  <td style="padding:8px 0 4px; font-size:13px; color:#555; text-align:right; width:70%;">Subtotal (excl. tax):</td>
                  <td style="padding:8px 0 4px; font-size:13px; color:#333; text-align:right; padding-left:20px;">₹${subtotalExclTax.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0; font-size:13px; color:#555; text-align:right;">CGST (2.5%):</td>
                  <td style="padding:4px 0; font-size:13px; color:#333; text-align:right; padding-left:20px;">₹${cgst.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0 8px; font-size:13px; color:#555; text-align:right;">SGST (2.5%):</td>
                  <td style="padding:4px 0 8px; font-size:13px; color:#333; text-align:right; padding-left:20px;">₹${sgst.toFixed(2)}</td>
                </tr>
                <tr style="border-top:2px solid #1a1a2e;">
                  <td style="padding:10px 0 4px; font-size:15px; font-weight:700; color:#1a1a2e; text-align:right;">Grand Total:</td>
                  <td style="padding:10px 0 4px; font-size:15px; font-weight:700; color:#1a1a2e; text-align:right; padding-left:20px;">₹${totalAmount.toFixed(2)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Invoice Download -->
          <tr>
            <td style="padding: 20px 40px 0; text-align:center;">
              <a href="${invoiceUrl}" target="_blank"
                style="display:inline-block; background:#1a1a2e; color:#ffffff; text-decoration:none; padding:12px 28px; border-radius:8px; font-size:14px; font-weight:600; letter-spacing:0.5px;">
                📄 Download Tax Invoice (PDF)
              </a>
            </td>
          </tr>

          <!-- Shipping & Payment Details -->
          <tr>
            <td style="padding: 24px 40px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="48%" style="vertical-align:top;">
                    <p style="margin:0 0 8px; font-size:13px; font-weight:700; color:#888; text-transform:uppercase; letter-spacing:1px;">Shipping To</p>
                    <p style="margin:0; font-size:14px; color:#333; line-height:1.6;">
                      <strong>${shippingAddr.firstName || ''} ${shippingAddr.lastName || ''}</strong><br>
                      ${addressLine || 'Address not provided'}<br>
                      ${shippingAddr.phoneNumber ? 'Ph: ' + shippingAddr.phoneNumber : ''}
                    </p>
                  </td>
                  <td width="4%"></td>
                  <td width="48%" style="vertical-align:top;">
                    <p style="margin:0 0 8px; font-size:13px; font-weight:700; color:#888; text-transform:uppercase; letter-spacing:1px;">Payment</p>
                    <p style="margin:0; font-size:14px; color:#333; line-height:1.6;">
                      Method: <strong>${order.paymentMethod || 'N/A'}</strong><br>
                      Status: <span style="color:${order.paymentStatus === 'Paid' ? '#22c55e' : '#f59e0b'}; font-weight:600;">${order.paymentStatus || 'Pending'}</span>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px; text-align:center; border-top: 1px solid #f0f0f0; margin-top:28px;">
              <p style="margin:0; font-size:13px; color:#888;">Thank you for shopping with <strong style="color:#1a1a2e;">LOOI Store</strong></p>
              <p style="margin:8px 0 0; font-size:12px; color:#aaa;">If you have any questions, reply to this email or contact our support team.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};


/**
 * Admin new order notification email template
 */
const getAdminNewOrderHtml = (order) => {
    const itemsHtml = order.orderItems.map(item => `
        <tr>
            <td style="padding: 10px 14px; border-bottom: 1px solid #f0f0f0; font-size:13px; color:#333;">${item.productName} ${item.size ? `(${item.size}${item.color ? '/' + item.color : ''})` : ''}</td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #f0f0f0; font-size:13px; color:#333; text-align:center;">${item.quantity}</td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #f0f0f0; font-size:13px; color:#333; text-align:right;">₹${Number(item.price).toFixed(2)}</td>
        </tr>
    `).join('');

    const shippingAddr = order.shippingAddress || {};
    const addressLine = [
        shippingAddr.houseBuilding,
        shippingAddr.streetArea,
        shippingAddr.cityDistrict,
        shippingAddr.state,
        shippingAddr.postalCode
    ].filter(Boolean).join(', ');

    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0; padding:0; background:#f4f4f4; font-family:Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4; padding:24px 0;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px; width:100%; background:#fff; border-radius:10px; overflow:hidden; box-shadow:0 2px 16px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#1a1a2e; padding:20px 32px; text-align:center;">
              <h2 style="margin:0; color:#fff; font-size:18px; font-weight:700; letter-spacing:2px;">🛒 NEW ORDER — LOOI STORE</h2>
            </td>
          </tr>
          <tr>
            <td style="background:#eff6ff; padding:14px 32px; border-bottom:1px solid #bfdbfe; text-align:center;">
              <p style="margin:0; font-size:14px; color:#1d4ed8; font-weight:600;">A new order has been placed and requires your attention.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#f8fafc; border-radius:8px; padding:14px 18px; width:50%;">
                    <p style="margin:0; font-size:11px; color:#888; text-transform:uppercase; letter-spacing:1px;">Order ID</p>
                    <p style="margin:4px 0 0; font-size:18px; font-weight:700; color:#1a1a2e;">${order.orderId}</p>
                  </td>
                  <td width="8px"></td>
                  <td style="background:#f8fafc; border-radius:8px; padding:14px 18px; width:50%; text-align:right;">
                    <p style="margin:0; font-size:11px; color:#888; text-transform:uppercase; letter-spacing:1px;">Total Amount</p>
                    <p style="margin:4px 0 0; font-size:18px; font-weight:700; color:#16a34a;">₹${Number(order.totalAmount).toFixed(2)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 0;">
              <p style="margin:0 0 10px; font-size:12px; font-weight:700; color:#888; text-transform:uppercase; letter-spacing:1px;">Customer Details</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb; border-radius:8px;">
                <tr><td style="padding:12px 16px; font-size:13px; color:#333; border-bottom:1px solid #f0f0f0;"><strong>Email:</strong> ${order.email || 'N/A'}</td></tr>
                <tr><td style="padding:12px 16px; font-size:13px; color:#333; border-bottom:1px solid #f0f0f0;"><strong>Payment:</strong> ${order.paymentMethod || 'N/A'} — ${order.paymentStatus || 'Pending'}</td></tr>
                <tr><td style="padding:12px 16px; font-size:13px; color:#333;"><strong>Ship To:</strong> ${addressLine || 'N/A'}</td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 0;">
              <p style="margin:0 0 10px; font-size:12px; font-weight:700; color:#888; text-transform:uppercase; letter-spacing:1px;">Order Items</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb; border-radius:8px; overflow:hidden;">
                <thead>
                  <tr style="background:#f8fafc;">
                    <th style="padding:9px 14px; text-align:left; font-size:11px; color:#888; font-weight:600; text-transform:uppercase;">Product</th>
                    <th style="padding:9px 14px; text-align:center; font-size:11px; color:#888; font-weight:600; text-transform:uppercase;">Qty</th>
                    <th style="padding:9px 14px; text-align:right; font-size:11px; color:#888; font-weight:600; text-transform:uppercase;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                  <tr style="background:#f8fafc;">
                    <td colspan="2" style="padding:12px 14px; font-size:13px; font-weight:700; color:#1a1a2e; text-align:right;">Total</td>
                    <td style="padding:12px 14px; font-size:14px; font-weight:700; color:#16a34a; text-align:right;">₹${Number(order.totalAmount).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px; text-align:center; border-top:1px solid #f0f0f0; margin-top:20px;">
              <p style="margin:0; font-size:12px; color:#aaa;">Automated notification — <strong style="color:#1a1a2e;">LOOI Store Admin Panel</strong></p>
              <p style="margin:6px 0 0; font-size:11px; color:#ccc;">Received: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

module.exports = { getCustomerOrderConfirmationHtml, getAdminNewOrderHtml };
