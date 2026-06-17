const mongoose = require('mongoose');

// Stores a short-lived OTP (hashed) for either email or phone verification,
// used for both passwordless login and registration.
const otpSchema = new mongoose.Schema({
  identifier: { type: String, required: true, trim: true }, // normalized email or E.164 phone number
  channel: { type: String, enum: ['email', 'phone'], required: true },
  purpose: { type: String, enum: ['login', 'register'], required: true },
  otpHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  // For 'register' purpose we stash the pending signup details here until the OTP is verified.
  payload: { type: mongoose.Schema.Types.Mixed },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Automatically clean up documents some time after they expire.
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 300 });
// Only one active OTP per identifier/channel/purpose combination.
otpSchema.index({ identifier: 1, channel: 1, purpose: 1 }, { unique: true });

module.exports = mongoose.model('Otp', otpSchema);
