require('dotenv').config();

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

// ── Drop stale MongoDB indexes on startup (fixes E11000 shiprocket_order_id null) ──
const Order = require('./models/orderModel');
setTimeout(async () => {
  try {
    await Order.dropBadIndexes();
    console.log('[startup] Index cleanup complete');
  } catch (e) {
    console.error('[startup] Index cleanup error (non-fatal):', e.message);
  }
}, 3000); // wait 3s for DB connection to establish

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
