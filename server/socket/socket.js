import {
  createRoom,
  getRoom,
  deleteRoom,
} from "./roomStore.js";

const normalizeRoomId = (roomId) => {
  return String(roomId || "")
    .trim()
    .toUpperCase();
};

const participantsArray = (room) => {
  if (!room || !room.participants) {
    return [];
  }

  if (room.participants instanceof Map) {
    return Array.from(room.participants.values());
  }

  if (Array.isArray(room.participants)) {
    return room.participants;
  }

  return [];
};

const socketHandler = (io) => {
  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

  // =====================================================
// CREATE WATCH PARTY
// =====================================================

socket.on(
  "create-room",
  ({ name = "Host" } = {}) => {
    console.log(
      "CREATE-ROOM EVENT RECEIVED:",
      socket.id,
      name
    );

    try {
      const room = createRoom();

      console.log(
        "ROOM CREATED:",
        room.roomId
      );

      const participant = {
        socketId: socket.id,
        name: name || "Host",
        isHost: true,
      };

      room.participants.push(participant);

      socket.join(room.roomId);

      socket.data.roomId = room.roomId;
      socket.data.name = participant.name;
      socket.data.isHost = true;

      socket.emit(
        "room-created",
        room.roomId
      );

      socket.emit(
        "room-joined",
        {
          roomId: room.roomId,
          participants: room.participants,
          video: room.video,
          chat: room.chat,
        }
      );

      console.log(
        `Watch Party created successfully: ${room.roomId}`
      );

    } catch (error) {
      console.error(
        "CREATE ROOM ACTUAL ERROR:",
        error
      );

      console.error(
        "CREATE ROOM STACK:",
        error?.stack
      );

      socket.emit(
        "room-error",
        {
          message:
            error?.message ||
            "Unable to create watch party.",
        }
      );
    }
  }
); 

    // =====================================================
    // JOIN WATCH PARTY
    // =====================================================

    socket.on(
      "join-room",
      ({ roomId, name = "Guest" } = {}) => {
        try {
          const id = normalizeRoomId(roomId);

          if (!id) {
            socket.emit("room-not-found");
            return;
          }

          const room = getRoom(id);

          if (!room) {
            socket.emit("room-not-found");
            return;
          }

          if (!room.chat) {
            room.chat = [];
          }

          if (!room.video) {
            room.video = {
              url: "",
              title: "",
              currentTime: 0,
              playing: false,
            };
          }

          const participant = {
            socketId: socket.id,
            name: name || "Guest",
            isHost: false,
          };

          // Add participant
          if (room.participants instanceof Map) {
            room.participants.set(
              socket.id,
              participant
            );
          } else {
            room.participants =
              room.participants.filter(
                (item) =>
                  item.socketId !== socket.id
              );

            room.participants.push(participant);
          }

          socket.join(id);

          socket.data.roomId = id;
          socket.data.name = participant.name;
          socket.data.isHost = false;

          const participants =
            participantsArray(room);

          socket.emit(
            "room-joined",
            {
              roomId: id,
              participants,
              video: room.video,
              chat: room.chat,
            }
          );

          socket.to(id).emit(
            "participants",
            participants
          );

          socket.to(id).emit(
            "user-joined",
            participant
          );

          console.log(
            `${participant.name} joined Watch Party ${id}`
          );
        } catch (error) {
          console.error(
            "Join room error:",
            error
          );

          socket.emit("room-error", {
            message:
              "Unable to join watch party.",
          });
        }
      }
    );

    // =====================================================
    // CHAT
    // =====================================================

    socket.on(
      "chat-message",
      ({ roomId, message } = {}) => {
        const id = normalizeRoomId(roomId);

        const room = getRoom(id);

        if (!room) return;

        if (!room.chat) {
          room.chat = [];
        }

        const text =
          String(message || "").trim();

        if (!text) return;

        const chatMessage = {
          id: `${socket.id}-${Date.now()}`,
          socketId: socket.id,
          name:
            socket.data.name || "Guest",
          message: text,
          createdAt:
            new Date().toISOString(),
        };

        room.chat.push(chatMessage);

        io.to(id).emit(
          "chat-message",
          chatMessage
        );
      }
    );

    // =====================================================
    // VIDEO PLAY / PAUSE / SEEK
    // =====================================================

    socket.on(
      "video-control",
      ({
        roomId,
        action,
        currentTime,
      } = {}) => {
        const id =
          normalizeRoomId(roomId);

        const room = getRoom(id);

        if (!room) return;

        if (!room.video) {
          room.video = {
            url: "",
            title: "",
            currentTime: 0,
            playing: false,
          };
        }

        if (
          typeof currentTime === "number" &&
          Number.isFinite(currentTime)
        ) {
          room.video.currentTime =
            currentTime;
        }

        if (action === "play") {
          room.video.playing = true;
        }

        if (action === "pause") {
          room.video.playing = false;
        }

        const videoState = {
          action,
          currentTime:
            room.video.currentTime,
          playing:
            room.video.playing,
        };

        // Main event
        socket.to(id).emit(
          "video-control",
          videoState
        );

        // Also send the event name
        // currently used by the room page.
        socket.to(id).emit(
          "video-state",
          videoState
        );
      }
    );

    // =====================================================
    // SET / CHANGE VIDEO
    // =====================================================

    socket.on(
      "set-video",
      ({
        roomId,
        url,
        title = "",
      } = {}) => {
        const id =
          normalizeRoomId(roomId);

        const room = getRoom(id);

        if (!room) return;

        room.video = {
          url: url || "",
          title: title || "",
          currentTime: 0,
          playing: false,
        };

        io.to(id).emit(
          "video-changed",
          room.video
        );
      }
    );

    // =====================================================
    // WEBRTC OFFER
    // =====================================================

    socket.on(
      "webrtc-offer",
      ({ to, offer } = {}) => {
        if (!to || !offer) return;

        io.to(to).emit(
          "webrtc-offer",
          {
            from: socket.id,
            offer,
          }
        );
      }
    );

    // =====================================================
    // WEBRTC ANSWER
    // =====================================================

    socket.on(
      "webrtc-answer",
      ({ to, answer } = {}) => {
        if (!to || !answer) return;

        io.to(to).emit(
          "webrtc-answer",
          {
            from: socket.id,
            answer,
          }
        );
      }
    );

    // =====================================================
    // WEBRTC ICE CANDIDATE
    // =====================================================

    socket.on(
      "webrtc-ice-candidate",
      ({ to, candidate } = {}) => {
        if (!to || !candidate) return;

        io.to(to).emit(
          "webrtc-ice-candidate",
          {
            from: socket.id,
            candidate,
          }
        );
      }
    );

    // =====================================================
    // LEAVE VIDEO CALL
    // =====================================================

    socket.on(
      "leave-call",
      ({ roomId } = {}) => {
        const id = normalizeRoomId(
          roomId || socket.data.roomId
        );

        if (!id) return;

        socket.to(id).emit(
          "call-user-left",
          socket.id
        );
      }
    );

    // =====================================================
    // DISCONNECT
    // =====================================================

    socket.on("disconnect", () => {
      console.log(
        "Socket disconnected:",
        socket.id
      );

      const roomId =
        socket.data.roomId;

      if (!roomId) {
        return;
      }

      const room =
        getRoom(roomId);

      if (!room) {
        return;
      }

      // Remove participant
      if (
        room.participants instanceof Map
      ) {
        room.participants.delete(
          socket.id
        );
      } else {
        room.participants =
          room.participants.filter(
            (participant) =>
              participant.socketId !==
              socket.id
          );
      }

      const participants =
        participantsArray(room);

      // Keep room alive even when empty.
      // This is important because the browser
      // disconnects the creation socket when
      // navigating to /ROOM_ID.
      if (participants.length === 0) {
        console.log(
          `Watch Party ${roomId} is empty but kept alive.`
        );

        return;
      }

      // Promote another participant
      // if the host left.
      const hasHost =
        participants.some(
          (participant) =>
            participant.isHost
        );

      if (!hasHost) {
        const newHost =
          participants[0];

        newHost.isHost = true;

        if (
          room.participants instanceof Map
        ) {
          room.participants.set(
            newHost.socketId,
            newHost
          );
        }

        console.log(
          `New host for ${roomId}: ${newHost.name}`
        );
      }

      const updatedParticipants =
        participantsArray(room);

      io.to(roomId).emit(
        "participants",
        updatedParticipants
      );

      io.to(roomId).emit(
        "user-left",
        socket.id
      );
    });
  });
};

export default socketHandler;