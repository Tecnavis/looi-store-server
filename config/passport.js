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
          user = await User.create({
            name: profile.displayName || "Google User",
            email,
            password: "google_auth",
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