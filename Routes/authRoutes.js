const express = require("express");
const passport = require("passport");

const router = express.Router();

// GOOGLE LOGIN
router.get("/google",
  passport.authenticate("google", {
    scope: ["profile", "email"]
  })
);

// GOOGLE CALLBACK
router.get("/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    res.redirect(`https://looi.in/login-success?user=${req.user._id}`);
  }
);

// FACEBOOK LOGIN
router.get("/facebook",
  passport.authenticate("facebook", { scope: ["email"] })
);

// FACEBOOK CALLBACK
router.get("/facebook/callback",
  passport.authenticate("facebook", { failureRedirect: "/login" }),
  (req, res) => {
    res.redirect(`https://looi.in/login-success?user=${req.user._id}`);
  }
);

module.exports = router;