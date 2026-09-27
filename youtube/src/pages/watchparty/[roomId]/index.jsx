import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { io } from "socket.io-client";
import axiosInstance from "@/lib/axiosinstance";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  PhoneOff,
  Send,
  Users,
  Copy,
  Play,
} from "lucide-react";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:5000";

export default function WatchPartyRoom() {
  const router = useRouter();
  const { roomId } = router.query;

  const socketRef = useRef(null);
  const videoRef = useRef(null);
  const localVideoRef = useRef(null);
  const messagesEndRef = useRef(null);

  const peerConnections = useRef({});
  const localStreamRef = useRef(null);
  const pendingCandidates = useRef({});

  const [connected, setConnected] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [hostVerified, setHostVerified] = useState(false);
  

  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const currentParticipantIsHost =
  isHost ||
  participants.some(
    (participant) =>
      participant.socketId === socketRef.current?.id &&
      participant.isHost
  );

  const [message, setMessage] = useState("");

  const [isMuted, setIsMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] =
    useState(false);
  const [inCall, setInCall] = useState(false);

  const [remoteStreams, setRemoteStreams] = useState({});

  const [videoUrl, setVideoUrl] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [uploadedVideos, setUploadedVideos] = useState([]);
   const [showVideoSelector, setShowVideoSelector] = useState(false);
  
  const [availableVideos, setAvailableVideos] = useState([]);
  const [loadingVideos, setLoadingVideos] = useState(false);

  // =====================================================
// FETCH UPLOADED VIDEOS
// =====================================================

useEffect(() => {
  const fetchUploadedVideos = async () => {
    try {
      const response = await axiosInstance.get("/video/getall");
      setUploadedVideos(response.data || []);
    } catch (error) {
      console.error(
        "Unable to fetch uploaded videos:",
        error
      );
    }
  };

  fetchUploadedVideos();
}, []);

  // =====================================================
  // SOCKET CONNECTION
  // =====================================================

  useEffect(() => {
    if (!router.isReady || !roomId) return;

    const socket = io(BACKEND_URL, {
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
  console.log("Socket connected:", socket.id);

  setConnected(true);

  const hostKey = sessionStorage.getItem(
    `watchparty-host-${roomId}`
  );

  const host = hostKey === "true";

  setHostVerified(host);

  socket.emit("join-room", {
    roomId: String(roomId),
    name: host ? "Host" : "Guest",
    isHost: host,
  });
});

    socket.on("disconnect", () => {
      console.log("Socket disconnected");

      setConnected(false);
    });


    // ===================================================
    // ROOM JOINED
    // ===================================================

    socket.on("room-joined", (data) => {
      console.log("Room joined:", data);

      if (Array.isArray(data?.participants)) {
        setParticipants(data.participants);

        const me = data.participants.find(
          (participant) =>
            participant.socketId === socket.id
        );

        if (me) {
          setIsHost(Boolean(me.isHost));
        }
      }

      if (data?.video) {
        setVideoUrl(data.video.url || "");
        setVideoTitle(data.video.title || "");

        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.currentTime =
              data.video.currentTime || 0;

            if (data.video.playing) {
              videoRef.current
                .play()
                .catch(() => {});
            }
          }
        }, 100);
      }

      if (Array.isArray(data?.chat)) {
        setMessages(data.chat);
      }
    });

    // ===================================================
    // ROOM NOT FOUND
    // ===================================================

    socket.on("room-not-found", () => {
      alert("Watch party room not found.");

      router.push("/watchparty");
    });

    // ===================================================
    // ROOM ERROR
    // ===================================================

    socket.on("room-error", (data) => {
      alert(
        data?.message ||
          "Watch party error."
      );
    });

    // ===================================================
    // PARTICIPANTS
    // ===================================================

    socket.on("participants", (data) => {
      if (!Array.isArray(data)) return;

      setParticipants(data);

      const me = data.find(
        (participant) =>
          participant.socketId === socket.id
      );

      if (me) {
        setIsHost(Boolean(me.isHost));
      }
    });

    // ===================================================
    // USER JOINED
    // ===================================================

    socket.on("user-joined", (participant) => {
      setParticipants((previous) => {
        const exists = previous.some(
          (item) =>
            item.socketId === participant.socketId
        );

        if (exists) return previous;

        return [...previous, participant];
      });
    });

    // ===================================================
    // USER LEFT
    // ===================================================

    socket.on("user-left", (socketId) => {
      setParticipants((previous) =>
        previous.filter(
          (participant) =>
            participant.socketId !== socketId
        )
      );

      if (peerConnections.current[socketId]) {
        peerConnections.current[socketId].close();

        delete peerConnections.current[
          socketId
        ];
      }

      setRemoteStreams((previous) => {
        const updated = { ...previous };

        delete updated[socketId];

        return updated;
      });
    });

    // ===================================================
    // CHAT
    // ===================================================

    socket.on("chat-message", (chatMessage) => {
      setMessages((previous) => [
        ...previous,
        chatMessage,
      ]);
    });

    // ===================================================
    // VIDEO CONTROL
    // ===================================================

    socket.on("video-control", (data) => {
      const video = videoRef.current;

      if (!video || !data) return;

      if (
        typeof data.currentTime === "number" &&
        Math.abs(
          video.currentTime -
            data.currentTime
        ) > 0.5
      ) {
        video.currentTime =
          data.currentTime;
      }

      if (data.action === "play") {
        video
          .play()
          .catch(() => {});
      }

      if (data.action === "pause") {
        video.pause();
      }
    });

    // ===================================================
    // VIDEO CHANGED
    // ===================================================

    socket.on("video-changed", (data) => {
      if (!data) return;

      setVideoUrl(data.url || "");
      setVideoTitle(data.title || "");

      if (videoRef.current) {
        videoRef.current.currentTime = 0;
      }
    });

    // ===================================================
    // WEBRTC OFFER
    // ===================================================

    socket.on(
      "webrtc-offer",
      async ({ from, offer }) => {
        try {
          const peer =
            createPeerConnection(from);

          await peer.setRemoteDescription(
            new RTCSessionDescription(
              offer
            )
          );

          await addPendingCandidates(from);

          const answer =
            await peer.createAnswer();

          await peer.setLocalDescription(
            answer
          );

          socket.emit("webrtc-answer", {
            to: from,
            answer,
          });
        } catch (error) {
          console.error(
            "WebRTC offer error:",
            error
          );
        }
      }
    );

    // ===================================================
    // WEBRTC ANSWER
    // ===================================================

    socket.on(
      "webrtc-answer",
      async ({ from, answer }) => {
        try {
          const peer =
            peerConnections.current[from];

          if (!peer) return;

          await peer.setRemoteDescription(
            new RTCSessionDescription(
              answer
            )
          );

          await addPendingCandidates(from);
        } catch (error) {
          console.error(
            "WebRTC answer error:",
            error
          );
        }
      }
    );

    // ===================================================
    // WEBRTC ICE
    // ===================================================

    socket.on(
      "webrtc-ice-candidate",
      async ({ from, candidate }) => {
        if (!candidate) return;

        const peer =
          peerConnections.current[from];

        if (
          !peer ||
          !peer.remoteDescription
        ) {
          if (!pendingCandidates.current[from]) {
            pendingCandidates.current[from] = [];
          }

          pendingCandidates.current[
            from
          ].push(candidate);

          return;
        }

        try {
          await peer.addIceCandidate(
            new RTCIceCandidate(candidate)
          );
        } catch (error) {
          console.error(
            "ICE candidate error:",
            error
          );
        }
      }
    );

    return () => {
      Object.values(
        peerConnections.current
      ).forEach((peer) => {
        peer.close();
      });

      peerConnections.current = {};
      pendingCandidates.current = {};

      stopLocalStream();

      socket.disconnect();
      socketRef.current = null;
    };
  }, [router.isReady, roomId]);
  // =====================================================
  // ADD PENDING ICE CANDIDATES
  // =====================================================

  const addPendingCandidates = async (remoteSocketId) => {
    const peer =
      peerConnections.current[remoteSocketId];

    if (!peer) return;

    const candidates =
      pendingCandidates.current[
        remoteSocketId
      ] || [];

    for (const candidate of candidates) {
      try {
        await peer.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
      } catch (error) {
        console.error(
          "Pending ICE error:",
          error
        );
      }
    }

    delete pendingCandidates.current[
      remoteSocketId
    ];
  };

  // =====================================================
  // CREATE WEBRTC PEER
  // =====================================================

  const createPeerConnection = (
    remoteSocketId
  ) => {
    if (
      peerConnections.current[
        remoteSocketId
      ]
    ) {
      return peerConnections.current[
        remoteSocketId
      ];
    }

    const socket = socketRef.current;

    const peer =
      new RTCPeerConnection({
        iceServers: [
          {
            urls:
              "stun:stun.l.google.com:19302",
          },
        ],
      });

    peerConnections.current[
      remoteSocketId
    ] = peer;

    // Add local camera and microphone
    if (localStreamRef.current) {
      localStreamRef.current
        .getTracks()
        .forEach((track) => {
          peer.addTrack(
            track,
            localStreamRef.current
          );
        });
    }

    // Receive remote stream
    peer.ontrack = (event) => {
      const stream =
        event.streams[0];

      if (!stream) return;

      setRemoteStreams(
        (previous) => ({
          ...previous,
          [remoteSocketId]:
            stream,
        })
      );
    };

    // Send ICE candidates
    peer.onicecandidate = (
      event
    ) => {
      if (!event.candidate) return;

      if (!socket) return;

      socket.emit(
        "webrtc-ice-candidate",
        {
          to: remoteSocketId,
          candidate:
            event.candidate,
        }
      );
    };

    peer.onconnectionstatechange =
      () => {
        if (
          peer.connectionState ===
            "failed" ||
          peer.connectionState ===
            "closed"
        ) {
          peer.close();

          delete peerConnections
            .current[
              remoteSocketId
            ];

          setRemoteStreams(
            (previous) => {
              const updated = {
                ...previous,
              };

              delete updated[
                remoteSocketId
              ];

              return updated;
            }
          );
        }
      };

    return peer;
  };

  // =====================================================
  // START VIDEO CALL
  // =====================================================

  const startCall = async () => {
    try {
      if (!socketRef.current) {
        alert(
          "Not connected to the server."
        );
        return;
      }

      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            video: true,
            audio: true,
          }
        );

      localStreamRef.current = stream;

      setInCall(true);
      setCameraOn(true);
      setIsMuted(false);

      const socket =
        socketRef.current;

      // Create connection with everyone
      for (const participant of participants) {
        if (
          participant.socketId ===
          socket.id
        ) {
          continue;
        }

        const peer =
          createPeerConnection(
            participant.socketId
          );

        const offer =
          await peer.createOffer();

        await peer.setLocalDescription(
          offer
        );

        socket.emit(
          "webrtc-offer",
          {
            to: participant.socketId,
            offer,
          }
        );
      }
    } catch (error) {
      console.error(
        "Unable to start call:",
        error
      );

      alert(
        "Please allow camera and microphone permission."
      );
    }
  };

  useEffect(() => {
  if (
    inCall &&
    localVideoRef.current &&
    localStreamRef.current
  ) {
    localVideoRef.current.srcObject =
      localStreamRef.current;
  }
}, [inCall]);

  // =====================================================
  // STOP LOCAL STREAM
  // =====================================================

  const stopLocalStream = () => {
    if (localStreamRef.current) {
      localStreamRef.current
        .getTracks()
        .forEach((track) => {
          track.stop();
        });

      localStreamRef.current =
        null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject =
        null;
    }
  };

  // =====================================================
  // LEAVE VIDEO CALL
  // =====================================================

  const leaveCall = () => {
    stopLocalStream();

    Object.values(
      peerConnections.current
    ).forEach((peer) => {
      peer.close();
    });

    peerConnections.current = {};

    pendingCandidates.current = {};

    setRemoteStreams({});
    setInCall(false);
    setCameraOn(false);
    setIsMuted(false);
    setIsScreenSharing(false);

    if (socketRef.current) {
      socketRef.current.emit(
        "leave-call",
        {
          roomId: String(roomId),
        }
      );
    }
  };

  // =====================================================
  // TOGGLE MICROPHONE
  // =====================================================

  const toggleMute = () => {
    if (!localStreamRef.current)
      return;

    const audioTracks =
      localStreamRef.current.getAudioTracks();

    audioTracks.forEach(
      (track) => {
        track.enabled =
          !track.enabled;
      }
    );

    setIsMuted(
      (previous) => !previous
    );
  };

  // =====================================================
  // TOGGLE CAMERA
  // =====================================================

  const toggleCamera = () => {
    if (!localStreamRef.current)
      return;

    const videoTracks =
      localStreamRef.current.getVideoTracks();

    videoTracks.forEach(
      (track) => {
        track.enabled =
          !track.enabled;
      }
    );

    setCameraOn(
      (previous) => !previous
    );
  };

  // =====================================================
  // SCREEN SHARE
  // =====================================================

  const toggleScreenShare =
    async () => {
      if (!inCall) {
        alert(
          "Join the video call first."
        );
        return;
      }

      try {
        if (!isScreenSharing) {
          const screenStream =
            await navigator.mediaDevices.getDisplayMedia(
              {
                video: true,
              }
            );

          const screenTrack =
            screenStream.getVideoTracks()[0];

          Object.values(
            peerConnections.current
          ).forEach((peer) => {
            const sender =
              peer
                .getSenders()
                .find(
                  (item) =>
                    item.track &&
                    item.track.kind ===
                      "video"
                );

            if (sender) {
              sender.replaceTrack(
                screenTrack
              );
            }
          });

          if (
            localVideoRef.current
          ) {
            localVideoRef.current.srcObject =
              screenStream;
          }

          screenTrack.onended =
            () => {
              stopScreenShare();
            };

          setIsScreenSharing(
            true
          );
        } else {
          stopScreenShare();
        }
      } catch (error) {
        console.error(
          "Screen sharing error:",
          error
        );
      }
    };

  // =====================================================
  // STOP SCREEN SHARE
  // =====================================================

  const stopScreenShare = () => {
    if (!localStreamRef.current)
      return;

    const cameraTrack =
      localStreamRef.current.getVideoTracks()[0];

    if (!cameraTrack) return;

    Object.values(
      peerConnections.current
    ).forEach((peer) => {
      const sender =
        peer
          .getSenders()
          .find(
            (item) =>
              item.track &&
              item.track.kind ===
                "video"
          );

      if (sender) {
        sender.replaceTrack(
          cameraTrack
        );
      }
    });

    if (localVideoRef.current) {
      localVideoRef.current.srcObject =
        localStreamRef.current;
    }

    setIsScreenSharing(
      false
    );
  };
  // =====================================================
  // SEND CHAT MESSAGE
  // =====================================================

  const sendMessage = (event) => {
    event.preventDefault();

    const text = message.trim();

    if (!text) return;

    if (!socketRef.current) return;

    socketRef.current.emit(
      "chat-message",
      {
        roomId: String(roomId),
        message: text,
      }
    );

    setMessage("");
  };

  // =====================================================
  // AUTO SCROLL CHAT
  // =====================================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  // =====================================================
  // VIDEO PLAY
  // =====================================================

  const handlePlay = () => {
    if (
      !videoRef.current ||
      !socketRef.current
    ) {
      return;
    }

    socketRef.current.emit(
      "video-control",
      {
        roomId: String(roomId),
        action: "play",
        currentTime:
          videoRef.current.currentTime,
      }
    );
  };

  // =====================================================
  // VIDEO PAUSE
  // =====================================================

  const handlePause = () => {
    if (
      !videoRef.current ||
      !socketRef.current
    ) {
      return;
    }

    socketRef.current.emit(
      "video-control",
      {
        roomId: String(roomId),
        action: "pause",
        currentTime:
          videoRef.current.currentTime,
      }
    );
  };

  // =====================================================
  // VIDEO SEEK
  // =====================================================

  const handleSeek = () => {
    if (
      !videoRef.current ||
      !socketRef.current
    ) {
      return;
    }

    socketRef.current.emit(
      "video-control",
      {
        roomId: String(roomId),
        action: "seek",
        currentTime:
          videoRef.current.currentTime,
      }
    );
  };

  // =====================================================
  // COPY ROOM ID
  // =====================================================

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(
        String(roomId)
      );

      alert("Room ID copied!");
    } catch (error) {
      console.error(
        "Copy room ID error:",
        error
      );
    }
  };

  // =====================================================
  // GO BACK TO WATCH PARTY HOME
  // =====================================================

  const goBack = () => {
    leaveCall();

    router.push("/watchparty");
  };
  const openVideoSelector = async () => {
  try {
    setLoadingVideos(true);

    const response = await axiosInstance.get("/video/getall");

    setAvailableVideos(response.data || []);
    setShowVideoSelector(true);
  } catch (error) {
    console.error("Error loading videos:", error);
    alert("Unable to load your uploaded videos.");
  } finally {
    setLoadingVideos(false);
  }
};
const selectVideo = (video) => {
  if (!socketRef.current) {
    alert("Not connected to the server.");
    return;
  }

  const selectedVideoUrl =
    `${BACKEND_URL}/${video.filepath}`;

  socketRef.current.emit("set-video", {
    roomId: String(roomId),
    url: selectedVideoUrl,
    title: video.videotitle || "Untitled Video",
  });

  setVideoUrl(selectedVideoUrl);
  setVideoTitle(video.videotitle || "Untitled Video");

  setShowVideoSelector(false);
};
  // =====================================================
  // RENDER
  // =====================================================

  if (!router.isReady || !roomId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-600">
          Loading watch party...
        </p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

            <div>
              <h1 className="text-2xl font-bold">
                Watch Party
              </h1>

              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm text-gray-500">
                  Room:
                </span>

                <span className="font-mono font-semibold">
                  {roomId}
                </span>

                <button
                  type="button"
                  onClick={copyRoomId}
                  className="p-1 rounded hover:bg-gray-100"
                  title="Copy Room ID"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">

              <span
                className={`text-sm ${
                  connected
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {connected
                  ? "● Connected"
                  : "● Disconnected"}
              </span>

              {isHost && (
                <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                  Host
                </span>
              )}

            </div>

          </div>
        </div>

        {/* =================================================
            MAIN LAYOUT
        ================================================= */}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* =================================================
              LEFT SIDE
          ================================================= */}

          <div className="lg:col-span-2 space-y-4">

            {/* VIDEO */}

            <div className="bg-black rounded-xl overflow-hidden shadow-sm">

              {videoUrl ? (
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls
                  playsInline
                  className="w-full aspect-video"
                  onPlay={handlePlay}
                  onPause={handlePause}
                  onSeeked={handleSeek}
                />
              ) : (
                <div className="aspect-video flex items-center justify-center text-white">
                  <div className="text-center">

                    <Play className="w-12 h-12 mx-auto mb-3 opacity-50" />

                    <p className="text-lg">
                      No video selected
                    </p>

                    <p className="text-sm text-gray-400 mt-1">
                      The host can select a video.
                    </p>                                       
                  </div>
                </div>
              )}
           </div>
           {isHost && !videoUrl && (
  <div className="bg-white rounded-xl shadow-sm p-4">
    <button
      type="button"
      onClick={openVideoSelector}
      disabled={loadingVideos}
      className="w-full px-4 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
    >
      {loadingVideos
        ? "Loading Videos..."
        : "Select Video"}
    </button>
  </div>
)}

            {/* VIDEO TITLE */}

            {videoTitle && (
              <div className="bg-white rounded-xl shadow-sm p-4">
                <h2 className="text-lg font-semibold">
                  {videoTitle}
                </h2>
              </div>
            )}

            
            {/* =================================================
                CALL CONTROLS
            ================================================= */}
              <div className="bg-white rounded-xl shadow-sm p-4">

              <div className="flex flex-wrap items-center gap-3">

               {/* SELECT VIDEO - HOST ONLY */}

               {hostVerified && !videoUrl && (
              <button
              type="button"
              onClick={() =>
              setShowVideoSelector(
             (previous) => !previous
              )
              }
             disabled={loadingVideos}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
             >
            {loadingVideos
             ? "Loading Videos..."
              : "Select Video"}
            </button>
            )}
            {hostVerified && showVideoSelector && (
  <div className="w-full mt-3 bg-gray-50 rounded-lg p-4">
    <h3 className="font-semibold mb-3">
      Select an uploaded video
    </h3>

    {uploadedVideos.length === 0 ? (
      <p className="text-gray-500">
        No uploaded videos found.
      </p>
    ) : (
      <div className="space-y-2">
        {uploadedVideos.map((video) => (
          <button
            key={video._id}
            type="button"
            onClick={() => {
              const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/${video.filepath}`;

              setVideoUrl(url);
              setVideoTitle(video.videotitle);
              setShowVideoSelector(false);
            }}
            className="w-full text-left p-3 bg-white rounded-lg border hover:bg-gray-100"
          >
            <p className="font-medium">
              {video.videotitle}
            </p>

            <p className="text-sm text-gray-500">
              {video.filename}
            </p>
          </button>
        ))}
      </div>
    )}
  </div>
)}

           {!inCall ? (
      <button
        type="button"
        onClick={startCall}
        className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
      >
        <Video className="inline w-5 h-5 mr-2" />
        Join Video Call
      </button>
    ) : (
      <>
                    {/* MICROPHONE */}

                    <button
                      type="button"
                      onClick={toggleMute}
                      className={`p-3 rounded-full ${
                        isMuted
                          ? "bg-red-100 text-red-600"
                          : "bg-gray-100"
                      } hover:bg-gray-200`}
                      title={
                        isMuted
                          ? "Turn microphone on"
                          : "Mute microphone"
                      }
                    >
                      {isMuted ? (
                        <MicOff className="w-5 h-5" />
                      ) : (
                        <Mic className="w-5 h-5" />
                      )}
                    </button>

                    {/* CAMERA */}

                    <button
                      type="button"
                      onClick={toggleCamera}
                      className={`p-3 rounded-full ${
                        !cameraOn
                          ? "bg-red-100 text-red-600"
                          : "bg-gray-100"
                      } hover:bg-gray-200`}
                      title={
                        cameraOn
                          ? "Turn camera off"
                          : "Turn camera on"
                      }
                    >
                      {cameraOn ? (
                        <Video className="w-5 h-5" />
                      ) : (
                        <VideoOff className="w-5 h-5" />
                      )}
                    </button>

                    {/* SCREEN SHARE */}

                    <button
                      type="button"
                      onClick={toggleScreenShare}
                      className={`p-3 rounded-full ${
                        isScreenSharing
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100"
                      } hover:bg-gray-200`}
                      title="Share screen"
                    >
                      <MonitorUp className="w-5 h-5" />
                    </button>

                    {/* LEAVE CALL */}

                    <button
                      type="button"
                      onClick={leaveCall}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
                    >
                      <PhoneOff className="inline w-5 h-5 mr-2" />
                      Leave Call
                    </button>
                  </>
                )}

              </div>
            </div>

            {/* =================================================
                LOCAL VIDEO
            ================================================= */}

            {inCall && (
              <div className="bg-white rounded-xl shadow-sm p-4">

                <h3 className="font-semibold mb-3">
                  Your Camera
                </h3>

                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full max-w-sm aspect-video bg-black rounded-lg object-cover"
                />

              </div>
            )}

            {/* =================================================
                REMOTE VIDEOS
            ================================================= */}

            {Object.keys(remoteStreams).length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-4">

                <h3 className="font-semibold mb-3">
                  Other Participants
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                  {Object.entries(
                    remoteStreams
                  ).map(
                    ([socketId, stream]) => (
                      <RemoteVideo
                        key={socketId}
                        stream={stream}
                      />
                    )
                  )}

                </div>

              </div>
            )}

          </div>

          {/* =================================================
              RIGHT SIDE
          ================================================= */}

          <div className="space-y-4">

            {/* =================================================
                PARTICIPANTS
            ================================================= */}

            <div className="bg-white rounded-xl shadow-sm p-4">

              <div className="flex items-center gap-2 mb-4">

                <Users className="w-5 h-5" />

                <h2 className="font-semibold">
                  Participants
                </h2>

                <span className="text-sm text-gray-500">
                  ({participants.length})
                </span>

              </div>

              <div className="space-y-2">

                {participants.map(
                  (participant) => (
                    <div
                      key={
                        participant.socketId
                      }
                      className="flex items-center justify-between p-2 rounded-lg bg-gray-50"
                    >

                      <div className="flex items-center gap-2">

                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-semibold">
                          {(
                            participant.name ||
                            "G"
                          )
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <span className="text-sm font-medium">
                          {participant.name ||
                            "Guest"}
                        </span>

                      </div>

                      {participant.isHost && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                          Host
                        </span>
                      )}

                    </div>
                  )
                )}

                {participants.length === 0 && (
                  <p className="text-sm text-gray-500">
                    No participants yet.
                  </p>
                )}

              </div>

            </div>

            {/* =================================================
                CHAT
            ================================================= */}

            <div className="bg-white rounded-xl shadow-sm p-4">

              <h2 className="font-semibold mb-3">
                Chat
              </h2>

              <div className="h-80 overflow-y-auto border rounded-lg p-3 space-y-3">

                {messages.length === 0 && (
                  <p className="text-sm text-gray-500 text-center mt-10">
                    No messages yet.
                  </p>
                )}

                {messages.map(
                  (chatMessage) => (
                    <div
                      key={
                        chatMessage.id
                      }
                      className="text-sm"
                    >

                      <p className="font-semibold">
                        {chatMessage.name ||
                          "Guest"}
                      </p>

                      <p className="text-gray-700 break-words">
                        {chatMessage.message}
                      </p>

                    </div>
                  )
                )}

                <div
                  ref={messagesEndRef}
                />

              </div>

              <form
                onSubmit={sendMessage}
                className="flex gap-2 mt-3"
              >

                <input
                  value={message}
                  onChange={(event) =>
                    setMessage(
                      event.target.value
                    )
                  }
                  placeholder="Type a message..."
                  className="flex-1 border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-red-500"
                />

                <button
                  type="submit"
                  className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <Send className="w-5 h-5" />
                </button>

              </form>

            </div>

            {/* =================================================
                ROOM ACTIONS
            ================================================= */}

            <button
              type="button"
              onClick={goBack}
              className="w-full border border-gray-300 bg-white rounded-lg py-3 font-medium hover:bg-gray-50"
            >
              Back to Watch Party
            </button>

          </div>

        </div>

      </div>
    </main>
  );
}

// =========================================================
// REMOTE VIDEO COMPONENT
// =========================================================

function RemoteVideo({ stream }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject =
        stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      className="w-full aspect-video bg-black rounded-lg object-cover"
    />
  );
}