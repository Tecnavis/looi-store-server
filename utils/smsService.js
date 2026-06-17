// utils/smsService.js
// Sends SMS via Twilio. Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and
// TWILIO_PHONE_NUMBER to be set in .env (see .env.example).
const twilio = require('twilio');

let client = null;

const getClient = () => {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    throw new Error(
      'Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER in your .env file.'
    );
  }
  if (!client) {
    client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return client;
};

/**
 * Send an SMS message.
 * @param {string} to - E.164 formatted phone number, e.g. +919876543210
 * @param {string} body - message text
 */
const sendSms = async (to, body) => {
  if (!process.env.TWILIO_PHONE_NUMBER) {
    throw new Error('TWILIO_PHONE_NUMBER is not set in .env.');
  }
  const c = getClient();
  return c.messages.create({
    body,
    from: process.env.TWILIO_PHONE_NUMBER,
    to,
  });
};

module.exports = sendSms;
