require('dotenv').config();

const cors = require('cors');
const express = require('express');
const path = require('path');

const router = require('./Routes/route');
const uploadRoutes = require('./Routes/uploadRoutes'); // ✅ FIXED

require('./config/connection');

const app = express(); // ✅ FIXED

// Static folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// CORS

app.use(cors());

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ ROUTES
app.use('/api/upload', uploadRoutes); // 🔥 FIXED POSITION
app.use('/api', router);

// Default route
app.get("/", (req, res) => {
  res.status(200).send(`<h1>Server running successfully 🚀</h1>`);
});

// Start server
const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`Server started at port ${PORT}`);
});