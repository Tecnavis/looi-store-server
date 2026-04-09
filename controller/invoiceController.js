const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const Order = require('../models/orderModel');

const ensureInvoiceDirectory = () => {
    const invoiceDir = path.join(__dirname, '..', 'invoices');
    if (!fs.existsSync(invoiceDir)) {
        fs.mkdirSync(invoiceDir, { recursive: true });
    }
    return invoiceDir;
};

exports.generateInvoice = async (req, res) => {
    const { orderId } = req.params;

    try {
        const order = await Order.findById(orderId).populate('user');

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        const invoiceDir = ensureInvoiceDirectory();
        const invoicePath = path.join(invoiceDir, `invoice-${orderId}.pdf`);

        // ✅ FIX: Set headers BEFORE piping to response
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${orderId}.pdf`);

        const pdfDoc = new PDFDocument({ margin: 50 });
        const fileStream = fs.createWriteStream(invoicePath);

        fileStream.on('error', (error) => {
            console.error('Error writing invoice to file:', error);
        });

        pdfDoc.pipe(fileStream);
        pdfDoc.pipe(res);

        // ── HEADER ────────────────────────────────────────────────────────────
        pdfDoc.fontSize(22).font('Helvetica-Bold').text('LOOI', 50, 50);
        pdfDoc.fontSize(10).font('Helvetica').fillColor('#666666')
            .text('www.looi.in  |  support@looi.in', 50, 75);

        pdfDoc.fontSize(20).font('Helvetica-Bold').fillColor('#000000')
            .text('TAX INVOICE', 0, 50, { align: 'right' });
        pdfDoc.fontSize(10).font('Helvetica').fillColor('#444444')
            .text(`Invoice No: ${order.orderId}`, 0, 75, { align: 'right' })
            .text(`Date: ${new Date(order.orderDate || order.createdAt).toLocaleDateString('en-IN')}`, 0, 90, { align: 'right' });

        // Divider
        pdfDoc.moveTo(50, 115).lineTo(562, 115).lineWidth(1.5).strokeColor('#000000').stroke();

        // ── BILL TO ───────────────────────────────────────────────────────────
        const addr = order.shippingAddress || {};
        pdfDoc.fontSize(9).font('Helvetica-Bold').fillColor('#888888')
            .text('BILL TO / SHIP TO', 50, 130);
        pdfDoc.fontSize(11).font('Helvetica-Bold').fillColor('#000000')
            .text(`${addr.firstName || ''} ${addr.lastName || ''}`.trim(), 50, 145);
        pdfDoc.fontSize(10).font('Helvetica').fillColor('#333333');
        const addrLines = [
            addr.houseBuilding,
            addr.streetArea,
            addr.landmark,
            [addr.cityDistrict, addr.state].filter(Boolean).join(', '),
            addr.postalCode ? `PIN: ${addr.postalCode}` : '',
            addr.phoneNumber ? `Ph: ${addr.phoneNumber}` : '',
        ].filter(Boolean);
        addrLines.forEach((line, i) => {
            pdfDoc.text(line, 50, 160 + (i * 14));
        });

        // Payment badge
        const payY = 130;
        pdfDoc.fontSize(9).font('Helvetica-Bold').fillColor('#888888')
            .text('PAYMENT', 380, payY);
        pdfDoc.fontSize(10).font('Helvetica').fillColor('#000000')
            .text(`Method: ${order.paymentMethod || 'N/A'}`, 380, payY + 15)
            .text(`Status: ${order.paymentStatus || 'Pending'}`, 380, payY + 30)
            .text(`Order Status: ${order.orderStatus || 'Pending'}`, 380, payY + 45);

        // ── ITEMS TABLE ───────────────────────────────────────────────────────
        const tableTop = 265;
        const colX = { sno: 50, name: 80, hsn: 295, qty: 345, unitPrice: 385, taxRate: 430, taxAmt: 472, total: 512 };

        // Table header
        pdfDoc.rect(50, tableTop, 512, 18).fill('#1a1a1a');
        pdfDoc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
        pdfDoc.text('#',        colX.sno,      tableTop + 5, { width: 25,  align: 'center' });
        pdfDoc.text('PRODUCT',  colX.name,     tableTop + 5, { width: 210, align: 'left'   });
        pdfDoc.text('HSN',      colX.hsn,      tableTop + 5, { width: 45,  align: 'center' });
        pdfDoc.text('QTY',      colX.qty,      tableTop + 5, { width: 35,  align: 'center' });
        pdfDoc.text('UNIT',     colX.unitPrice,tableTop + 5, { width: 40,  align: 'right'  });
        pdfDoc.text('GST%',     colX.taxRate,  tableTop + 5, { width: 38,  align: 'center' });
        pdfDoc.text('GST AMT',  colX.taxAmt,   tableTop + 5, { width: 38,  align: 'right'  });
        pdfDoc.text('TOTAL',    colX.total,    tableTop + 5, { width: 50,  align: 'right'  });

        // Table rows
        let rowY = tableTop + 20;
        let subtotalExclTax = 0;
        let totalTaxAmount = 0;

        order.orderItems.forEach((item, i) => {
            const qty = Number(item.quantity) || 1;
            const lineTotal = Number(item.price) || 0;
            const taxRate = Number(item.taxRate || 5); // default 5% GST
            // price stored is inclusive of tax
            const unitExclTax = lineTotal / qty / (1 + taxRate / 100);
            const unitTaxAmt  = (lineTotal / qty) - unitExclTax;
            const lineTaxAmt  = unitTaxAmt * qty;
            const lineExclTax = unitExclTax * qty;

            subtotalExclTax += lineExclTax;
            totalTaxAmount  += lineTaxAmt;

            const bg = i % 2 === 0 ? '#f9f9f9' : '#ffffff';
            const rowH = 28;
            pdfDoc.rect(50, rowY, 512, rowH).fill(bg);

            pdfDoc.fontSize(9).font('Helvetica').fillColor('#000000');
            pdfDoc.text(String(i + 1),               colX.sno,      rowY + 4, { width: 25,  align: 'center' });
            pdfDoc.text(item.productName || 'N/A',    colX.name,     rowY + 4, { width: 210, align: 'left', ellipsis: true });
            const sizeColor = [item.size, item.color].filter(Boolean).join(' / ');
            if (sizeColor) {
                pdfDoc.fontSize(7.5).fillColor('#666666')
                    .text(sizeColor, colX.name, rowY + 16, { width: 210 });
            }
            pdfDoc.fontSize(9).fillColor('#000000');
            pdfDoc.text(item.hsn || '—',              colX.hsn,      rowY + 4, { width: 45,  align: 'center' });
            pdfDoc.text(String(qty),                   colX.qty,      rowY + 4, { width: 35,  align: 'center' });
            pdfDoc.text(`₹${unitExclTax.toFixed(2)}`,  colX.unitPrice,rowY + 4, { width: 40,  align: 'right'  });
            pdfDoc.text(`${taxRate}%`,                 colX.taxRate,  rowY + 4, { width: 38,  align: 'center' });
            pdfDoc.text(`₹${lineTaxAmt.toFixed(2)}`,   colX.taxAmt,   rowY + 4, { width: 38,  align: 'right'  });
            pdfDoc.text(`₹${lineTotal.toFixed(2)}`,    colX.total,    rowY + 4, { width: 50,  align: 'right'  });

            // Row border
            pdfDoc.moveTo(50, rowY + rowH).lineTo(562, rowY + rowH).lineWidth(0.5).strokeColor('#e0e0e0').stroke();
            rowY += rowH;
        });

        // ── TOTALS ────────────────────────────────────────────────────────────
        const grandTotal = Number(order.totalAmount);
        const cgst = totalTaxAmount / 2;
        const sgst = totalTaxAmount / 2;

        rowY += 8;
        pdfDoc.moveTo(360, rowY).lineTo(562, rowY).lineWidth(1).strokeColor('#cccccc').stroke();
        rowY += 8;

        const addTotalRow = (label, value, bold = false) => {
            if (bold) pdfDoc.font('Helvetica-Bold'); else pdfDoc.font('Helvetica');
            pdfDoc.fontSize(9).fillColor('#000000')
                .text(label, 360, rowY, { width: 152, align: 'left' })
                .text(value,  360, rowY, { width: 200, align: 'right' });
            rowY += 16;
        };

        addTotalRow('Subtotal (excl. tax):', `₹${subtotalExclTax.toFixed(2)}`);
        addTotalRow(`CGST (2.5%):`,            `₹${cgst.toFixed(2)}`);
        addTotalRow(`SGST (2.5%):`,            `₹${sgst.toFixed(2)}`);
        pdfDoc.moveTo(360, rowY).lineTo(562, rowY).lineWidth(1).strokeColor('#000000').stroke();
        rowY += 6;
        addTotalRow('GRAND TOTAL:', `₹${grandTotal.toFixed(2)}`, true);

        // ── FOOTER ────────────────────────────────────────────────────────────
        pdfDoc.moveTo(50, rowY + 20).lineTo(562, rowY + 20).lineWidth(1).strokeColor('#cccccc').stroke();
        pdfDoc.fontSize(9).font('Helvetica').fillColor('#666666')
            .text('This is a computer-generated invoice. No signature required.', 50, rowY + 30, { align: 'center', width: 512 })
            .text('Thank you for shopping with LOOI!', 50, rowY + 44, { align: 'center', width: 512 });

        pdfDoc.end();

    } catch (error) {
        console.error('Error generating invoice:', error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: "Error generating invoice" });
        }
    }
};
