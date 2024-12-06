import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/User.model";
import dotenv from "dotenv";

dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID!,
      clientSecret: process.env.CLIENT_SECRET!,
      callbackURL: `${process.env.BASE_URL}/api/v1/auth/google/callback`,
      scope: ["profile", "email"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user =
          (await User.findOne({ googleId: profile.id })) ||
          (await User.findOne({ email: profile.emails?.[0].value }));

        if (!user) {
          user = new User({
            googleId: profile.id,
            first_name: profile.name?.givenName,
            last_name: profile.name?.familyName,
            email: profile.emails?.[0].value,
            role: "User", // Default role
          });
          await user.save();
        }

        done(undefined, user);
      } catch (error) {
        done(error as Error, undefined);
      }
    }
  )
);

passport.serializeUser((user: any, done) => done(undefined, user.id));

// Deserialize user
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(undefined, user);
  } catch (error) {
    done(error as Error, undefined);
  }
});

export default passport;
