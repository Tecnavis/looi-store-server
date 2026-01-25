const jwt = require("jsonwebtoken");
const admins = require("../models/adminModel");
const bcrypt = require("bcryptjs");

// ✅ REGISTER ADMIN
exports.registerAdmin = async (req, res) => {
  console.log("Inside Register request");

  const { username, password } = req.body;

  try {
    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required" });
    }

    const existingUser = await admins.findOne({ username });

    if (existingUser) {
      return res.status(406).json({ message: "User already exists" });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = new admins({
      username,
      password: hashedPassword,
    });

    await newUser.save();

    return res.status(201).json({
      message: "Admin registered successfully",
      user: {
        _id: newUser._id,
        username: newUser.username,
      },
    });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ LOGIN ADMIN
exports.loginAdmin = async (req, res) => {
  console.log("Inside login function");

  const { username, password } = req.body;

  try {
    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required" });
    }

    const existingUser = await admins.findOne({ username });

    if (!existingUser) {
      console.log("User not found:", username);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      existingUser.password
    );

    if (!isPasswordValid) {
      console.log("Invalid password for username:", username);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // ✅ FIX: JWT_SECRET fallback if missing in Render
    const secret = process.env.JWT_SECRET || "myjwtsecretkey";

    const token = jwt.sign(
      { userId: existingUser._id },
      secret,
      { expiresIn: "3h" }
    );

    console.log("Login successful");

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        _id: existingUser._id,
        username: existingUser.username,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
