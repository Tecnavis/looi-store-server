// index.js
require("dotenv").config();
const cors = require("cors");
const express = require("express");
const path = require("path");

require("./config/connection");

const StoreServer = express();

// ✅ Static uploads
StoreServer.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ CORS
StoreServer.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://looi.in",
      "https://www.looi.in",
      "https://admin.looi.in",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

StoreServer.use(express.json());
StoreServer.use(express.urlencoded({ extended: true }));

// ✅ Main API route file
const routes = require("./Routes/route");
StoreServer.use("/api", routes);

// ✅ Payment routes file (your project has Routes/paymentRoutes.js)
const paymentRoutes = require("./Routes/paymentRoutes");
StoreServer.use("/api/payment", paymentRoutes);

// ✅ Default route
StoreServer.get("/", (req, res) => {
  res
    .status(200)
    .send(`<h1>Project server started and waiting for client request</h1>`);
});

// ✅ Start server
const PORT = process.env.PORT || 8000;
StoreServer.listen(PORT, () => {
  console.log(`Project server started at port ${PORT}`);
});
