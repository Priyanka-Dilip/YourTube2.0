import mongoose from "mongoose";
import nodemailer from "nodemailer";
import users from "../Modals/Auth.js";

export const login = async (req, res) => {
  const { email, name, image } = req.body;

  try {
    const existingUser = await users.findOne({ email });

    if (!existingUser) {
      const newUser = await users.create({ email, name, image });
      return res.status(201).json({ result: newUser });
    } else {
      return res.status(200).json({ result: existingUser });
    }
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
export const updateprofile = async (req, res) => {
  const { id: _id } = req.params;
  const { channelname, description } = req.body;

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(500).json({
      message: "User unavailable...",
    });
  }

  try {
    const updatedata = await users.findByIdAndUpdate(
      _id,
      {
        $set: {
          channelname: channelname,
          description: description,
        },
      },
      { new: true }
    );

    return res.status(201).json(updatedata);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};
export const upgradePlan = async (req, res) => {
  const { id } = req.params;
  const { plan } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      message: "Invalid user ID",
    });
  }

  const allowedPlans = ["bronze", "silver", "gold"];

  if (!allowedPlans.includes(plan)) {
    return res.status(400).json({
      message: "Invalid subscription plan",
    });
  }

  try {
    const updatedUser = await users.findByIdAndUpdate(
      id,
      {
        $set: {
          plan: plan,
        },
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      message: `Successfully upgraded to ${plan}`,
      result: updatedUser,
    });
  } catch (error) {
    console.error("Plan upgrade error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};
// ==========================================
// UPDATE USER THEME
// ==========================================
export const updateTheme = async (req, res) => {
  const { id } = req.params;
  const { theme } = req.body;

  // Check user ID
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      message: "Invalid user ID",
    });
  }

  // Only these three values are allowed
  const allowedThemes = ["light", "dark", "auto"];

  if (!allowedThemes.includes(theme)) {
    return res.status(400).json({
      message: "Invalid theme",
    });
  }

  try {
    const updatedUser = await users.findByIdAndUpdate(
      id,
      {
        $set: {
          theme: theme,
        },
      },
      {
        new: true,
      }
    );

    if (!updatedUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      message: "Theme updated successfully",
      result: updatedUser,
    });
  } catch (error) {
    console.error("Theme update error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};
// ==========================================
// OTP EMAIL TRANSPORTER
// ==========================================
const createMailTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    throw new Error(
      "EMAIL_USER and EMAIL_PASSWORD are missing from the server .env file."
    );
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

// ==========================================
// SEND OTP
// ==========================================
export const sendOTP = async (req, res) => {
  const { id } = req.body;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      message: "Invalid user ID",
    });
  }

  try {
    const user = await users.findById(id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (!user.email) {
      return res.status(400).json({
        message: "User email is not available.",
      });
    }

    const otp = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    const otpExpiresAt = new Date(
      Date.now() + 5 * 60 * 1000
    );

    user.otp = otp;
    user.otpExpiresAt = otpExpiresAt;

    await user.save();

    const transporter = createMailTransporter();

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "YourTube Security Verification Code",
      text: `Your YourTube verification code is ${otp}. This code will expire in 5 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto;">
          <h2>YourTube Security Verification</h2>

          <p>Your verification code is:</p>

          <div style="
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 8px;
            padding: 20px;
            text-align: center;
            background: #f3f4f6;
            border-radius: 8px;
          ">
            ${otp}
          </div>

          <p>This code will expire in <strong>5 minutes</strong>.</p>

          <p>
            If you did not request this code, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    return res.status(200).json({
      message: "OTP sent successfully.",
    });
  } catch (error) {
    console.error("Send OTP error:", error);

    return res.status(500).json({
      message: "Unable to send OTP.",
    });
  }
};

// ==========================================
// VERIFY OTP
// ==========================================
export const verifyOTP = async (req, res) => {
  const { id, otp } = req.body;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      message: "Invalid user ID",
    });
  }

  if (!otp || !/^\d{6}$/.test(String(otp))) {
    return res.status(400).json({
      message: "Please enter a valid 6-digit OTP.",
    });
  }

  try {
    const user = await users.findById(id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (!user.otp || !user.otpExpiresAt) {
      return res.status(400).json({
        message: "No OTP is active. Please request a new OTP.",
      });
    }

    if (new Date() > new Date(user.otpExpiresAt)) {
      user.otp = null;
      user.otpExpiresAt = null;

      await user.save();

      return res.status(400).json({
        message: "OTP has expired. Please request a new OTP.",
      });
    }

    if (String(user.otp) !== String(otp)) {
      return res.status(400).json({
        message: "Incorrect OTP.",
      });
    }

    user.otp = null;
    user.otpExpiresAt = null;

    await user.save();

    return res.status(200).json({
      message: "OTP verified successfully.",
      result: user,
    });
  } catch (error) {
    console.error("Verify OTP error:", error);

    return res.status(500).json({
      message: "Unable to verify OTP.",
    });
  }
};
