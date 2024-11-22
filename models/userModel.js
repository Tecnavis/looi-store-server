
const mongoose = require('mongoose');
const Counter=require('./counterModel')

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
    state:{
      type: String,
      trim: true,
      required: false // Optional field
    },
    country: {
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
  orders: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
}],
  userCount: {
    type: Number,
    default: 0
},
  createdAt: {
    type: Date,
    default: Date.now
  }
});


userSchema.pre('save', async function (next) {
  if (this.isNew) {
    try {
      // Find and increment the user counter
      const counter = await Counter.findByIdAndUpdate(
        'userCount',
        { $inc: { count: 1 } },
        { upsert: true, new: true }
      );

      if (counter) {
        // Assign the current count to this user's userCount field
        this.userCount = counter.count;
        console.log("User count updated to:", counter.count); // Log the updated count
      } else {
        console.error("Counter document not found or could not be created.");
      }
    } catch (error) {
      console.error("Error updating user count:", error);
      return next(error);
    }
  }
  next();
});


const users = mongoose.model('user', userSchema);
module.exports = users;


