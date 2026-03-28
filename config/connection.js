const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.CONNECTION_STRING);
    console.log("MongoDB Connected ✅");
  } catch (err) {
    console.error("MongoDB Error ❌:", err);
    process.exit(1);
  }
};

connectDB();