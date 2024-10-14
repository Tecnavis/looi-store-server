const jwt = require('jsonwebtoken');
const admins=require('../Models/adminModel')
const bcrypt = require('bcrypt');


exports.registerAdmin = async (req, res) => {
    console.log("Inside Register request");
    const { username, password } = req.body;
    console.log(username, password);
  
    try {
        const existingUser = await admins.findOne({ username });
        if (existingUser) {
            return res.status(406).json("User Already exists");
        } else {
            // Hash the password before saving
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);
  
            const newUser = new admins({
                username,
                password: hashedPassword // store hashed password
            });
            await newUser.save();
            return res.status(200).json(newUser);
        }
    } catch (err) {
        return res.status(401).json(err);
    }
  };
 
exports.loginAdmin = async (req, res) => {
    console.log("Inside login function");
    const { username, password } = req.body;
    console.log("Login attempt for username:", username);
    
    try {
      const existingUser = await admins.findOne({ username });
      if (existingUser) {
        // Compare the password with the hashed password in the database
        const isPasswordValid = await bcrypt.compare(password, existingUser.password);
        if (isPasswordValid) {
          // Generate token
          const token = jwt.sign({ userId: existingUser._id }, process.env.JWT_SECRET,{expiresIn: '3h'});
          console.log("Login successful, token generated:", token);
          return res.status(200).json({ user: existingUser,token:token });
        } else {
          console.log("Invalid password for username:", username);
          return res.status(401).json({ message: "Invalid credentials" });
        }
      } else {
        console.log("User not found:", username);
        return res.status(401).json({ message: "Invalid credentials" });
      }
    } catch (err) {
      console.error("Login error:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  };


