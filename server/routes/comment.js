import express from "express";

import {
  deletecomment,
  getallcomment,
  postcomment,
  editcomment,
  likeComment,
  dislikeComment,
  reportComment,
  translateComment,
} from "../controllers/comment.js";

const routes = express.Router();

routes.get("/:videoid", getallcomment);
routes.post("/postcomment", postcomment);
routes.delete("/deletecomment/:id", deletecomment);
routes.post("/editcomment/:id", editcomment);

routes.post("/like/:id", likeComment);
routes.post("/dislike/:id", dislikeComment);
routes.post("/report/:id", reportComment);
routes.post("/translate/:id", translateComment);

export default routes;