const PDFDocument = require("pdfkit");
const fs = require("fs");

function generateInvoice(order){

const doc = new PDFDocument();

if(!fs.existsSync("./invoices")){
fs.mkdirSync("./invoices");
}

const path = `./invoices/order-${order._id}.pdf`;

doc.pipe(fs.createWriteStream(path));

doc.fontSize(22).text("Looi Store",{align:"center"});
doc.moveDown();

doc.text(`Order ID: ${order._id}`);
doc.text(`Customer: ${order.customer.name}`);
doc.text(`Phone: ${order.customer.phone}`);

doc.moveDown();

order.items.forEach(item=>{
doc.text(`${item.name} - ${item.quantity} x ₹${item.price}`);
});

doc.moveDown();

doc.text(`Total: ₹${order.totalAmount}`);

doc.end();

}

module.exports = generateInvoice;