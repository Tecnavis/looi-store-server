const NotificationSettings = require('../models/notificationSettingsModel');
const sendEmail = require('./emailService');
const { getAdminOutOfStockHtml } = require('./emailTemplates');

/**
 * Fires an out-of-stock email to all configured admin emails, if the
 * "Notify on Out of Stock" toggle is enabled. Non-fatal: any failure here
 * (missing settings, email transport error) is swallowed and logged so it
 * never blocks the order/stock-update flow that triggered it.
 */
const notifyOutOfStock = async (product) => {
    try {
        const notifSettings = await NotificationSettings.findOne();
        if (!notifSettings || !notifSettings.notifyOnOutOfStock || !notifSettings.adminEmails?.length) return;

        const html = getAdminOutOfStockHtml(product);
        for (const adminEmail of notifSettings.adminEmails) {
            sendEmail(
                adminEmail,
                `⚠️ Out of Stock — ${product.name}`,
                `${product.name} is now out of stock (0 units remaining across all sizes/colors).`,
                html
            ).catch(e => console.error(`Out-of-stock email (non-fatal) to ${adminEmail}:`, e.message));
        }
    } catch (err) {
        console.error('notifyOutOfStock (non-fatal):', err.message);
    }
};

module.exports = { notifyOutOfStock };
