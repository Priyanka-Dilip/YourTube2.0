import React, { useState } from "react";
import Videogrid from "@/components/Videogrid";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const Subscriptions = () => {
  const { user, login } = useUser();

  const currentPlan = user?.plan || "free";
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadRazorpay = () => {
    return new Promise<boolean>((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);

      document.body.appendChild(script);
    });
  };

  const handleUpgradeClick = (plan: string) => {
    if (!user) {
      alert("Please login first.");
      return;
    }

    if (plan === currentPlan) {
      return;
    }

    setSelectedPlan(plan);
  };

  const handlePayment = async () => {
    if (!user?._id) {
      alert("User ID is missing. Please login again.");
      return;
    }

    if (!selectedPlan) {
      alert("Please select a plan first.");
      return;
    }

    try {
      setLoading(true);

      const razorpayLoaded = await loadRazorpay();

      if (!razorpayLoaded) {
        alert("Unable to load Razorpay. Please check your internet connection.");
        setLoading(false);
        return;
      }

      // Create Razorpay order
      const response = await axiosInstance.post(
        "/payment/create-order",
        {
          plan: selectedPlan,
          userId: user._id,
        }
      );

      const { order, plan } = response.data;

      if (!order?.id) {
        throw new Error("Razorpay order was not created.");
      }

      const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

      if (!razorpayKey) {
        throw new Error(
          "Razorpay Test Key ID is missing from the frontend .env file."
        );
      }

      const options = {
        key: razorpayKey,
        amount: order.amount,
        currency: order.currency || "INR",
        name: "YouTube Clone",
        description: `${plan.name} Subscription`,
        order_id: order.id,

        prefill: {
          name: user.name || "",
          email: user.email || "",
        },

        notes: {
          userId: user._id,
          plan: selectedPlan,
        },

        // Razorpay payment window theme.
        // This is intentionally kept separate from the website theme.
        theme: {
          color: "#000000",
        },

        handler: async function (paymentResponse: any) {
          try {
            // Verify the Razorpay payment on the backend
            const verifyResponse = await axiosInstance.post(
              "/payment/verify",
              {
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_signature: paymentResponse.razorpay_signature,
              }
            );

            if (!verifyResponse.data?.success) {
              throw new Error("Payment verification failed.");
            }

            // Update user information in frontend
            if (verifyResponse.data.result) {
              login(verifyResponse.data.result);
            }

            setSelectedPlan(null);

            alert(
              `Payment successful! You are now subscribed to the ${plan.name} plan.`
            );
          } catch (error: any) {
            console.error("Payment verification error:", error);

            alert(
              error?.response?.data?.message ||
                "Payment was completed, but verification failed."
            );
          } finally {
            setLoading(false);
          }
        },

        modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },
      };

      const paymentObject = new window.Razorpay(options);

      paymentObject.on("payment.failed", function (response: any) {
        console.error("Razorpay payment failed:", response);

        alert("Payment failed. Please try again using Razorpay Test Mode.");

        setLoading(false);
      });

      paymentObject.open();
    } catch (error: any) {
      console.error("Payment error:", error);

      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to start payment.";

      alert(message);
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 min-h-screen bg-background text-foreground p-4">
      <h1 className="text-2xl font-semibold mb-6">
        Subscriptions
      </h1>

      {/* Subscription Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">

        {/* FREE */}
        <div
          className={`border rounded-xl p-6 ${
            currentPlan === "free"
              ? "border-blue-500"
              : "border-border"
          }`}
        >
          <h2 className="text-xl font-semibold mb-2">
            Free
          </h2>

          <p className="text-muted-foreground mb-4">
            Basic access for regular users.
          </p>

          <ul className="space-y-2 text-sm mb-6">
            <li>✓ Watch videos</li>
            <li>✓ Like and comment</li>
            <li>✓ Watch Later</li>
            <li>✓ 1 download per day</li>
          </ul>

          {currentPlan === "free" && (
            <span className="inline-block px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium">
              Current Plan
            </span>
          )}
        </div>

        {/* BRONZE */}
        <div
          className={`border rounded-xl p-6 ${
            currentPlan === "bronze"
              ? "border-blue-500"
              : "border-border"
          }`}
        >
          <h2 className="text-xl font-semibold mb-2">
            Bronze
          </h2>

          <p className="text-muted-foreground mb-4">
            Basic premium benefits.
          </p>

          <ul className="space-y-2 text-sm mb-6">
            <li>✓ Watch videos</li>
            <li>✓ Like and comment</li>
            <li>✓ Watch Later</li>
            <li>✓ 2 downloads per day</li>
          </ul>

          {currentPlan === "bronze" ? (
            <span className="inline-block px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium">
              Current Plan
            </span>
          ) : (
            <button
              type="button"
              onClick={() => handleUpgradeClick("bronze")}
              className="px-5 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
            >
              Upgrade to Bronze
            </button>
          )}
        </div>

        {/* SILVER */}
        <div
          className={`border rounded-xl p-6 ${
            currentPlan === "silver"
              ? "border-blue-500"
              : "border-border"
          }`}
        >
          <h2 className="text-xl font-semibold mb-2">
            Silver
          </h2>

          <p className="text-muted-foreground mb-4">
            Enhanced viewing experience.
          </p>

          <ul className="space-y-2 text-sm mb-6">
            <li>✓ Watch videos</li>
            <li>✓ Like and comment</li>
            <li>✓ Watch Later</li>
            <li>✓ 3 downloads per day</li>
            <li>✓ Longer watch time</li>
          </ul>

          {currentPlan === "silver" ? (
            <span className="inline-block px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium">
              Current Plan
            </span>
          ) : (
            <button
              type="button"
              onClick={() => handleUpgradeClick("silver")}
              className="px-5 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
            >
              Upgrade to Silver
            </button>
          )}
        </div>

        {/* GOLD */}
        <div
          className={`border rounded-xl p-6 ${
            currentPlan === "gold"
              ? "border-blue-500"
              : "border-border"
          }`}
        >
          <h2 className="text-xl font-semibold mb-2">
            Gold
          </h2>

          <p className="text-muted-foreground mb-4">
            Maximum premium benefits.
          </p>

          <ul className="space-y-2 text-sm mb-6">
            <li>✓ Watch videos</li>
            <li>✓ Like and comment</li>
            <li>✓ Watch Later</li>
            <li>✓ 5 downloads per day</li>
            <li>✓ Longer watch time</li>
            <li>✓ Ad-free viewing</li>
          </ul>

          {currentPlan === "gold" ? (
            <span className="inline-block px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium">
              Current Plan
            </span>
          ) : (
            <button
              type="button"
              onClick={() => handleUpgradeClick("gold")}
              className="px-5 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
            >
              Upgrade to Gold
            </button>
          )}
        </div>
      </div>

      {/* Selected Plan */}
      {selectedPlan && (
        <div className="border border-border rounded-xl p-6 mb-10 max-w-2xl bg-card text-card-foreground">
          <h2 className="text-xl font-semibold mb-2">
            {selectedPlan.charAt(0).toUpperCase() +
              selectedPlan.slice(1)}{" "}
            Plan Selected
          </h2>

          <p className="text-muted-foreground mb-4">
            You selected the {selectedPlan} plan.
          </p>

          <button
            type="button"
            onClick={handlePayment}
            disabled={loading}
            className="px-5 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Opening Payment..." : "Continue to Payment"}
          </button>

          <button
            type="button"
            onClick={() => setSelectedPlan(null)}
            disabled={loading}
            className="ml-3 px-5 py-2 border border-border rounded-lg hover:bg-secondary disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Subscribed Channels */}
      <h2 className="text-xl font-semibold mb-4">
        Subscribed Channels
      </h2>

      <Videogrid />
    </main>
  );
};

export default Subscriptions;