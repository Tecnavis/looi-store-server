require("dotenv").config();
const mongoose = require("mongoose");

const CONNECTION_STRING =
  process.env.CONNECTION_STRING || process.env.MONGO_URI;

if (!CONNECTION_STRING) {
  console.error("❌ MongoDB connection string is missing!");
  console.error("Add CONNECTION_STRING or MONGO_URI in Render environment variables.");
  process.exit(1);
}

mongoose
  .connect(CONNECTION_STRING)
  .then(() => {
    console.log("✅ MongoDB Atlas connected with StoreServer");
  })
  .catch((err) => {
    console.log("❌ MongoDB connection failed");
    console.log(err);
    process.exit(1);
  });
