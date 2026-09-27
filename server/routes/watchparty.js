import express from "express";

import {
  createWatchParty,
  joinRoom,
  getWatchPartyRoom,
  removeRoom,
} from "../controllers/watchparty.js";

const router = express.Router();

// Create a watch party
router.post("/create", createWatchParty);

// Join / get a watch party
router.post("/join", joinRoom);

// Get a watch party by room ID
router.get("/:roomId", getWatchPartyRoom);

// Delete a watch party
router.delete("/:roomId", removeRoom);

export default router;