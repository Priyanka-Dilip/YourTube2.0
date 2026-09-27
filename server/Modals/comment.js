import mongoose from "mongoose";

const commentschema = mongoose.Schema(
  {
    // ==========================================
    // EXISTING FIELDS — KEEPING AS IT IS
    // ==========================================
    userid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },

    videoid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "videofiles",
      required: true,
    },

    commentbody: {
      type: String,
    },

    usercommented: {
      type: String,
    },

    commentedon: {
      type: Date,
      default: Date.now,
    },

    // ==========================================
    // TASK 6 — LANGUAGE
    // ==========================================
    language: {
      type: String,
      default: "en",
    },

    // ==========================================
    // TASK 6 — OPTIONAL LOCATION
    // ==========================================
    location: {
      type: String,
      default: null,
    },

    showLocation: {
      type: Boolean,
      default: false,
    },

    // ==========================================
    // TASK 6 — LIKE / DISLIKE
    // ==========================================
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
      },
    ],

    dislikes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
      },
    ],

    // ==========================================
    // TASK 6 — REPORT / MODERATION
    // ==========================================
    reports: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
      },
    ],

    flagged: {
      type: Boolean,
      default: false,
    },

    moderationStatus: {
      type: String,
      enum: ["approved", "flagged", "blocked"],
      default: "approved",
    },

    // ==========================================
    // TASK 6 — TRANSLATION
    // ==========================================
    translatedText: {
      type: String,
      default: null,
    },

    translatedLanguage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("comment", commentschema);