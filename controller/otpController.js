const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const Otp = require('../models/otpModel');
const sendEmail = require('../utils/emailService');
const sendSms = require('../utils/smsService');
const { getOtpEmailHtml } = require('../utils/emailTemplates');

const OTP_EXPIRY_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 30;
const MAX_ATTEMPTS = 5;

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isPhone = (value) => /^\+?\d{7,15}$/.test(String(value).replace(/[\s\-()]/g, ''));

// Normalizes a raw email/phone input into the canonical form we store & match against.
const normalizeIdentifier = (identifier, channel) => {
  if (channel === 'email') return String(identifier).trim().toLowerCase();
  let digits = String(identifier).replace(/[\s\-()]/g, '');
  if (!digits.startsWith('+')) {
    // Default to India country code when none is supplied.
    digits = (process.env.DEFAULT_COUNTRY_CODE || '+91') + digits.replace(/^0+/, '');
  }
  return digits;
};

const generateOtpCode = () => String(Math.floor(100000 + Math.random() * 900000)); // 6 digits

const channelLabel = (channel) => (channel === 'email' ? 'email address' : 'phone number');

// POST /send-otp  { identifier, channel: 'email'|'phone', purpose: 'login'|'register', fullName?, username? }
exports.sendOtp = async (req, res) => {
  try {
    const { identifier, channel, purpose, fullName, username } = req.body;

    if (!identifier || !channel || !purpose) {
      return res.status(400).json({ message: 'identifier, channel and purpose are required.' });
    }
    if (!['email', 'phone'].includes(channel)) {
      return res.status(400).json({ message: 'channel must be "email" or "phone".' });
    }
    if (!['login', 'register'].includes(purpose)) {
      return res.status(400).json({ message: 'purpose must be "login" or "register".' });
    }
    if (channel === 'email' && !isEmail(identifier)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }
    if (channel === 'phone' && !isPhone(identifier)) {
      return res.status(400).json({ message: 'Please enter a valid phone number.' });
    }

    const normalized = normalizeIdentifier(identifier, channel);
    const lookupField = channel === 'email' ? 'email' : 'contactNumber';
    const existingUser = await User.findOne({ [lookupField]: normalized });

    if (purpose === 'register') {
      if (existingUser) {
        return res.status(409).json({
          message: `An account with this ${channelLabel(channel)} already exists. Please login instead.`,
        });
      }
      if (!fullName || !fullName.trim()) {
        return res.status(400).json({ message: 'Full name is required.' });
      }
      if (!username || username.trim().length < 3) {
        return res.status(400).json({ message: 'Username must be at least 3 characters.' });
      }
      const usernameTaken = await User.findOne({ username: username.trim() });
      if (usernameTaken) {
        return res.status(409).json({ message: 'This username is already taken. Please choose another.' });
      }
    } else {
      if (!existingUser) {
        return res.status(404).json({
          message: `No account found with this ${channelLabel(channel)}. Please register first.`,
        });
      }
    }

    // Prevent rapid-fire resend spam.
    const existingOtp = await Otp.findOne({ identifier: normalized, channel, purpose });
    if (existingOtp) {
      const elapsedSeconds = (Date.now() - existingOtp.createdAt.getTime()) / 1000;
      if (elapsedSeconds < RESEND_COOLDOWN_SECONDS) {
        return res.status(429).json({
          message: `Please wait ${Math.ceil(RESEND_COOLDOWN_SECONDS - elapsedSeconds)}s before requesting another OTP.`,
        });
      }
    }

    const otpCode = generateOtpCode();
    const otpHash = await bcrypt.hash(otpCode, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await Otp.findOneAndUpdate(
      { identifier: normalized, channel, purpose },
      {
        otpHash,
        attempts: 0,
        expiresAt,
        createdAt: new Date(),
        payload: purpose === 'register' ? { fullName: fullName.trim(), username: username.trim() } : undefined,
      },
      { upsert: true, new: true }
    );

    if (channel === 'email') {
      await sendEmail(
        normalized,
        'Your LOOI verification code',
        `Your OTP code is ${otpCode}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`,
        getOtpEmailHtml(otpCode, OTP_EXPIRY_MINUTES, purpose)
      );
    } else {
      await sendSms(
        normalized,
        `Your LOOI verification code is ${otpCode}. It expires in ${OTP_EXPIRY_MINUTES} minutes. Do not share this code with anyone.`
      );
    }

    return res.status(200).json({
      message: `OTP sent to your ${channelLabel(channel)}.`,
      identifier: normalized,
    });
  } catch (err) {
    console.error('sendOtp error:', err);
    if (err.message && err.message.includes('Twilio')) {
      return res.status(503).json({ message: 'SMS service is not configured yet. Please try email instead.' });
    }
    return res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
  }
};

// POST /verify-otp  { identifier, channel, purpose, otp }
exports.verifyOtp = async (req, res) => {
  try {
    const { identifier, channel, purpose, otp } = req.body;

    if (!identifier || !channel || !purpose || !otp) {
      return res.status(400).json({ message: 'identifier, channel, purpose and otp are required.' });
    }

    const normalized = normalizeIdentifier(identifier, channel);
    const otpDoc = await Otp.findOne({ identifier: normalized, channel, purpose });

    if (!otpDoc) {
      return res.status(400).json({ message: 'No OTP request found for this contact. Please request a new OTP.' });
    }
    if (otpDoc.expiresAt.getTime() < Date.now()) {
      await Otp.deleteOne({ _id: otpDoc._id });
      return res.status(400).json({ message: 'OTP expired. Please request a new one.' });
    }
    if (otpDoc.attempts >= MAX_ATTEMPTS) {
      await Otp.deleteOne({ _id: otpDoc._id });
      return res.status(429).json({ message: 'Too many incorrect attempts. Please request a new OTP.' });
    }

    const isMatch = await bcrypt.compare(String(otp), otpDoc.otpHash);
    if (!isMatch) {
      otpDoc.attempts += 1;
      await otpDoc.save();
      return res.status(400).json({ message: 'Incorrect OTP. Please try again.' });
    }

    const lookupField = channel === 'email' ? 'email' : 'contactNumber';
    let user = await User.findOne({ [lookupField]: normalized });

    if (purpose === 'register') {
      if (user) {
        await Otp.deleteOne({ _id: otpDoc._id });
        return res.status(409).json({ message: 'An account already exists. Please login instead.' });
      }
      const { fullName, username } = otpDoc.payload || {};
      if (!fullName || !username) {
        await Otp.deleteOne({ _id: otpDoc._id });
        return res.status(400).json({ message: 'Registration details missing or expired. Please start over.' });
      }
      const usernameTaken = await User.findOne({ username });
      if (usernameTaken) {
        await Otp.deleteOne({ _id: otpDoc._id });
        return res.status(409).json({ message: 'This username is already taken. Please choose another.' });
      }
      user = new User({
        username,
        fullName,
        email: channel === 'email' ? normalized : undefined,
        contactNumber: channel === 'phone' ? normalized : undefined,
      });
      await user.save();
    } else {
      if (!user) {
        await Otp.deleteOne({ _id: otpDoc._id });
        return res.status(404).json({ message: 'No account found. Please register first.' });
      }
    }

    await Otp.deleteOne({ _id: otpDoc._id });

    const token = jwt.sign(
      { userId: user._id, username: user.username, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.status(200).json({
      message: purpose === 'register' ? 'Account created successfully!' : 'Login successful!',
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        contactNumber: user.contactNumber,
      },
    });
  } catch (err) {
    console.error('verifyOtp error:', err);
    return res.status(500).json({ message: 'Failed to verify OTP. Please try again.' });
  }
};
