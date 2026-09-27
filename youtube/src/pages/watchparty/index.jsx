import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { io } from "socket.io-client";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:5000";

export default function WatchPartyHome() {
  const router = useRouter();

  const socketRef = useRef(null);

  const [roomId, setRoomId] = useState("");
  const [connected, setConnected] = useState(false);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  // =====================================================
  // SOCKET CONNECTION
  // =====================================================

  useEffect(() => {
    const socket = io(BACKEND_URL, {
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log(
        "Watch Party socket connected:",
        socket.id
      );

      setConnected(true);
    });

    socket.on("disconnect", () => {
      console.log(
        "Watch Party socket disconnected"
      );

      setConnected(false);
    });

    // ===================================================
    // ROOM CREATED
    // ===================================================

    socket.on("room-created", (createdRoomId) => {
  console.log(
    "Watch Party created:",
    createdRoomId
  );

  setCreating(false);

  sessionStorage.setItem(
    `watchparty-host-${createdRoomId}`,
    "true"
  );

  router.push(
    `/watchparty/${createdRoomId}`
  );
});


    // ===================================================
    // ROOM ERROR
    // ===================================================

    socket.on("room-error", (data) => {
      console.error(
        "Watch Party error:",
        data
      );

      alert(
        data?.message ||
          "Unable to create or join watch party."
      );

      setCreating(false);
      setJoining(false);
    });

    // ===================================================
    // ROOM NOT FOUND
    // ===================================================

    socket.on("room-not-found", () => {
      alert(
        "Watch party room not found. Please check the Room ID."
      );

      setJoining(false);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [router]);

  // =====================================================
  // CREATE WATCH PARTY
  // =====================================================

  const createParty = () => {
    const socket = socketRef.current;

    if (!socket || !socket.connected) {
      alert(
        "Connecting to server. Please try again."
      );

      return;
    }

    setCreating(true);

    socket.emit("create-room", {
      name: "Host",
    });
  };

  // =====================================================
  // JOIN WATCH PARTY
  // =====================================================

  const joinParty = () => {
    const id = roomId
      .trim()
      .toUpperCase();

    if (!id) {
      alert("Please enter a Room ID.");

      return;
    }

    const socket = socketRef.current;

    if (!socket || !socket.connected) {
      alert(
        "Connecting to server. Please try again."
      );

      return;
    }

    setJoining(true);

    /*
     * We navigate to the room page.
     *
     * The room page will establish the Socket.IO
     * connection and join the actual room.
     */

    router.push(
      `/watchparty/${id}`
    );
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg p-8">

        {/* HEADER */}

        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            Watch Party
          </h1>

          <p className="text-gray-600 mt-2">
            Watch videos together with friends
            in real time.
          </p>

          <div className="mt-3 flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                connected
                  ? "bg-green-500"
                  : "bg-red-500"
              }`}
            />

            <span className="text-sm text-gray-500">
              {connected
                ? "Connected"
                : "Connecting..."}
            </span>
          </div>
        </div>

        {/* CREATE */}

        <button
          type="button"
          onClick={createParty}
          disabled={
            creating ||
            !connected
          }
          className="w-full bg-red-600 text-white rounded-lg py-3 font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {creating
            ? "Creating Watch Party..."
            : "Create Watch Party"}
        </button>

        {/* DIVIDER */}

        <div className="flex items-center gap-3 my-6">
          <div className="h-px bg-gray-200 flex-1" />

          <span className="text-sm text-gray-500">
            OR
          </span>

          <div className="h-px bg-gray-200 flex-1" />
        </div>

        {/* ROOM ID */}

        <label
          htmlFor="roomId"
          className="block text-sm font-medium mb-2"
        >
          Room ID
        </label>

        <input
          id="roomId"
          type="text"
          value={roomId}
          onChange={(event) =>
            setRoomId(
              event.target.value
                .toUpperCase()
            )
          }
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              joinParty();
            }
          }}
          placeholder="Enter Room ID"
          maxLength={6}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-red-500"
        />

        {/* JOIN */}

        <button
          type="button"
          onClick={joinParty}
          disabled={
            joining ||
            !connected ||
            !roomId.trim()
          }
          className="w-full mt-3 border border-gray-300 rounded-lg py-3 font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {joining
            ? "Joining..."
            : "Join Watch Party"}
        </button>

      </div>
    </main>
  );
}