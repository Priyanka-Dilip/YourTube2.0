"use client";

import { useEffect, useRef, useState } from "react";

interface VideoPlayerProps {
  video: {
    _id: string;
    videotitle: string;
    filepath: string;
  };

  // These are optional, so your existing components will not break.
  onPrevious?: () => void;
  onNext?: () => void;
}

export default function VideoPlayer({
  video,
  onPrevious,
  onNext,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const [isSeeking, setIsSeeking] = useState(false);
  const [seekTime, setSeekTime] = useState(0);

  const [savedTime, setSavedTime] = useState(0);
  const [progressLoaded, setProgressLoaded] = useState(false);

  // Your existing backend video URL.
  const videoSource = `${process.env.NEXT_PUBLIC_BACKEND_URL}/${video?.filepath}`;
  /*
   * =========================================================
   * LOAD SAVED WATCH POSITION
   * =========================================================
   */
  useEffect(() => {
    if (!video?._id) return;

    const key = `video-progress-${video._id}`;
    const saved = localStorage.getItem(key);

    if (saved) {
      const value = Number(saved);

      if (Number.isFinite(value) && value > 0) {
        setSavedTime(value);
      }
    }

    setProgressLoaded(true);
  }, [video?._id]);

  /*
   * =========================================================
   * SAVE WATCH POSITION
   * =========================================================
   */
  useEffect(() => {
    if (!progressLoaded || !video?._id || duration <= 0) {
      return;
    }

    const key = `video-progress-${video._id}`;

    if (currentTime > 0 && currentTime < duration - 1) {
      localStorage.setItem(key, String(currentTime));
      setSavedTime(currentTime);
    }
  }, [currentTime, duration, progressLoaded, video?._id]);

  /*
   * =========================================================
   * VIDEO LOADED
   * =========================================================
   */
  const handleLoadedMetadata = () => {
    const player = videoRef.current;

    if (!player) return;

    setDuration(player.duration);
    setIsLoading(false);

    // Restore previous watched position.
    if (
      progressLoaded &&
      savedTime > 0 &&
      savedTime < player.duration - 2
    ) {
      player.currentTime = savedTime;
      setCurrentTime(savedTime);
    }
  };

  /*
   * =========================================================
   * PLAY / PAUSE
   * =========================================================
   */
  const togglePlay = async () => {
    const player = videoRef.current;

    if (!player) return;

    try {
      if (player.paused) {
        await player.play();
      } else {
        player.pause();
      }
    } catch (error) {
      console.error("Unable to play video:", error);
    }
  };

  /*
   * =========================================================
   * SHOW CONTROLS
   * =========================================================
   */
  const showPlayerControls = () => {
    setShowControls(true);

    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }

    if (isPlaying && !isSeeking) {
      hideTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  /*
   * =========================================================
   * VIDEO CLICK
   *
   * Clicking the video shows the controls.
   * It does NOT automatically pause the video.
   * =========================================================
   */
  const handleVideoClick = () => {
    const now = Date.now();

    // Double tap is handled separately.
    if (now - lastTapRef.current < 300) {
      lastTapRef.current = 0;
      return;
    }

    lastTapRef.current = now;

    setShowControls(true);

    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }

    if (isPlaying) {
      hideTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  /*
   * =========================================================
   * MOBILE DOUBLE TAP
   *
   * Left side  = -10 seconds
   * Right side = +10 seconds
   * =========================================================
   */
  const handleTouchEnd = (
    event: React.TouchEvent<HTMLDivElement>
  ) => {
    const now = Date.now();

    if (now - lastTapRef.current < 300) {
      const touch = event.changedTouches[0];
      const rect = event.currentTarget.getBoundingClientRect();

      const x = touch.clientX - rect.left;

      if (x < rect.width / 2) {
        skip(-10);
      } else {
        skip(10);
      }

      setShowControls(true);
      lastTapRef.current = 0;
      return;
    }

    lastTapRef.current = now;
  };

  /*
   * =========================================================
   * SKIP 10 SECONDS
   * =========================================================
   */
  const skip = (seconds: number) => {
    const player = videoRef.current;

    if (!player) return;

    const newTime = Math.min(
      Math.max(player.currentTime + seconds, 0),
      duration
    );

    player.currentTime = newTime;
    setCurrentTime(newTime);
  };

  /*
   * =========================================================
   * SEEKING
   * =========================================================
   */
  const startSeeking = () => {
    setIsSeeking(true);
    setSeekTime(currentTime);
    setShowControls(true);
  };

  const changeSeek = (value: number) => {
    setSeekTime(value);
  };

  const finishSeeking = () => {
    const player = videoRef.current;

    if (!player) return;

    player.currentTime = seekTime;
    setCurrentTime(seekTime);
    setIsSeeking(false);

    if (isPlaying) {
      setShowControls(true);

      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }

      hideTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  /*
   * =========================================================
   * FORMAT TIME
   * =========================================================
   */
  const formatTime = (time: number) => {
    if (!Number.isFinite(time)) {
      return "0:00";
    }

    const totalSeconds = Math.floor(time);

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(
        2,
        "0"
      )}:${String(seconds).padStart(2, "0")}`;
    }

    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  };
  /*
   * =========================================================
   * VOLUME
   * =========================================================
   */
  const changeVolume = (value: number) => {
    const player = videoRef.current;

    if (!player) return;

    player.volume = value;

    if (value === 0) {
      player.muted = true;
      setIsMuted(true);
    } else {
      player.muted = false;
      setIsMuted(false);
    }

    setVolume(value);
  };

  const toggleMute = () => {
    const player = videoRef.current;

    if (!player) return;

    if (player.muted) {
      player.muted = false;
      player.volume = volume || 1;
      setIsMuted(false);
    } else {
      player.muted = true;
      setIsMuted(true);
    }
  };

  /*
   * =========================================================
   * FULLSCREEN
   * =========================================================
   */
  const toggleFullscreen = async () => {
    const container = containerRef.current;

    if (!container) return;

    try {
      if (!document.fullscreenElement) {
        await container.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error("Fullscreen error:", error);
    }
  };

  /*
   * =========================================================
   * VIDEO EVENTS
   * =========================================================
   */
  const handleTimeUpdate = () => {
    const player = videoRef.current;

    if (!player || isSeeking) {
      return;
    }

    setCurrentTime(player.currentTime);
  };

  const handlePlay = () => {
    setIsPlaying(true);
    setIsLoading(false);
    showPlayerControls();
  };

  const handlePause = () => {
    setIsPlaying(false);
    setShowControls(true);

    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
  };

  const handleWaiting = () => {
    setIsLoading(true);
  };

  const handlePlaying = () => {
    setIsLoading(false);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setShowControls(true);

    if (video?._id) {
      localStorage.removeItem(`video-progress-${video._id}`);
    }

    setSavedTime(0);
  };

  /*
   * =========================================================
   * CLEANUP
   * =========================================================
   */
  useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  /*
   * =========================================================
   * PROGRESS CALCULATIONS
   * =========================================================
   */
  const safeDuration = duration > 0 ? duration : 1;

  const displayedTime = isSeeking
    ? seekTime
    : currentTime;

  const currentPercent = Math.min(
    Math.max((displayedTime / safeDuration) * 100, 0),
    100
  );

  const savedPercent = Math.min(
    Math.max((savedTime / safeDuration) * 100, 0),
    100
  );

  return (
    <div
      ref={containerRef}
      className="video-player relative aspect-video overflow-hidden rounded-lg bg-black select-none"
      onTouchEnd={handleTouchEnd}
    >
    {/* =====================================================
          VIDEO
          ===================================================== */}
      <video
        ref={videoRef}
        className="h-full w-full object-contain"
        poster="/placeholder.svg?height=480&width=854"
        playsInline
        preload="metadata"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlay}
        onPause={handlePause}
        onWaiting={handleWaiting}
        onPlaying={handlePlaying}
        onEnded={handleEnded}
        onClick={handleVideoClick}
      >
        <source
          src={videoSource}
          type="video/mp4"
        />

        Your browser does not support the video tag.
      </video>

      {/* =====================================================
          LOADING
          ===================================================== */}
      {isLoading && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
        </div>
      )}

      {/* =====================================================
          CENTER PLAY BUTTON
          ===================================================== */}
      {!isPlaying && !isLoading && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            togglePlay();
          }}
          className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white shadow-lg backdrop-blur-sm transition hover:scale-110 hover:bg-black/75"
          aria-label="Play video"
        >
          <span className="ml-1 text-3xl">
            ▶
          </span>
        </button>
      )}

      {/* =====================================================
          CUSTOM CONTROLS

          These disappear while the video is playing.
          Clicking/tapping the video shows them again.
          ===================================================== */}
      <div
        className={`absolute inset-x-0 bottom-0 transition-opacity duration-200 ${
          showControls || !isPlaying
            ? "opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      >
        {/* Bottom gradient */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

        <div className="relative px-3 pb-2">

          {/* =================================================
              THIN PROGRESS BAR
              ================================================= */}
          <div className="relative h-5 w-full">

            {/* Gray background */}
            <div className="absolute left-0 right-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-white/35" />

            {/* Previously watched portion */}
            {progressLoaded &&
              savedTime > 0 &&
              !isSeeking &&
              savedPercent > currentPercent && (
                <div
                  className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-red-500"
                  style={{
                    width: `${savedPercent}%`,
                  }}
                />
              )}

            {/* Normal white progress */}
            {!isSeeking && (
              <div
                className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-white"
                style={{
                  width: `${currentPercent}%`,
                }}
              />
            )}

            {/* Red progress ONLY while dragging */}
            {isSeeking && (
              <div
                className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-red-500"
                style={{
                  width: `${currentPercent}%`,
                }}
              />
            )}

            {/* Range input */}
            <input
              type="range"
              min="0"
              max={duration || 0}
              step="0.1"
              value={displayedTime}
              onMouseDown={startSeeking}
              onTouchStart={startSeeking}
              onChange={(event) =>
                changeSeek(Number(event.target.value))
              }
              onMouseUp={finishSeeking}
              onTouchEnd={finishSeeking}
              className={`video-progress ${
                isSeeking ? "is-seeking" : ""
              }`}
              aria-label="Video progress"
            />
          </div>

          {/* =================================================
              CONTROL BAR
              ================================================= */}
          <div className="flex items-center justify-between text-white">

            {/* LEFT SIDE */}
            <div className="flex items-center gap-1">

              {/* Previous video */}
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onPrevious?.();
                }}
                disabled={!onPrevious}
                className={`player-button ${
                  !onPrevious ? "opacity-40" : ""
                }`}
                title="Previous video"
                aria-label="Previous video"
              >
                |◀
              </button>

              {/* Rewind 10 seconds */}
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  skip(-10);
                }}
                className="player-button"
                title="Rewind 10 seconds"
                aria-label="Rewind 10 seconds"
              >
                  <span className="relative inline-flex items-center justify-center">
                  ↶
                  <span className="absolute text-[8px] font-bold">
                    
                  </span>
                </span>
              </button>

              {/* Play / Pause */}
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  togglePlay();
                }}
                className="player-button h-9 w-9 rounded-full bg-white/10"
                title={isPlaying ? "Pause" : "Play"}
                aria-label={
                  isPlaying ? "Pause" : "Play"
                }
              >
                {isPlaying ? "Ⅱ" : "▶"}
              </button>

              {/* Forward 10 seconds */}
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  skip(10);
                }}
                className="player-button"
                title="Forward 10 seconds"
                aria-label="Forward 10 seconds"
              >
              <span className="relative inline-flex items-center justify-center">
                  ↷
                  <span className="absolute text-[8px] font-bold">
                    
                  </span>
                </span>
              </button>

              {/* Next video */}
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onNext?.();
                }}
                disabled={!onNext}
                className={`player-button ${
                  !onNext ? "opacity-40" : ""
                }`}
                title="Next video"
                aria-label="Next video"
              >
                ▶|
              </button>

              {/* Volume */}
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  toggleMute();
                }}
                className="player-button"
                title={isMuted ? "Unmute" : "Mute"}
                aria-label={
                  isMuted ? "Unmute" : "Mute"
                }
              >
                {isMuted ? "🔇" : "🔊"}
              </button>

              {/* Volume slider */}
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(event) =>
                  changeVolume(
                    Number(event.target.value)
                  )
                }
                className="volume-control hidden sm:block"
                aria-label="Volume"
              />

              {/* Current time / duration */}
              <span className="ml-1 whitespace-nowrap text-xs">
                {formatTime(displayedTime)} /{" "}
                {formatTime(duration)}
              </span>
            </div>

            {/* RIGHT SIDE */}
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                toggleFullscreen();
              }}
              className="player-button"
              title="Fullscreen"
              aria-label="Fullscreen"
            >
              {isFullscreen ? "⛶" : "⛶"}
            </button>
          </div>
        </div>
      </div>
      {/* =====================================================
          PLAYER CSS
          ===================================================== */}
      <style jsx>{`
        .player-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border: 0;
          border-radius: 9999px;
          background: transparent;
          color: white;
          cursor: pointer;
          font-size: 17px;
          transition:
            background 0.15s ease,
            transform 0.15s ease;
        }

        .player-button:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.14);
          transform: scale(1.05);
        }

        .player-button:disabled {
          cursor: default;
        }

        /* ================================================
           THIN VIDEO PROGRESS BAR
           ================================================ */

        .video-progress {
          position: absolute;
          left: 0;
          top: 50%;
          width: 100%;
          height: 18px;
          margin: 0;
          padding: 0;
          transform: translateY(-50%);
          appearance: none;
          -webkit-appearance: none;
          background: transparent;
          cursor: pointer;
        }

        .video-progress::-webkit-slider-runnable-track {
          height: 3px;
          background: transparent;
        }

        .video-progress::-moz-range-track {
          height: 3px;
          background: transparent;
        }

        /* Normal thumb = small white */
        .video-progress::-webkit-slider-thumb {
          appearance: none;
          -webkit-appearance: none;
          width: 10px;
          height: 10px;
          margin-top: -3.5px;
          border: none;
          border-radius: 50%;
          background: white;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
          transition: transform 0.15s ease;
        }

        .video-progress::-moz-range-thumb {
          width: 10px;
          height: 10px;
          border: none;
          border-radius: 50%;
          background: white;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
        }

        /* While dragging = ONE red thumb */
        .video-progress.is-seeking::-webkit-slider-thumb {
          background: #ff0000;
          transform: scale(1.25);
        }

        .video-progress.is-seeking::-moz-range-thumb {
          background: #ff0000;
          transform: scale(1.25);
        }

        /* ================================================
           VOLUME
           ================================================ */

        .volume-control {
          width: 70px;
          height: 3px;
          appearance: none;
          -webkit-appearance: none;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.4);
          cursor: pointer;
        }

        .volume-control::-webkit-slider-thumb {
          appearance: none;
          -webkit-appearance: none;
          width: 9px;
          height: 9px;
          border: none;
          border-radius: 50%;
          background: white;
        }

        .volume-control::-moz-range-thumb {
          width: 9px;
          height: 9px;
          border: none;
          border-radius: 50%;
          background: white;
        }

        @media (max-width: 640px) {
          .player-button {
            width: 30px;
            height: 30px;
            font-size: 15px;
          }
        }
      `}</style>
    </div>
  );
}