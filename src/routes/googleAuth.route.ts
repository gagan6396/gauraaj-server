import express from "express";
import passport from "../config/passport";
import { googleAuthSuccess } from "../middlewares/googleOAuthMiddleware";

const googleRoute = express.Router();

googleRoute.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

googleRoute.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  googleAuthSuccess
);

export default googleRoute;
