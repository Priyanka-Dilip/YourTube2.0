import {
  createRoom,
  getRoom,
  deleteRoom,
} from "../socket/roomStore.js";

// =====================================================
// CREATE WATCH PARTY ROOM
// =====================================================

export const createWatchParty = (req, res) => {
  try {
    const room = createRoom();

    return res.status(201).json({
      success: true,
      roomId: room.roomId,
      room,
    });
  } catch (error) {
    console.error(
      "Create watch party error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to create watch party",
    });
  }
};

// =====================================================
// JOIN / GET WATCH PARTY ROOM
// =====================================================

export const joinRoom = (req, res) => {
  try {
    const { roomId } = req.body;

    if (!roomId) {
      return res.status(400).json({
        success: false,
        message: "Room ID is required",
      });
    }

    const normalizedRoomId = String(roomId)
      .trim()
      .toUpperCase();

    const room = getRoom(normalizedRoomId);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Watch party room not found",
      });
    }

    return res.status(200).json({
      success: true,
      room,
    });
  } catch (error) {
    console.error(
      "Join watch party error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to join watch party",
    });
  }
};

// =====================================================
// GET ROOM
// =====================================================

export const getWatchPartyRoom = (req, res) => {
  try {
    const { roomId } = req.params;

    const room = getRoom(roomId);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Watch party room not found",
      });
    }

    return res.status(200).json({
      success: true,
      room,
    });
  } catch (error) {
    console.error(
      "Get watch party error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to get watch party",
    });
  }
};

// =====================================================
// DELETE ROOM
// =====================================================

export const removeRoom = (req, res) => {
  try {
    const { roomId } = req.params;

    const room = getRoom(roomId);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Watch party room not found",
      });
    }

    deleteRoom(roomId);

    return res.status(200).json({
      success: true,
      message: "Watch party deleted",
    });
  } catch (error) {
    console.error(
      "Delete watch party error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to delete watch party",
    });
  }
};