const rooms = new Map();

export const generateRoomId = () => {
  let roomId;

  do {
    roomId = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();
  } while (rooms.has(roomId));

  return roomId;
};

export const createRoom = () => {
  const roomId = generateRoomId();

  const room = {
    roomId,
    participants: [],
    video: {
      url: "",
      title: "",
      currentTime: 0,
      playing: false,
    },
    chat: [],
    createdAt: new Date(),
  };

  rooms.set(roomId, room);

  return room;
};

export const getRoom = (roomId) => {
  if (!roomId) return null;

  return rooms.get(
    String(roomId).trim().toUpperCase()
  );
};

export const deleteRoom = (roomId) => {
  if (!roomId) return;

  rooms.delete(
    String(roomId).trim().toUpperCase()
  );
};

export { rooms };