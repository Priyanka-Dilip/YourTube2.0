import comment from "../Modals/comment.js";
import mongoose from "mongoose";
import { translate } from "@vitalets/google-translate-api";
// ==========================================
// COMMENT MODERATION
// ==========================================
const abusiveWords = [
  "idiot",
  "stupid",
  "fool",
  "moron",
  "loser",
  "bastard",
  "asshole",
  "fuck",
  "shit",
  "bitch",
];

const checkCommentModeration = (text) => {
  if (!text || typeof text !== "string") {
    return {
      blocked: false,
    };
  }

  const cleanText = text.trim();
  const lowerText = cleanText.toLowerCase();

  // ==========================================
  // 1. ABUSIVE WORD DETECTION
  // ==========================================
  const containsAbusiveWord = abusiveWords.some((word) => {
    const regex = new RegExp(`\\b${word}\\b`, "i");
    return regex.test(lowerText);
  });

  if (containsAbusiveWord) {
    return {
      blocked: true,
      reason: "Comment contains abusive or inappropriate language.",
    };
  }

  // ==========================================
  // 2. REPEATED CHARACTER DETECTION
  // ==========================================
  // Example: !!!!!!!! or aaaaaaaa
  if (/(.)\1{5,}/.test(cleanText)) {
    return {
      blocked: true,
      reason: "Comment contains too many repeated characters.",
    };
  }

  // ==========================================
  // 3. EXCESSIVE SPECIAL CHARACTERS
  // ==========================================
  const specialCharacters =
    cleanText.match(/[^a-zA-Z0-9\s]/g) || [];

  if (
    cleanText.length >= 10 &&
    specialCharacters.length / cleanText.length > 0.5
  ) {
    return {
      blocked: true,
      reason: "Comment contains too many special characters.",
    };
  }

  // ==========================================
  // 4. REPEATED-WORD SPAM
  // ==========================================
  const words = lowerText
    .split(/\s+/)
    .filter((word) => word.length > 0);

  const wordCount = {};

  for (const word of words) {
    wordCount[word] = (wordCount[word] || 0) + 1;

    if (wordCount[word] >= 5) {
      return {
        blocked: true,
        reason: "Comment appears to contain spam.",
      };
    }
  }

  // ==========================================
  // 5. TOO MANY LINKS
  // ==========================================
  const links =
    cleanText.match(/(https?:\/\/|www\.)[^\s]+/gi) || [];

  if (links.length >= 3) {
    return {
      blocked: true,
      reason: "Comment contains too many links.",
    };
  }

  return {
    blocked: false,
  };
};

// ==========================================
// POST COMMENT
// ==========================================
export const postcomment = async (req, res) => {
  const commentdata = req.body;

  // Task 6 - comment moderation
  const moderation = checkCommentModeration(commentdata.commentbody);

  if (moderation.blocked) {
    return res.status(400).json({
      message: moderation.reason,
      blocked: true,
    });
  }

  const postcomment = new comment(commentdata);

  try {
    await postcomment.save();
    return res.status(200).json({ comment: true });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// ==========================================
// GET ALL COMMENTS
// ==========================================
export const getallcomment = async (req, res) => {
  const { videoid } = req.params;

  try {
    const commentvideo = await comment.find({ videoid: videoid });

    return res.status(200).json(commentvideo);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// ==========================================
// DELETE COMMENT
// ==========================================
export const deletecomment = async (req, res) => {
  const { id: _id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }

  try {
    await comment.findByIdAndDelete(_id);

    return res.status(200).json({ comment: true });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// ==========================================
// EDIT COMMENT
// ==========================================
export const editcomment = async (req, res) => {
  const { id: _id } = req.params;
  const { commentbody } = req.body;

  // Task 6 - comment moderation
  const moderation = checkCommentModeration(commentbody);

  if (moderation.blocked) {
    return res.status(400).json({
      message: moderation.reason,
      blocked: true,
    });
  }

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }

  try {
    const updatecomment = await comment.findByIdAndUpdate(_id, {
      $set: { commentbody: commentbody },
    });

    res.status(200).json(updatecomment);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// ==========================================
// LIKE COMMENT
// ==========================================
export const likeComment = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  if (
    !mongoose.Types.ObjectId.isValid(id) ||
    !mongoose.Types.ObjectId.isValid(userId)
  ) {
    return res.status(400).json({
      message: "Invalid comment or user ID",
    });
  }

  try {
    const existingComment = await comment.findById(id);

    if (!existingComment) {
      return res.status(404).json({
        message: "Comment not found",
      });
    }

    // Safety for older comments created before likes were added
    if (!existingComment.likes) {
      existingComment.likes = [];
    }

    if (!existingComment.dislikes) {
      existingComment.dislikes = [];
    }

    const alreadyLiked = existingComment.likes.some(
      (user) => user.toString() === userId
    );

    if (alreadyLiked) {
      existingComment.likes.pull(userId);
    } else {
      existingComment.likes.push(userId);
      existingComment.dislikes.pull(userId);
    }

    await existingComment.save();

    return res.status(200).json({
      likes: existingComment.likes.length,
      dislikes: existingComment.dislikes.length,
    });
  } catch (error) {
    console.error("Like comment error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

// ==========================================
// DISLIKE COMMENT
// ==========================================
export const dislikeComment = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  if (
    !mongoose.Types.ObjectId.isValid(id) ||
    !mongoose.Types.ObjectId.isValid(userId)
  ) {
    return res.status(400).json({
      message: "Invalid comment or user ID",
    });
  }

  try {
    const existingComment = await comment.findById(id);

    if (!existingComment) {
      return res.status(404).json({
        message: "Comment not found",
      });
    }

    // Safety for older comments created before dislikes were added
    if (!existingComment.likes) {
      existingComment.likes = [];
    }

    if (!existingComment.dislikes) {
      existingComment.dislikes = [];
    }

    const alreadyDisliked = existingComment.dislikes.some(
      (user) => user.toString() === userId
    );

    if (alreadyDisliked) {
      existingComment.dislikes.pull(userId);
    } else {
      existingComment.dislikes.push(userId);
      existingComment.likes.pull(userId);
    }

    await existingComment.save();

    return res.status(200).json({
      likes: existingComment.likes.length,
      dislikes: existingComment.dislikes.length,
    });
  } catch (error) {
    console.error("Dislike comment error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

// ==========================================
// REPORT COMMENT
// ==========================================
export const reportComment = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  if (
    !mongoose.Types.ObjectId.isValid(id) ||
    !mongoose.Types.ObjectId.isValid(userId)
  ) {
    return res.status(400).json({
      message: "Invalid comment or user ID",
    });
  }

  try {
    const existingComment = await comment.findById(id);

    if (!existingComment) {
      return res.status(404).json({
        message: "Comment not found",
      });
    }

    // Safety for older comments created before reports were added
    if (!existingComment.reports) {
      existingComment.reports = [];
    }

    const alreadyReported = existingComment.reports.some(
      (user) => user.toString() === userId
    );

    if (!alreadyReported) {
      existingComment.reports.push(userId);
    }

    // Flag the comment for review.
    // It is NOT automatically deleted.
    existingComment.flagged = true;
    existingComment.moderationStatus = "flagged";

    await existingComment.save();

    return res.status(200).json({
      message: "Comment reported and flagged for review.",
      flagged: true,
    });
  } catch (error) {
    console.error("Report comment error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};
// ==========================================
// TRANSLATE COMMENT
// ==========================================
export const translateComment = async (req, res) => {
  const { id } = req.params;
  const { to } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      message: "Invalid comment ID",
    });
  }

  if (!to) {
    return res.status(400).json({
      message: "Target language is required",
    });
  }

  try {
    const existingComment = await comment.findById(id);

    if (!existingComment) {
      return res.status(404).json({
        message: "Comment not found",
      });
    }

    const result = await translate(existingComment.commentbody, {
      to: to,
    });

    return res.status(200).json({
      originalText: existingComment.commentbody,
      translatedText: result.text,
      translatedLanguage: to,
    });
  } catch (error) {
    console.error("Translate comment error:", error);

    return res.status(500).json({
      message: "Unable to translate comment",
    });
  }
};