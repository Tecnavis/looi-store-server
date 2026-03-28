require('dotenv').config();

const cors = require('cors');
const express = require('express');

const router = require('./Routes/route');
const uploadRoutes = require('./Routes/uploadRoutes');

require('./config/connection');

const app = express();

// CORS - allow requests from the frontend domains
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

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/upload', uploadRoutes);
app.use('/api', router);

// Default route
app.get('/', (req, res) => {
  res.status(200).send('<h1>Server running successfully 🚀</h1>');
});

// Start server
const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`Server started at port ${PORT}`);
});
