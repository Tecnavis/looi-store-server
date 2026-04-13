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
              <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAABDgAAAICCAYAAAAqIX1+AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyRpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDcuMS1jMDAwIDc5LmRhYmFjYmIsIDIwMjEvMDQvMTQtMDA6Mzk6NDQgICAgICAgICI+IDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+IDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bXA6Q3JlYXRvclRvb2w9IkFkb2JlIFBob3Rvc2hvcCAyMi41IChXaW5kb3dzKSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo2MTRGQjRDRjkxRDgxMUVGQTE5MEMyM0NDMkEyNTQyMSIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDo2MTRGQjREMDkxRDgxMUVGQTE5MEMyM0NDMkEyNTQyMSI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjYxNEZCNENEOTFEODExRUZBMTkwQzIzQ0MyQTI1NDIxIiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOjYxNEZCNENFOTFEODExRUZBMTkwQzIzQ0MyQTI1NDIxIi8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+HAI0agAAKABJREFUeNrs3QfY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AAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRP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" alt="LOOI" style="height:52px; object-fit:contain; display:block; margin:0 auto 8px;" /><h1 style="margin:0; color:#ffffff; font-size:18px; font-weight:700; letter-spacing:3px;">LOOI STORE</h1>
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
              <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAABDgAAAICCAYAAAAqIX1+AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyRpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDcuMS1jMDAwIDc5LmRhYmFjYmIsIDIwMjEvMDQvMTQtMDA6Mzk6NDQgICAgICAgICI+IDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+IDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bXA6Q3JlYXRvclRvb2w9IkFkb2JlIFBob3Rvc2hvcCAyMi41IChXaW5kb3dzKSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo2MTRGQjRDRjkxRDgxMUVGQTE5MEMyM0NDMkEyNTQyMSIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDo2MTRGQjREMDkxRDgxMUVGQTE5MEMyM0NDMkEyNTQyMSI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjYxNEZCNENEOTFEODExRUZBMTkwQzIzQ0MyQTI1NDIxIiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOjYxNEZCNENFOTFEODExRUZBMTkwQzIzQ0MyQTI1NDIxIi8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+HAI0agAAKABJREFUeNrs3QfY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AAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRPwQEAAAAUT8EBAAAAFE/BAQAAABRP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" alt="LOOI" style="height:36px;object-fit:contain;display:block;margin:0 auto 8px;" /><h2 style="margin:0; color:#fff; font-size:18px; font-weight:700; letter-spacing:2px;">NEW ORDER — LOOI STORE</h2>
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
