const express = require("express");
const cors = require("cors");
require("dotenv").config();

const orderRoutes = require("./Routes/OrderRoutes");
const dashboardRoutes = require("./Routes/dashboard");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/orders", orderRoutes);
app.use("/api/dashboard", dashboardRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});