// const bcrypt = require('bcrypt');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const Counter=require('../models/counterModel')

exports.registerUser = async (req, res) => {
  const { username, email, password, fullName, passwordConfirm } = req.body;

  try {
    // Check if user already exists by username or email
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(406).json("User already exists");
    }

    // Check if passwords match
    if (password !== passwordConfirm) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user with hashed password
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      fullName
    });

    // Save the user (pre-save will set userCount)
    await newUser.save();

    return res.status(201).json({
      _id: newUser._id,
      username: newUser.username,
      email: newUser.email,
      fullName: newUser.fullName,
      userCount: newUser.userCount
    });
  } catch (err) {
    return res.status(500).json({ message: "Error creating user", error: err.message });
  }
};
// Get Total Users Controller
exports.getUserCount = async (req, res) => {
  try {
    const counter = await Counter.findById('userCount');
    const userCount = counter ? counter.count : 0; // Fallback to 0 if counter is not found
    console.log("Fetched user count:", userCount); // Log the fetched count
    return res.status(200).json({ userCount });
  } catch (err) {
    console.error("Error fetching user count:", err);
    return res.status(500).json({ message: "Error getting user count", error: err.message });
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
        const token = jwt.sign({ userId: existingUser._id ,username: existingUser.username,email: existingUser.email,}, process.env.JWT_SECRET, { expiresIn: '2h' });
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

exports.addUserAddress = async (req, res) => {
  const { userId } = req.params;
  const { firstName, lastName, houseBuilding, streetArea, landmark, postalCode, cityDistrict,state,country, phoneNumber } = req.body;

  try {
    // Push a new address into the address array
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $push: { 
          address: { // Add the new address object
            firstName,
            lastName,
            houseBuilding,
            streetArea,
            landmark,
            postalCode,
            cityDistrict,
            state,
            country,
            phoneNumber
          }
        }
      },
      { new: true, runValidators: true } // Return updated user and validate inputs
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'Address added successfully', user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteUserAddress = async (req, res) => {
  const { userId, addressId } = req.params;

  try {
    // Pull the address with the given _id from the address array
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $pull: { 
          address: { _id: addressId } // Remove the address with the specific _id
        }
      },
      { new: true } // Return the updated user
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'Address deleted successfully', user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


exports.editUserAddress = async (req, res) => {
  const { userId, addressId } = req.params;
  const { firstName, lastName, houseBuilding, streetArea, landmark, postalCode, cityDistrict,state,country, phoneNumber } = req.body;

  try {
    // Find the user by userId and the specific address by _id within the address array
    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, 'address._id': addressId },
      {
        $set: {
          'address.$.firstName': firstName,
          'address.$.lastName': lastName,
          'address.$.houseBuilding': houseBuilding,
          'address.$.streetArea': streetArea,
          'address.$.landmark': landmark,
          'address.$.postalCode': postalCode,
          'address.$.cityDistrict': cityDistrict,
          'address.$.state': state,
          'address.$.country': country,
          'address.$.phoneNumber': phoneNumber
        }
      },
      { new: true, runValidators: true } // Return the updated document and validate inputs
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User or address not found' });
    }

    res.status(200).json({ message: 'Address updated successfully', user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


exports.getUserDetails = async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json({ users });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// reset password

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },

});

// Step 1: Request a password reset
exports.resetPasswordRequest = async (req, res) => {
  const { email } = req.body;
  
  try {
      const user = await User.findOne({ email });
      if (!user) {
          return res.status(400).json({ message: 'No user found with that email' });
      }

      const resetToken = crypto.randomBytes(20).toString('hex');
      const resetExpire = Date.now() + 3600000; // 1 hour from now

      user.resetPasswordToken = resetToken;
      user.resetPasswordExpire = resetExpire;
      await user.save();

      // Send the password reset email
      const resetURL = `http://localhost:3000/reset-password/${resetToken}`;

      const mailOptions = {
          from: process.env.EMAIL_USER,
          to: email,
          subject: 'Password Reset Request',
          text: `You are receiving this email because you (or someone else) have requested to reset the password for your account. Please click the following link to reset your password: ${resetURL}.`
      };

      await transporter.sendMail(mailOptions);
      res.json({ message: 'Password reset email sent!' });

  } catch (err) {
      res.status(500).json({ message: 'Something went wrong' });
  }
};

// Step 2: Reset the password
exports.resetPassword = async (req, res) => {
  const { newPassword } = req.body;
  const token = req.params.token;
  try {
      const user = await User.findOne({
          resetPasswordToken: token,
          resetPasswordExpire: { $gt: Date.now() }
      });

      if (!user) {
          return res.status(400).json({ message: 'Invalid or expired token' });
      }

      user.password = await bcrypt.hash(newPassword, 10);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();

      res.json({ message: 'Password successfully reset' });

  } catch (err) {
      res.status(500).json({ message: 'Something went wrong' });
  }
};


//delete user by Id
exports.deleteUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
//get user by Id
exports.getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
//update user by Id
exports.updateUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const updatedUser = await User.findByIdAndUpdate(userId, req.body, { new: true });
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ message: 'User updated successfully', user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
