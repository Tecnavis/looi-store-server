const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const orderRoutes = require("./routes/orderRoutes");
const dashboardRoutes = require("./routes/dashboard");

const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect("mongodb://127.0.0.1:27017/looi-store");

app.use("/api",orderRoutes);
app.use("/api",dashboardRoutes);

app.listen(5000,()=>{
console.log("Server running on port 5000");
});