const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/userModel");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:
        "https://looi-store-server-izvs.onrender.com/api/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log("🔥 GOOGLE PROFILE:", profile);

        // ✅ SAFE email extraction
        const email = profile.emails?.[0]?.value;

        if (!email) {
          return done(new Error("No email found"), null);
        }

        // ✅ SAFE DB handling
        let user = await User.findOne({ email });

        if (!user) {
          // ✅ FIX: provide all required fields (username, fullName, password)
          const baseUsername = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "");
          const uniqueUsername = baseUsername + "_" + Date.now();

          user = await User.create({
            fullName: profile.displayName || "Google User",
            username: uniqueUsername,
            email,
            password: "google_auth_" + Date.now(), // placeholder, not used for login
          });
        }

        return done(null, user);
      } catch (err) {
        console.error("❌ GOOGLE STRATEGY ERROR:", err);
        return done(err, null);
      }
    }
  )
);

module.exports = passport;