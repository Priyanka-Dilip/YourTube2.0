import express from "express";

import {
  login,
  updateprofile,
  upgradePlan,
  updateTheme,
  sendOTP,
  verifyOTP,
} from "../controllers/auth.js";

const routes = express.Router();

routes.post("/login", login);

routes.patch("/update/:id", updateprofile);

routes.patch("/upgrade/:id", upgradePlan);

// Update user's theme
routes.patch("/theme/:id", updateTheme);

// ==========================================
// OTP SECURITY ROUTES
// ==========================================
routes.post("/send-otp", sendOTP);

routes.post("/verify-otp", verifyOTP);

export default routes;