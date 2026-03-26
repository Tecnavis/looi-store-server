const jwt = require('jsonwebtoken');
const admins = require('../models/adminModel');
const bcrypt = require('bcryptjs');


// ✅ REGISTER ADMIN
exports.registerAdmin = async (req, res) => {
  console.log("Inside Register request");

  const { username, password } = req.body;

  try {
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password required" });
    }

    const existingUser = await admins.findOne({ username });

    if (existingUser) {
      return res.status(406).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new admins({
      username,
      password: hashedPassword,
    });

    await newUser.save();

    return res.status(200).json({
      message: "Admin registered successfully",
      user: newUser,
    });

  } catch (err) {
    console.error("REGISTER ERROR:", err);
    return res.status(500).json({ message: err.message });
  }
};



// ✅ LOGIN ADMIN (🔥 FIXED)
exports.loginAdmin = async (req, res) => {
  console.log("Inside login function");

  const { username, password } = req.body;

  try {
    // ✅ Check input
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password required" });
    }

    // ✅ Find user
    const existingUser = await admins.findOne({ username });

    if (!existingUser) {
      console.log("User not found:", username);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // ✅ Check password exists
    if (!existingUser.password) {
      console.log("Password missing in DB");
      return res.status(500).json({ message: "User data corrupted" });
    }

    // ✅ Compare password
    const isPasswordValid = await bcrypt.compare(password, existingUser.password);

    if (!isPasswordValid) {
      console.log("Invalid password for:", username);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // ✅ JWT SECRET fallback (VERY IMPORTANT)
    const secret = process.env.JWT_SECRET || "looi_fallback_secret";

    // ✅ Generate token
    const token = jwt.sign(
      { userId: existingUser._id },
      secret,
      { expiresIn: '3h' }
    );

    console.log("Login successful");

    return res.status(200).json({
      success: true,
      user: existingUser,
      token: token,
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({
      message: err.message || "Internal server error",
    });
  }
};