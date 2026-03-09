const mongoose=require('mongoose')

// Define the admin schema
const adminSchema = new mongoose.Schema({
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    password: {
      type: String,
      required: true,
      minlength: 6 // Ensure password has a minimum length
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    resetPasswordToken: { type: String },
    resetPasswordExpire: { type: Date },
  });
   
  const admins=mongoose.model('admin',adminSchema)
  module.exports=admins
