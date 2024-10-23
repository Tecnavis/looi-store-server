
const mongoose = require('mongoose');

// Define the user schema
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    match: [/.+\@.+\..+/, 'Please enter a valid email address'], // basic email validation
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
  },
  contactNumber: {
    type: String,
    required: false,
    minlength: 10,
    maxlength: 15,
  },
  address: [{
    firstName: {
      type: String,
      trim: true,
      required: false // Optional field
    },
    lastName: {
      type: String,
      trim: true,
      required: false // Optional field
    },
    houseBuilding: {
      type: String,
      trim: true,
      required: false // Optional field
    },
    streetArea: {
      type: String,
      trim: true,
      required: false // Optional field
    },
    landmark: {
      type: String,
      trim: true,
      required: false // Optional field
    },
    postalCode: {
      type: String,
      trim: true,
      required: false // Optional field
    },
    cityDistrict: {
      type: String,
      trim: true,
      required: false // Optional field
    },
    phoneNumber: {
      type: String,
      trim: true,
      required: false // Optional field
    }
  }],
  resetPasswordToken: { type: String },
  resetPasswordExpire: { type: Date },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const users = mongoose.model('user', userSchema);
module.exports = users;


