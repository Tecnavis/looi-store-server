
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
    required: false,
    unique: true,
    sparse: true, // allows multiple users without an email (phone-only accounts)
    lowercase: true,
    trim: true,
    match: [/.+\@.+\..+/, 'Please enter a valid email address'], // basic email validation
  },
  // No longer required — accounts created via OTP (email or phone) are passwordless.
  password: {
    type: String,
    required: false,
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
    unique: true,
    sparse: true, // allows multiple users without a phone number (email-only accounts)
    trim: true,
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


// The production DB has pre-existing non-sparse unique indexes on `email`
// (and possibly `contactNumber`) from before phone-only / email-only accounts
// were supported. A non-sparse unique index treats every doc missing that
// field as having the same value (null), so the second phone-only signup
// would fail with a duplicate key error. This converts them to sparse to
// match the schema above. Safe to run on every startup — it's a no-op once
// the indexes are already correct.
userSchema.statics.fixIndexes = async function () {
  try {
    const collection = this.collection;
    const indexes = await collection.indexes();

    for (const field of ['email', 'contactNumber']) {
      const staleIndex = indexes.find(
        (idx) => idx.key && Object.keys(idx.key).length === 1 && idx.key[field] !== undefined && idx.unique && !idx.sparse
      );
      if (staleIndex) {
        await collection.dropIndex(staleIndex.name);
        console.log(`[userModel] Dropped non-sparse unique index on "${field}": ${staleIndex.name}`);
      }
    }
    await collection.createIndex({ email: 1 }, { unique: true, sparse: true });
    await collection.createIndex({ contactNumber: 1 }, { unique: true, sparse: true });
  } catch (e) {
    // Non-fatal — most likely the indexes are already correct.
    console.log('[userModel] fixIndexes (non-fatal):', e.message);
  }
};

const users = mongoose.model('user', userSchema);
module.exports = users;


