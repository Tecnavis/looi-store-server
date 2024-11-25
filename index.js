// index.js
require('dotenv').config();
const cors = require('cors');
const express = require("express");
const router = require('./Routes/route');
var path=require('path')


require('./config/connection')
const StoreServer = express();
StoreServer.use('/uploads', express.static(path.join(__dirname, 'uploads')));
StoreServer.use(cors());
StoreServer.use(cors({
    origin: ['http://localhost:5173', 'https://looi.in',"https://admin.looi.in"],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  }));
  
StoreServer.use(express.json());
StoreServer.use(express.urlencoded({ extended: true }));


const PORT = process.env.PORT || 8000;

// Routes
StoreServer.use(router);

// Start the server
StoreServer.listen(PORT, () => {
    console.log(`Project server started at port ${PORT}`);
});

// Default route
StoreServer.get("/", (req, res) => {
    res.status(200).send(`<h1>Project server started and waiting for client request</h1>`);
});
