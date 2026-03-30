const express = require("express");
const passport = require("passport");

const router = express.Router();

console.log("✅ Auth routes loaded");

// 🔵 GOOGLE LOGIN
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

// 🔵 GOOGLE CALLBACK
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "https://looi.in/login",
    session: false, // important (no session issues)
  }),
  async (req, res) => {
    try {
      console.log("🔥 Google callback hit");
      console.log("USER:", req.user);

      // ❌ If user not found
      if (!req.user) {
        return res.redirect("https://looi.in/login?error=user_not_found");
      }

      // ✅ Success redirect (you can later replace with JWT)
      return res.redirect(
        `https://looi.in/login-success?user=${req.user._id}`
      );

    } catch (err) {
      console.error("❌ CALLBACK ERROR:", err);
      return res.redirect("https://looi.in/login?error=server_error");
    }
  }
);

module.exports = router;