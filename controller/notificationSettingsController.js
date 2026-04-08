const NotificationSettings = require('../models/notificationSettingsModel');

// GET /api/notification-settings
exports.getSettings = async (req, res) => {
    try {
        let settings = await NotificationSettings.findOne();
        if (!settings) {
            settings = await NotificationSettings.create({ adminEmails: [], notifyOnNewOrder: true });
        }
        res.status(200).json({ success: true, settings });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch settings', error: error.message });
    }
};

// PUT /api/notification-settings
exports.updateSettings = async (req, res) => {
    try {
        const { adminEmails, notifyOnNewOrder } = req.body;

        if (!Array.isArray(adminEmails)) {
            return res.status(400).json({ success: false, message: 'adminEmails must be an array' });
        }

        // Validate each email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const invalid = adminEmails.filter(e => !emailRegex.test(e));
        if (invalid.length > 0) {
            return res.status(400).json({ success: false, message: `Invalid email(s): ${invalid.join(', ')}` });
        }

        let settings = await NotificationSettings.findOne();
        if (!settings) {
            settings = new NotificationSettings();
        }

        settings.adminEmails = adminEmails;
        settings.notifyOnNewOrder = notifyOnNewOrder !== undefined ? notifyOnNewOrder : true;
        settings.updatedAt = new Date();
        await settings.save();

        res.status(200).json({ success: true, message: 'Notification settings updated', settings });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update settings', error: error.message });
    }
};