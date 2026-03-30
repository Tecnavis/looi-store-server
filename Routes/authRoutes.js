const express = require("express");
const passport = require("passport");
const generateToken = require("../utils/generateToken");

const router = express.Router();

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account", // 🔥 important UX fix
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "https://looi.in/login",
    session: false,
  }),
  async (req, res) => {
    try {
      if (!req.user) {
        return res.redirect("https://looi.in/login?error=user_not_found");
      }

      const token = generateToken(req.user);

      return res.redirect(
        `https://looi.in/login-success?token=${token}`
      );
    } catch (err) {
      console.error("❌ CALLBACK ERROR:", err);
      return res.redirect("https://looi.in/login?error=server_error");
    }
  }
);

module.exports = router;