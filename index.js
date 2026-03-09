const express = require("express");
const cors = require("cors");
require("dotenv").config();

const orderRoutes = require("./Routes/orderRoutes");
const productRoutes = require("./Routes/productRoutes");
const paymentRoutes = require("./Routes/paymentRoutes");
const dashboardRoutes = require("./Routes/dashboard");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/orders", orderRoutes);
app.use("/api/products", productRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/dashboard", dashboardRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});