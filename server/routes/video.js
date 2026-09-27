import express from "express";
import {
  getallvideo,
  uploadvideo,
  downloadVideo,
  getUserDownloads,
} from "../controllers/video.js";
import upload from "../filehelper/filehelper.js";

const routes = express.Router();

routes.post("/upload", upload.single("file"), uploadvideo);
routes.get("/getall", getallvideo);
routes.post("/download", downloadVideo);
routes.get("/downloads/:userId", getUserDownloads);
export default routes;
