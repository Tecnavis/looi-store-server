// utils/emailService.js
const nodemailer = require('nodemailer');

let transporter = null;

// Built lazily (on first send) rather than at module-load time, so a Gmail
// account/app-password added to the platform's env vars after the process
// started is still picked up, and a missing/blank credential fails with a
// clear error instead of a silent Nodemailer auth rejection.
const getTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error(
      'Email is not configured: set EMAIL_USER and EMAIL_PASS in your environment (EMAIL_PASS must be a Gmail App Password, not your regular account password).'
    );
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'Gmail', // or use 'SMTP', 'SendGrid', etc.
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  return transporter;
};

const sendEmail = async (to, subject, text, html) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
    html,
  };
  return getTransporter().sendMail(mailOptions);
};

module.exports = sendEmail;
