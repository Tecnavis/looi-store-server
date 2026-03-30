const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const Counter = require('../models/counterModel');

// Password validation: min 8 chars, at least one letter and one number
const validatePassword = (password) => {
  if (!password || password.length < 8) {
    return "Password must be at least 8 characters long.";
  }
  if (!/[a-zA-Z]/.test(password)) {
    return "Password must contain at least one letter (a-z or A-Z).";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number (0-9).";
  }
  return null; // valid
};

exports.registerUser = async (req, res) => {
  const { username, email, password, fullName, passwordConfirm, mobileNumber } = req.body;

  try {
    // Validate required fields
    if (!username || !email || !password || !fullName) {
      return res.status(400).json({ message: "All fields (username, email, fullName, password) are required." });
    }

    // Validate password strength
    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    // Check if passwords match
    if (password !== passwordConfirm) {
      return res.status(400).json({ message: "Passwords do not match." });
    }

    // Check if user already exists by username or email
    const existingUserByEmail = await User.findOne({ email });
    if (existingUserByEmail) {
      return res.status(406).json({ message: "An account with this email already exists." });
    }
    const existingUserByUsername = await User.findOne({ username });
    if (existingUserByUsername) {
      return res.status(406).json({ message: "This username is already taken. Please choose another." });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      fullName,
      contactNumber: mobileNumber || undefined,
    });

    await newUser.save();

    return res.status(201).json({
      _id: newUser._id,
      username: newUser.username,
      email: newUser.email,
      fullName: newUser.fullName,
      userCount: newUser.userCount,
    });
  } catch (err) {
    return res.status(500).json({ message: "Error creating user. Please try again.", error: err.message });
  }
};

// Get Total Users Controller
exports.getUserCount = async (req, res) => {
  try {
    const counter = await Counter.findById('userCount');
    const userCount = counter ? counter.count : 0;
    return res.status(200).json({ userCount });
  } catch (err) {
    return res.status(500).json({ message: "Error getting user count", error: err.message });
  }
};

// User login controller
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return res.status(401).json({ message: "No account found with this email address." });
    }

    const isPasswordValid = await bcrypt.compare(password, existingUser.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Incorrect password. Please try again." });
    }

    const token = jwt.sign(
      { userId: existingUser._id, username: existingUser.username, email: existingUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    return res.status(200).json({
      user: { _id: existingUser._id, username: existingUser.username, email: existingUser.email },
      token,
    });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error. Please try again later." });
  }
};

exports.addUserAddress = async (req, res) => {
  const { userId } = req.params;
  const { firstName, lastName, houseBuilding, streetArea, landmark, postalCode, cityDistrict, state, country, phoneNumber } = req.body;
  try {
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $push: { address: { firstName, lastName, houseBuilding, streetArea, landmark, postalCode, cityDistrict, state, country, phoneNumber } } },
      { new: true, runValidators: true }
    );
    if (!updatedUser) return res.status(404).json({ message: 'User not found' });
    res.status(200).json({ message: 'Address added successfully', user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteUserAddress = async (req, res) => {
  const { userId, addressId } = req.params;
  try {
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $pull: { address: { _id: addressId } } },
      { new: true }
    );
    if (!updatedUser) return res.status(404).json({ message: 'User not found' });
    res.status(200).json({ message: 'Address deleted successfully', user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.editUserAddress = async (req, res) => {
  const { userId, addressId } = req.params;
  const { firstName, lastName, houseBuilding, streetArea, landmark, postalCode, cityDistrict, state, country, phoneNumber } = req.body;
  try {
    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, 'address._id': addressId },
      {
        $set: {
          'address.$.firstName': firstName, 'address.$.lastName': lastName,
          'address.$.houseBuilding': houseBuilding, 'address.$.streetArea': streetArea,
          'address.$.landmark': landmark, 'address.$.postalCode': postalCode,
          'address.$.cityDistrict': cityDistrict, 'address.$.state': state,
          'address.$.country': country, 'address.$.phoneNumber': phoneNumber,
        }
      },
      { new: true, runValidators: true }
    );
    if (!updatedUser) return res.status(404).json({ message: 'User or address not found' });
    res.status(200).json({ message: 'Address updated successfully', user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getUserDetails = async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json({ users });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

exports.resetPasswordRequest = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'No account found with that email address.' });

    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = Date.now() + 3600000;
    await user.save();

    const resetURL = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Request',
      text: `You requested a password reset. Click the link to reset your password: ${resetURL}`,
    };
    await transporter.sendMail(mailOptions);
    res.json({ message: 'Password reset email sent!' });
  } catch (err) {
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};

exports.resetPassword = async (req, res) => {
  const { newPassword } = req.body;
  const token = req.params.token;
  try {
    const passwordError = validatePassword(newPassword);
    if (passwordError) return res.status(400).json({ message: passwordError });

    const user = await User.findOne({ resetPasswordToken: token, resetPasswordExpire: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ message: 'Invalid or expired reset token.' });

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    res.json({ message: 'Password successfully reset.' });
  } catch (err) {
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};

exports.deleteUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) return res.status(404).json({ message: 'User not found' });
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const updatedUser = await User.findByIdAndUpdate(userId, req.body, { new: true });
    if (!updatedUser) return res.status(404).json({ message: 'User not found' });
    res.status(200).json({ message: 'User updated successfully', user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
