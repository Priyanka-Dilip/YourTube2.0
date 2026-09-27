import video from "../Modals/video.js";
import Download from "../Modals/download.js";
import User from "../Modals/Auth.js";

export const uploadvideo = async (req, res) => {
  if (req.file === undefined) {
    return res
      .status(404)
      .json({ message: "plz upload a mp4 video file only" });
  } else {
    try {
      const file = new video({
        videotitle: req.body.videotitle,
        filename: req.file.originalname,
        filepath: req.file.path,
        filetype: req.file.mimetype,
        filesize: req.file.size,
        videochanel: req.body.videochanel,
        uploader: req.body.uploader,
      });
      await file.save();
      return res.status(201).json("file uploaded successfully");
    } catch (error) {
      console.error(" error:", error);
      return res.status(500).json({ message: "Something went wrong" });
    }
  }
};
export const getallvideo = async (req, res) => {
  try {
    const files = await video.find();
    return res.status(200).send(files);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
export const downloadVideo = async (req, res) => {
  try {
    const { userId, videoId } = req.body;

    if (!userId || !videoId) {
      return res.status(400).json({
        message: "User and video are required",
      });
    }

    const user = await User.findById(userId);
    const videoFile = await video.findById(videoId);

    if (!user || !videoFile) {
      return res.status(404).json({
        message: "User or video not found",
      });
    }

    // Free users: 1 download per day
    // Premium users: 5 downloads per day
    const dailyLimit = user.plan === "premium" ? 5 : 1;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const downloadCount = await Download.countDocuments({
      user: userId,
      downloadedAt: { $gte: startOfDay },
    });

    if (downloadCount >= dailyLimit) {
      return res.status(403).json({
        message:
          user.plan === "premium"
            ? "You have reached your daily download limit."
            : "Free users can download only one video per day.",
      });
    }

    const download = new Download({
      user: userId,
      video: videoId,
    });

    await download.save();

    return res.status(200).download(
      videoFile.filepath,
      videoFile.filename
    );
  } catch (error) {
    console.error("Download error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};
export const getUserDownloads = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    const downloads = await Download.find({ user: userId })
      .populate("video")
      .sort({ downloadedAt: -1 });

    return res.status(200).json(downloads);
  } catch (error) {
    console.error("Get downloads error:", error);

    return res.status(500).json({
      message: "Unable to fetch downloads",
    });
  }
};