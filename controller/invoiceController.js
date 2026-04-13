const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const Order = require('../models/orderModel');

// ── Asset paths ────────────────────────────────────────────────────────────────
// Fonts — DejaVu Sans supports the ₹ (U+20B9) glyph unlike Helvetica/Times
const FONT_REGULAR = path.join(__dirname, '..', 'assets', 'fonts', 'DejaVuSans.ttf');
const FONT_BOLD    = path.join(__dirname, '..', 'assets', 'fonts', 'DejaVuSans-Bold.ttf');

// Logo — LOOInew.png at server/assets/images/LOOInew.png
const LOGO_PATH = path.join(__dirname, '..', 'assets', 'images', 'LOOInew.png');

const ensureInvoiceDirectory = () => {
    const invoiceDir = path.join(__dirname, '..', 'invoices');
    if (!fs.existsSync(invoiceDir)) fs.mkdirSync(invoiceDir, { recursive: true });
    return invoiceDir;
};

exports.generateInvoice = async (req, res) => {
    const { orderId } = req.params;

    try {
        const order = await Order.findById(orderId).populate('user');
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

        const invoiceDir  = ensureInvoiceDirectory();
        const invoicePath = path.join(invoiceDir, `invoice-${orderId}.pdf`);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${orderId}.pdf`);

        const pdfDoc = new PDFDocument({ margin: 50, size: 'A4' });
        const fileStream = fs.createWriteStream(invoicePath);
        fileStream.on('error', (err) => console.error('Error writing invoice file:', err));
        pdfDoc.pipe(fileStream);
        pdfDoc.pipe(res);

        // ── Register fonts so ₹ (U+20B9) renders correctly ────────────────────
        const hasFonts = fs.existsSync(FONT_REGULAR) && fs.existsSync(FONT_BOLD);
        if (hasFonts) {
            pdfDoc.registerFont('Regular', FONT_REGULAR);
            pdfDoc.registerFont('Bold',    FONT_BOLD);
        }
        const reg  = () => pdfDoc.font(hasFonts ? 'Regular' : 'Helvetica');
        const bold = () => pdfDoc.font(hasFonts ? 'Bold'    : 'Helvetica-Bold');
        const Rs   = '\u20B9'; // ₹ — works with DejaVu, falls back to '?' with Helvetica

        // ── HEADER ─────────────────────────────────────────────────────────────
        const logoY = 40;
        if (fs.existsSync(LOGO_PATH)) {
            pdfDoc.image(LOGO_PATH, 50, logoY, { height: 48, fit: [160, 48] });
        } else {
            bold(); pdfDoc.fontSize(24).fillColor('#000000').text('LOOI', 50, logoY + 8);
        }
        reg(); pdfDoc.fontSize(9).fillColor('#666666')
            .text('www.looi.in  |  support@looi.in', 50, logoY + 54);

        bold(); pdfDoc.fontSize(20).fillColor('#000000').text('TAX INVOICE', 0, logoY, { align: 'right' });
        reg(); pdfDoc.fontSize(10).fillColor('#444444')
            .text(`Invoice No: ${order.orderId}`,                                              0, logoY + 28, { align: 'right' })
            .text(`Date: ${new Date(order.orderDate || order.createdAt).toLocaleDateString('en-IN')}`, 0, logoY + 42, { align: 'right' });

        pdfDoc.moveTo(50, 115).lineTo(562, 115).lineWidth(1.5).strokeColor('#000000').stroke();

        // ── BILL TO ────────────────────────────────────────────────────────────
        const addr = order.shippingAddress || {};
        bold(); pdfDoc.fontSize(9).fillColor('#888888').text('BILL TO / SHIP TO', 50, 130);
        bold(); pdfDoc.fontSize(11).fillColor('#000000')
            .text(`${addr.firstName || ''} ${addr.lastName || ''}`.trim(), 50, 145);
        reg(); pdfDoc.fontSize(10).fillColor('#333333');
        [
            addr.houseBuilding,
            addr.streetArea,
            addr.landmark,
            [addr.cityDistrict, addr.state].filter(Boolean).join(', '),
            addr.postalCode  ? `PIN: ${addr.postalCode}`    : '',
            addr.phoneNumber ? `Ph: ${addr.phoneNumber}`    : '',
        ].filter(Boolean).forEach((line, i) => pdfDoc.text(line, 50, 160 + i * 14));

        const payY = 130;
        bold(); pdfDoc.fontSize(9).fillColor('#888888').text('PAYMENT', 380, payY);
        reg(); pdfDoc.fontSize(10).fillColor('#000000')
            .text(`Method: ${order.paymentMethod || 'N/A'}`,    380, payY + 15)
            .text(`Status: ${order.paymentStatus || 'Pending'}`, 380, payY + 30)
            .text(`Order Status: ${order.orderStatus || 'Pending'}`, 380, payY + 45);

        // ── ITEMS TABLE ────────────────────────────────────────────────────────
        const tableTop = 265;
        const col = { sno:50, name:80, hsn:295, qty:345, unit:385, rate:430, taxAmt:472, total:512 };

        pdfDoc.rect(50, tableTop, 512, 18).fill('#1a1a1a');
        bold(); pdfDoc.fontSize(8).fillColor('#ffffff');
        [
            ['#',        col.sno,    25,  'center'],
            ['PRODUCT',  col.name,  210,  'left'  ],
            ['HSN',      col.hsn,    45,  'center'],
            ['QTY',      col.qty,    35,  'center'],
            ['UNIT',     col.unit,   40,  'right' ],
            ['GST%',     col.rate,   38,  'center'],
            ['GST AMT',  col.taxAmt, 38,  'right' ],
            ['TOTAL',    col.total,  50,  'right' ],
        ].forEach(([txt, x, w, align]) => pdfDoc.text(txt, x, tableTop + 5, { width: w, align }));

        let rowY = tableTop + 20;
        let subtotalExclTax = 0;
        let totalTaxAmount  = 0;

        order.orderItems.forEach((item, i) => {
            const qty         = Number(item.quantity) || 1;
            const lineTotal   = Number(item.price) || 0;
            const taxRate     = Number(item.taxRate || 5);
            const unitExclTax = lineTotal / qty / (1 + taxRate / 100);
            const lineTaxAmt  = lineTotal - unitExclTax * qty;
            subtotalExclTax  += unitExclTax * qty;
            totalTaxAmount   += lineTaxAmt;

            pdfDoc.rect(50, rowY, 512, 28).fill(i % 2 === 0 ? '#f9f9f9' : '#ffffff');
            reg(); pdfDoc.fontSize(9).fillColor('#000000');
            pdfDoc.text(String(i + 1),                  col.sno,    rowY + 4, { width: 25,  align: 'center' });
            pdfDoc.text(item.productName || 'N/A',      col.name,   rowY + 4, { width: 210, align: 'left', ellipsis: true });
            const sizeColor = [item.size, item.color].filter(Boolean).join(' / ');
            if (sizeColor) pdfDoc.fontSize(7.5).fillColor('#666666').text(sizeColor, col.name, rowY + 16, { width: 210 });
            pdfDoc.fontSize(9).fillColor('#000000');
            pdfDoc.text(item.hsn || '—',                col.hsn,    rowY + 4, { width: 45,  align: 'center' });
            pdfDoc.text(String(qty),                    col.qty,    rowY + 4, { width: 35,  align: 'center' });
            pdfDoc.text(`${Rs}${unitExclTax.toFixed(2)}`,  col.unit,   rowY + 4, { width: 40,  align: 'right'  });
            pdfDoc.text(`${taxRate}%`,                  col.rate,   rowY + 4, { width: 38,  align: 'center' });
            pdfDoc.text(`${Rs}${lineTaxAmt.toFixed(2)}`,   col.taxAmt, rowY + 4, { width: 38,  align: 'right'  });
            pdfDoc.text(`${Rs}${lineTotal.toFixed(2)}`,    col.total,  rowY + 4, { width: 50,  align: 'right'  });
            pdfDoc.moveTo(50, rowY + 28).lineTo(562, rowY + 28).lineWidth(0.5).strokeColor('#e0e0e0').stroke();
            rowY += 28;
        });

        // ── TOTALS ─────────────────────────────────────────────────────────────
        const grandTotal = Number(order.totalAmount);
        const cgst = totalTaxAmount / 2;
        const sgst = totalTaxAmount / 2;

        rowY += 8;
        pdfDoc.moveTo(360, rowY).lineTo(562, rowY).lineWidth(1).strokeColor('#cccccc').stroke();
        rowY += 8;

        const totRow = (label, value, isBold = false) => {
            if (isBold) bold(); else reg();
            pdfDoc.fontSize(9).fillColor('#000000')
                .text(label, 360, rowY, { width: 152, align: 'left'  })
                .text(value, 360, rowY, { width: 200, align: 'right' });
            rowY += 16;
        };
        totRow('Subtotal (excl. tax):', `${Rs}${subtotalExclTax.toFixed(2)}`);
        totRow('CGST (2.5%):',          `${Rs}${cgst.toFixed(2)}`);
        totRow('SGST (2.5%):',          `${Rs}${sgst.toFixed(2)}`);
        pdfDoc.moveTo(360, rowY).lineTo(562, rowY).lineWidth(1).strokeColor('#000000').stroke();
        rowY += 6;
        totRow('GRAND TOTAL:',           `${Rs}${grandTotal.toFixed(2)}`, true);

        // ── FOOTER ─────────────────────────────────────────────────────────────
        pdfDoc.moveTo(50, rowY + 20).lineTo(562, rowY + 20).lineWidth(1).strokeColor('#cccccc').stroke();
        reg(); pdfDoc.fontSize(9).fillColor('#666666')
            .text('This is a computer-generated invoice. No signature required.',
                50, rowY + 30, { align: 'center', width: 512 })
            .text('Thank you for shopping with LOOI!',
                50, rowY + 44, { align: 'center', width: 512 });

        pdfDoc.end();

    } catch (error) {
        console.error('Error generating invoice:', error);
        if (!res.headersSent) res.status(500).json({ success: false, message: 'Error generating invoice' });
    }
};
