require('dotenv').config({ path: require('path').join(__dirname, '.env') });

// Sanity check: confirm critical env vars actually loaded. On shared hosting
// the Node process's working directory can differ from the app folder, which
// silently breaks `require('dotenv').config()` (no error — process.env vars
// just stay undefined). This log makes that failure mode visible immediately
// at boot instead of only showing up later as "Payment gateway is not
// configured on the server" on a customer's checkout screen.
const REQUIRED_ENV_VARS = ['RAZORPAY_KEY_ID', 'RAZORPAY_SECRET_KEY', 'SESSION_SECRET', 'CONNECTION_STRING', 'JWT_SECRET'];
const missingEnvVars = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
if (missingEnvVars.length > 0) {
  console.error(`[startup] WARNING: .env did not load expected variables: ${missingEnvVars.join(', ')}.`);
  console.error(`[startup] Expected .env at: ${require('path').join(__dirname, '.env')}`);
  console.error('[startup] Check that this file exists on the server and that the process has permission to read it.');
} else {
  console.log('[startup] .env loaded successfully — all required variables present.');
}

const authRoutes = require("./Routes/authRoutes");
const session = require("express-session");
const passport = require("./config/passport");

const cors    = require('cors');
const express = require('express');

const router      = require('./Routes/route');
const uploadRoutes = require('./Routes/uploadRoutes');

require('./config/connection');

const app = express();

// CORS
app.use(cors({
  origin: [
    'https://looi.in',
    'https://www.looi.in',
    'https://admin.looi.in',
    'http://localhost:3000',
    'http://localhost:5173',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// FIX #9: session secret moved to .env — never hardcode
app.use(session({
  secret: process.env.SESSION_SECRET || (() => { throw new Error('SESSION_SECRET must be set in .env'); })(),
  resave: false,
  saveUninitialized: false, // false is more secure — only saves sessions that are modified
}));

app.use(passport.initialize());
app.use(passport.session());
app.use("/api/auth", authRoutes);

// Drop stale MongoDB indexes on startup
const Order = require('./models/orderModel');
const User = require('./models/userModel');
setTimeout(async () => {
  try {
    await Order.dropBadIndexes();
    await User.fixIndexes();
    console.log('[startup] Index cleanup complete');
  } catch (e) {
    console.error('[startup] Index cleanup error (non-fatal):', e.message);
  }
}, 3000);

// Periodically empty carts that have been abandoned for a while (see
// services/cartCleanupService.js for the reasoning and config knobs).
const { startCartCleanupJob } = require('./services/cartCleanupService');
startCartCleanupJob();

// Periodically cancel unpaid Razorpay orders and release their reserved
// stock (see services/abandonedPaymentService.js).
const { startAbandonedPaymentCleanupJob } = require('./services/abandonedPaymentService');
startAbandonedPaymentCleanupJob();

// Verify Razorpay key_id/key_secret actually work against Razorpay's API
// right now — catches "key was regenerated in the dashboard but .env wasn't
// updated" at deploy time instead of at a customer's checkout.
const { verifyRazorpayCredentials } = require('./controller/razorpayController');
setTimeout(verifyRazorpayCredentials, 5000);

// Routes
app.use('/api/upload', uploadRoutes);
app.use('/api', router);

// Health check
app.get('/', (req, res) => {
  res.status(200).send('<h1>Server running 🚀</h1>');
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server started at port ${PORT}`);
});
