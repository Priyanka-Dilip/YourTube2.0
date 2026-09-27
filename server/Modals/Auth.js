import mongoose from "mongoose";
const userschema = mongoose.Schema({
  email: { type: String, required: true },
  name: { type: String },
  channelname: { type: String },
  description: { type: String },
  image: { type: String },
  joinedon: { type: Date, default: Date.now },
  plan: {
  type: String,
  enum: ["free", "bronze", "silver", "gold"],
  default: "free",
},
  theme: {
  type: String,
  enum: ["light", "dark", "auto"],
  default: "auto",
  },
  // ==========================================
  // OTP SECURITY
  // ==========================================
  otp: {
    type: String,
    default: null,
  },

  otpExpiresAt: {
    type: Date,
    default: null,
  },

  // ==========================================
  // TRUSTED DEVICES
  // ==========================================
  trustedDevices: [
    {
      deviceId: {
        type: String,
      },

      ipAddress: {
        type: String,
      },

      city: {
        type: String,
      },

      state: {
        type: String,
      },

      lastLogin: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

export default mongoose.model("user", userschema);