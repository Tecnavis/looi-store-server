const Order = require('../models/orderModel');
const Product = require('../models/productModel');

// How long a Razorpay order can sit unpaid before it's treated as abandoned
// (user closed the checkout popup / payment never completed) and auto-cancelled.
// Configurable via .env (ABANDONED_PAYMENT_MINUTES); defaults to 30 minutes.
const ABANDONED_MINUTES = Number(process.env.ABANDONED_PAYMENT_MINUTES) || 30;

// How often to run the sweep. Configurable via .env (ABANDONED_PAYMENT_CHECK_MINUTES);
// defaults to every 15 minutes.
const INTERVAL_MINUTES = Number(process.env.ABANDONED_PAYMENT_CHECK_MINUTES) || 15;

/**
 * Stock is deducted as soon as a Razorpay order record is created — before
 * the customer has actually paid (see orderController.createOrder /
 * Payment.jsx handleRazorpayPayment). If the customer closes the Razorpay
 * popup or the payment fails, the order is left 'Pending' forever and that
 * stock never comes back, even though no payment ever happened.
 *
 * This sweep finds Razorpay orders that have stayed 'Pending' for longer
 * than ABANDONED_MINUTES, cancels them, and restores their stock — mirroring
 * what a manual cancellation does.
 */
const releaseAbandonedPaymentStock = async () => {
  const cutoff = new Date(Date.now() - ABANDONED_MINUTES * 60 * 1000);
  try {
    const abandonedOrders = await Order.find({
      paymentMethod: 'Razorpay',
      paymentStatus: 'Pending',
      orderStatus: 'Pending',
      orderDate: { $lt: cutoff },
    });

    for (const order of abandonedOrders) {
      for (const item of order.orderItems) {
        if (!item.productId || !item.size || !item.color) continue;
        try {
          const product = await Product.findById(item.productId);
          if (!product) continue;
          const sizeObj  = product.sizes?.find(s => s.size === item.size);
          const colorObj = sizeObj?.colors?.find(c => c.color === item.color);
          if (colorObj) {
            colorObj.stock = (colorObj.stock || 0) + item.quantity;
            await product.save();
          }
        } catch (e) {
          console.error('[abandonedPayments] Stock restore error (non-fatal):', e.message);
        }
      }

      order.orderStatus = 'Cancelled';
      order.paymentStatus = 'Failed';
      order.cancellationDate = new Date();
      order.cancellationReason = 'Payment not completed (auto-cancelled)';
      await order.save();
    }

    if (abandonedOrders.length > 0) {
      console.log(`[abandonedPayments] Auto-cancelled ${abandonedOrders.length} unpaid order(s) and released stock`);
    }
  } catch (error) {
    console.error('[abandonedPayments] Error releasing abandoned payment stock:', error.message);
  }
};

const startAbandonedPaymentCleanupJob = () => {
  setTimeout(releaseAbandonedPaymentStock, 15000);
  setInterval(releaseAbandonedPaymentStock, INTERVAL_MINUTES * 60 * 1000);
  console.log(`[abandonedPayments] Scheduled: cancelling unpaid Razorpay orders after ${ABANDONED_MINUTES}min, checking every ${INTERVAL_MINUTES}min`);
};

module.exports = { startAbandonedPaymentCleanupJob, releaseAbandonedPaymentStock };
