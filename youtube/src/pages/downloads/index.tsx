import React, { useEffect, useState } from "react";
import Videogrid from "@/components/Videogrid";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";

const Downloads = () => {
  const { user } = useUser();
  const [downloads, setDownloads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDownloads = async () => {
      if (!user?._id) {
        setLoading(false);
        return;
      }

      try {
        const response = await axiosInstance.get(
          `/video/downloads/${user._id}`
        );

        setDownloads(response.data);
      } catch (error) {
        console.error("Error fetching downloads:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDownloads();
  }, [user]);

  return (
    <main className="flex-1 min-h-screen bg-white p-4">
      <h1 className="text-2xl font-semibold mb-6">
        Downloads
      </h1>

      {!user ? (
        <p className="text-gray-600">
          Please login to view your downloads.
        </p>
      ) : loading ? (
        <p className="text-gray-600">
          Loading downloads...
        </p>
      ) : downloads.length === 0 ? (
        <p className="text-gray-600">
          You haven't downloaded any videos yet.
        </p>
      ) : (
        <div className="space-y-4">
          {downloads.map((item) => (
            <div
              key={item._id}
              className="flex gap-4 border-b pb-4"
            >
              <div className="w-48 h-28 bg-gray-200 rounded-lg overflow-hidden">
                <video
                  src={`${process.env.NEXT_PUBLIC_BACKEND_URL}/${item.video?.filepath}`}
                  className="w-full h-full object-cover"
                  controls
                />
              </div>

              <div>
                <h2 className="font-semibold">
                  {item.video?.videotitle || item.video?.filename}
                </h2>

                <p className="text-sm text-gray-500 mt-2">
                  Downloaded on{" "}
                  {new Date(item.downloadedAt).toLocaleDateString()}
                </p>

                <p className="text-sm text-gray-500">
                  {item.video?.videochanel}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
};

export default Downloads;