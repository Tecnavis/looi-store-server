const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

// User registration controller
exports.registerUser = async (req, res) => {
    console.log("Inside User Register request");
    const { username, email, password, fullName, passwordConfirm } = req.body;
    console.log(username, email, fullName, password, passwordConfirm);

    try {
        // Check if the user already exists (either by username or email)
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(406).json("User already exists");
        }

        // Check if password and passwordConfirm match
        if (password !== passwordConfirm) {
            return res.status(400).json({ message: "Passwords do not match" });
        }

        // Hash the password before saving
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create a new user
        const newUser = new User({
            username,
            email,
            password: hashedPassword, // Store hashed password
            fullName // Store full name
        });

        // Save the new user
        await newUser.save();
        return res.status(201).json({
            _id: newUser._id,
            username: newUser.username,
            email: newUser.email,
            fullName: newUser.fullName // Return full name
        });
    } catch (err) {
        return res.status(500).json({ message: "Error creating user", error: err });
    }
};


// User login controller
exports.loginUser = async (req, res) => {
    console.log("Inside User Login function");
    const { email, password } = req.body;
    console.log("Login attempt for email:", email);

    try {
        // Find the user by email
        const existingUser = await User.findOne({ email });
        if (!existingUser) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Compare the entered password with the hashed password in the database
        const isPasswordValid = await bcrypt.compare(password, existingUser.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Generate JWT token
        const token = jwt.sign({ userId: existingUser._id }, process.env.JWT_SECRET, { expiresIn: '2h' });
        console.log("Login successful, token generated:", token);

        // Send back user details and token
        return res.status(200).json({
            user: {
                _id: existingUser._id,
                username: existingUser.username,
                email: existingUser.email,
            },
            token,
        });
    } catch (err) {
        console.error("Login error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
};

exports.updateUserAddress = async (req, res) => {
    const { userId } = req.params; // Assuming userId is passed as a route param
    const { firstName, lastName, houseBuilding, streetArea, landmark, postalCode, cityDistrict, phoneNumber } = req.body;
  
    try {
      // Find user by ID and update their address
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          $set: {
            address: {
              firstName,
              lastName,
              houseBuilding,
              streetArea,
              landmark,
              postalCode,
              cityDistrict,
              phoneNumber
            }
          }
        },
        { new: true, runValidators: true } // Return the updated document and validate inputs
      );
  
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      res.status(200).json({ message: 'Address updated successfully', user: updatedUser });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  };
  
