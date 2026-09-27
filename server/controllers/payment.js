import Razorpay from "razorpay";
import crypto from "crypto";
import User from "../Modals/Auth.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const plans = {
  bronze: {
    name: "Bronze",
    amount: 199,
  },
  silver: {
    name: "Silver",
    amount: 399,
  },
  gold: {
    name: "Gold",
    amount: 699,
  },
};

export const createOrder = async (req, res) => {
  try {
    const { plan, userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    if (!plan || !plans[plan]) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscription plan",
      });
    }

    const selectedPlan = plans[plan];

    const options = {
      amount: selectedPlan.amount * 100,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        plan,
        planName: selectedPlan.name,
        userId: userId.toString(),
      },
    };

    const order = await razorpay.orders.create(options);

    return res.status(200).json({
      success: true,
      order,
      plan: selectedPlan,
    });
  } catch (error) {
    console.error("Create Razorpay order error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create payment order",
    });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment details are missing",
      });
    }

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed",
      });
    }

    const order = await razorpay.orders.fetch(razorpay_order_id);

    const userId = order.notes?.userId;
    const plan = order.notes?.plan;

    if (!userId || !plans[plan]) {
      return res.status(400).json({
        success: false,
        message: "Invalid order details",
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        plan: plan,
      },
      {
        new: true,
      }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: `${plans[plan].name} plan activated successfully`,
      result: user,
    });
  } catch (error) {
    console.error("Payment verification error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to verify payment",
    });
  }
};