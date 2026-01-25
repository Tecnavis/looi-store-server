// index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

require("./config/connection");

const StoreServer = express();

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

// ✅ Middleware
StoreServer.use(express.json());
StoreServer.use(express.urlencoded({ extended: true }));

// ✅ Static uploads
StoreServer.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ Routes
const routes = require("./Routes/route"); // keep same as your folder name
StoreServer.use("/api", routes);

// ✅ Payment Routes (make sure this path is correct)
// if your folder is src/routes/paymentRoutes then use "./routes/paymentRoutes"
const paymentRoutes = require("./paymentRoutes");
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
