const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
// const FacebookStrategy = require("passport-facebook").Strategy;
const User = require("../models/userModel");

// GOOGLE
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/api/auth/google/callback",
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ email: profile.emails[0].value });

    if (!user) {
      user = await User.create({
        name: profile.displayName,
        email: profile.emails[0].value,
        password: "google_auth", // dummy
      });
    }

    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));

// // FACEBOOK
// passport.use(new FacebookStrategy({
//   clientID: process.env.FACEBOOK_APP_ID,
//   clientSecret: process.env.FACEBOOK_APP_SECRET,
//   callbackURL: "/api/auth/facebook/callback",
//   profileFields: ["id", "displayName", "emails"]
// }, async (accessToken, refreshToken, profile, done) => {
//   try {
//     let email = profile.emails?.[0]?.value;

//     let user = await User.findOne({ email });

//     if (!user) {
//       user = await User.create({
//         name: profile.displayName,
//         email: email,
//         password: "facebook_auth",
//       });
//     }

//     return done(null, user);
//   } catch (err) {
//     return done(err, null);
//   }
// }));

module.exports = passport;