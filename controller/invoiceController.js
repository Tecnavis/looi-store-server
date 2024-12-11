

// modified
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const Order = require('../models/orderModel');

// Create invoices directory if it doesn't exist
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
        // const order = await Order.findById(orderId).populate('user');
        const order = await Order.findOne({ orderId }).populate('user');
        
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }
        
        // Ensure invoices directory exists
        const invoiceDir = ensureInvoiceDirectory();
        const invoicePath = path.join(invoiceDir, `invoice-${orderId}.pdf`);
        
        // Set up PDF document
        const pdfDoc = new PDFDocument({ margin: 50 });
        
        // Create write streams
        const fileStream = fs.createWriteStream(invoicePath);
        
        // Handle errors on the file stream
        fileStream.on('error', (error) => {
            console.error('Error writing to file:', error);
            res.status(500).json({ success: false, message: "Error generating invoice" });
        });

        // Pipe the PDF to both the file and the response
        pdfDoc.pipe(fileStream);
        pdfDoc.pipe(res);

        // Add company logo/header
        pdfDoc.fontSize(20).text('Invoice', { align: 'center' });
        pdfDoc.moveDown();

        // Add invoice details
        pdfDoc.fontSize(12);
        const startY = 150;

        pdfDoc.text(`Date: ${new Date(order.orderDate).toLocaleDateString()}`, 50, startY + 20);

        // Add customer details
        pdfDoc.text('Bill To:', 50, startY + 60);
        pdfDoc.text(`${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`, 50, startY + 80);
        pdfDoc.text(`${order.shippingAddress.houseBuilding}`, 50, startY + 100);
        pdfDoc.text(`${order.shippingAddress.streetArea}`, 50, startY + 120);
        pdfDoc.text(`${order.shippingAddress.cityDistrict}`, 50, startY + 140);
        pdfDoc.text(`Phone: ${order.shippingAddress.phoneNumber}`, 50, startY + 160);

        // Create table header
        const tableTop = startY + 200;
        
        // Draw table header
        pdfDoc.font('Helvetica-Bold');
        generateTableRow(
            pdfDoc,
            tableTop,
            'No',
            'Description',
            'Qty',
            'Price',
            'Amount'
        );

        // Draw header line
        generateHorizontalLine(pdfDoc, tableTop + 20);

        // Draw table rows
        let position = tableTop + 30;
        pdfDoc.font('Helvetica');

        // Iterate through order items with incremental numbering
        order.orderItems.forEach((item, index) => {
            position = generateTableRow(
                pdfDoc,
                position,
                (index + 1).toString(),  
                item.productName,
                item.quantity.toString(),
                `₹${item.price.toFixed(2)}`,
                `₹${(item.quantity * item.price).toFixed(2)}`
            );

            generateHorizontalLine(pdfDoc, position - 5);
        });

        // Add total
        const totalPosition = position + 20;
        pdfDoc.font('Helvetica-Bold');
        generateTableRow(
            pdfDoc,
            totalPosition,
            '',
            '',
            '',
            'Total:',
            `₹${order.totalAmount.toFixed(2)}`
        );

        // Add footer
        pdfDoc.fontSize(10).text(
            'Thank you for your order!',
            50,
            totalPosition + 50,
            { align: 'center' }
        );

        // Set appropriate headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${orderId}.pdf`);

        pdfDoc.end();

    } catch (error) {
        console.error('Error generating invoice:', error);
        res.status(500).json({ success: false, message: "Error generating invoice" });
    }
};

// Helper functions remain the same
function generateTableRow(doc, y, No, description, quantity, price, amount) {
    doc
        .fontSize(10)
        .text(No, 50, y, { width: 100, align: 'left' })  // Item number column
        .text(description, 150, y, { width: 190, align: 'left' })
        .text(quantity, 350, y, { width: 40, align: 'center' })
        .text(price, 400, y, { width: 70, align: 'right' })
        .text(amount, 500, y, { width: 70, align: 'right' });

    return y + 20;
}

function generateHorizontalLine(doc, y) {
    doc
        .strokeColor("#aaaaaa")
        .lineWidth(1)
        .moveTo(50, y)
        .lineTo(570, y)
        .stroke();
}
