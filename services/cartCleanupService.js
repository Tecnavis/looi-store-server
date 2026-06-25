const Cart = require('../models/cartModel');

// How long an untouched cart is considered "abandoned" before being cleared.
// Configurable via .env (CART_STALE_HOURS); defaults to 24 hours.
const STALE_HOURS = Number(process.env.CART_STALE_HOURS) || 24;

// How often to run the cleanup sweep. Configurable via .env (CART_CLEANUP_INTERVAL_MINUTES);
// defaults to running once every 60 minutes.
const INTERVAL_MINUTES = Number(process.env.CART_CLEANUP_INTERVAL_MINUTES) || 60;

/**
 * Empties (but does not delete) any cart whose `items` array hasn't been
 * touched in STALE_HOURS. This fixes the "leftover items show up in the cart
 * forever" issue caused by old/abandoned carts that nothing ever clears —
 * e.g. a user added items, never checked out, and came back days later to
 * find unexpected items still sitting in their cart.
 *
 * Carts updated more recently than the threshold are left alone, so an
 * active shopper never has their in-progress cart wiped mid-session.
 */
const clearStaleCarts = async () => {
  const cutoff = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000);
  try {
    const result = await Cart.updateMany(
      { updatedAt: { $lt: cutoff }, 'items.0': { $exists: true } },
      { $set: { items: [], totalPrice: 0 } }
    );
    if (result.modifiedCount > 0) {
      console.log(`[cartCleanup] Cleared ${result.modifiedCount} stale cart(s) older than ${STALE_HOURS}h`);
    }
  } catch (error) {
    console.error('[cartCleanup] Error clearing stale carts:', error.message);
  }
};

/**
 * Starts the recurring cleanup sweep. Call once at server startup.
 */
const startCartCleanupJob = () => {
  // Run once shortly after startup, then on a recurring interval.
  setTimeout(clearStaleCarts, 10000);
  setInterval(clearStaleCarts, INTERVAL_MINUTES * 60 * 1000);
  console.log(`[cartCleanup] Scheduled: clearing carts idle for >${STALE_HOURS}h, checking every ${INTERVAL_MINUTES}min`);
};

module.exports = { startCartCleanupJob, clearStaleCarts };
