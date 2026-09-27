import Comments from "@/components/Comments";
import RelatedVideos from "@/components/RelatedVideos";
import VideoInfo from "@/components/VideoInfo";
import Videopplayer from "@/components/Videopplayer";
import axiosInstance from "@/lib/axiosinstance";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";

const index = () => {
  const router = useRouter();
  const { id } = router.query;

  // Current video
  const [videos, setvideo] = useState<any>(null);

  // All videos
  const [video, setvide] = useState<any[]>([]);

  const [loading, setloading] = useState(true);

  useEffect(() => {
    const fetchvideo = async () => {
      if (!id || typeof id !== "string") return;

      try {
        const res = await axiosInstance.get("/video/getall");

        // Get current video
        const currentVideo = res.data?.find(
          (vid: any) => vid._id === id
        );

        // Save current video
        setvideo(currentVideo);

        // Save all videos
        setvide(res.data || []);
      } catch (error) {
        console.log(error);
      } finally {
        setloading(false);
      }
    };

    fetchvideo();
  }, [id]);

  // ================================
  // NEXT VIDEO
  // ================================
  const handleNextVideo = () => {
    if (!id || !video || video.length === 0) return;

    const currentIndex = video.findIndex(
      (vid: any) => vid._id === id
    );

    // If current video is not found
    if (currentIndex === -1) return;

    // Get next video
    const nextVideo = video[currentIndex + 1];

    // If next video exists, open it
    if (nextVideo) {
      router.push(`/watch/${nextVideo._id}`);
    }
  };

  // ================================
  // PREVIOUS VIDEO
  // ================================
  const handlePreviousVideo = () => {
    if (!id || !video || video.length === 0) return;

    const currentIndex = video.findIndex(
      (vid: any) => vid._id === id
    );

    // If current video is not found
    if (currentIndex === -1) return;

    // Get previous video
    const previousVideo = video[currentIndex - 1];

    // If previous video exists, open it
    if (previousVideo) {
      router.push(`/watch/${previousVideo._id}`);
    }
  };

  if (loading) {
    return <div>Loading..</div>;
  }

  if (!videos) {
    return <div>Video not found</div>;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ================================
              MAIN VIDEO SECTION
          ================================= */}
          <div className="lg:col-span-2 space-y-4">

            <Videopplayer
              video={videos}
              onNext={handleNextVideo}
              onPrevious={handlePreviousVideo}
            />

            <VideoInfo video={videos} />

            <Comments videoId={id} />
          </div>

          {/* ================================
              RELATED VIDEOS
          ================================= */}
          <div className="space-y-4">
            <RelatedVideos videos={video} />
          </div>

        </div>
      </div>
    </div>
  );
};

export default index;