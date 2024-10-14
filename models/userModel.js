// const mongoose=require('mongoose')

// // Define the admin schema
// const userSchema = new mongoose.Schema({
//     username: {
//       type: String,
//       required: true,
//       unique: true,
//       trim: true
//     },
//     email: {
//         type: String,
//         required: true,
//         unique: true,
//         match: [/.+\@.+\..+/, 'Please enter a valid email address'], // basic email validation
//       },
//     password: {
//       type: String,
//       required: true,
//       minlength: 6 
//     },
//     fullName: {
//       type: String,
//       required: true,
//       trim: true,
//   },
//   contactNumber: {
//       type: String,
//       required: false,
//       minlength: 10,
//       maxlength: 15,
//   },
//   address: {
//       type: String,
//       required: false,
//       trim: true,
//   },
//  createdAt: {
//       type: Date,
//       default: Date.now
//     }
//   });
   
//   const users=mongoose.model('user',userSchema)
//   module.exports=users

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
  address: {
    firstName: {
      type: String,
      trim: true,
      required: false // Make this field optional
    },
    lastName: {
      type: String,
      trim: true,
      required: false // Make this field optional
    },
    houseBuilding: {
      type: String,
      trim: true,
      required: false // Make this field optional
    },
    streetArea: {
      type: String,
      trim: true,
      required: false // Make this field optional
    },
    landmark: {
      type: String,
      trim: true,
      required: false // Make this field optional
    },
    postalCode: {
      type: String,
      trim: true,
      required: false // Make this field optional
    },
    cityDistrict: {
      type: String,
      trim: true,
      required: false // Make this field optional
    },
    phoneNumber: {
      type: String,
      trim: true,
      required: false // Make this field optional
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const users = mongoose.model('user', userSchema);
module.exports = users;


