const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.CONNECTION_STRING;
  
  if (!uri) {
    console.error('MongoDB Error ❌: CONNECTION_STRING environment variable is not set');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log("MongoDB Connected ✅");
  } catch (err) {
    console.error("MongoDB Error ❌:", err.message);
    // Don't exit - let Render restart the process
    setTimeout(connectDB, 5000); // retry after 5s
  }
};

connectDB();
