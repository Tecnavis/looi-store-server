const mongoose = require('mongoose');

const notificationSettingsSchema = new mongoose.Schema({
    adminEmails: {
        type: [String],
        default: [],
        validate: {
            validator: function (emails) {
                return emails.every(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
            },
            message: 'One or more email addresses are invalid'
        }
    },
    notifyOnNewOrder: {
        type: Boolean,
        default: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Only one settings doc ever exists
const NotificationSettings = mongoose.model('NotificationSettings', notificationSettingsSchema);
module.exports = NotificationSettings;