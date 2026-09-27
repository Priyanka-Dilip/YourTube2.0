import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";

interface Comment {
  _id: string;
  videoid: string;
  userid: string;
  commentbody: string;
  usercommented: string;
  commentedon: string;

  location?: string | null;
  showLocation?: boolean;

  // Task 6 additions
  likes?: string[];
  dislikes?: string[];
  reports?: string[];
  flagged?: boolean;
  moderationStatus?: string;
}

const Comments = ({ videoId }: any) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [translationLanguage, setTranslationLanguage] = useState("en");
  const [translatedComments, setTranslatedComments] = useState<
  Record<string, string>
  >({});
  const [translatingCommentId, setTranslatingCommentId] = useState<string | null>(
  null
);
  const [location, setLocation] = useState("");
  const [showLocation, setShowLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [editingCommentId, setEditingCommentId] = useState<string | null>(
    null
  );
  const [editText, setEditText] = useState("");
  const { user } = useUser();
  const [loading, setLoading] = useState(true);

  const fetchedComments = [
    {
      _id: "1",
      videoid: videoId,
      userid: "1",
      commentbody: "Great video! Really enjoyed watching this.",
      usercommented: "John Doe",
      commentedon: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      _id: "2",
      videoid: videoId,
      userid: "2",
      commentbody: "Thanks for sharing this amazing content!",
      usercommented: "Jane Smith",
      commentedon: new Date(Date.now() - 7200000).toISOString(),
    },
  ];

  useEffect(() => {
    loadComments();
  }, [videoId]);

  const loadComments = async () => {
    try {
      const res = await axiosInstance.get(`/comment/${videoId}`);
      setComments(res.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading history...</div>;
  }

  const handleSubmitComment = async () => {
    if (!user || !newComment.trim()) return;

    setIsSubmitting(true);

    try {
      const res = await axiosInstance.post("/comment/postcomment", {
  videoid: videoId,
  userid: user._id,
  commentbody: newComment,
  usercommented: user.name,
  language: selectedLanguage,
  location: location || null,
  showLocation: showLocation,
});

      if (res.data.comment) {
  await loadComments();
}

      setNewComment("");
    } catch (error: any) {
  console.error("Error adding comment:", error);

  const message =
    error?.response?.data?.message ||
    "Unable to add comment.";

  alert(`⚠️ ${message}`);
} finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (comment: Comment) => {
    setEditingCommentId(comment._id);
    setEditText(comment.commentbody);
  };

  const handleUpdateComment = async () => {
    if (!editText.trim()) return;

    try {
      const res = await axiosInstance.post(
        `/comment/editcomment/${editingCommentId}`,
        { commentbody: editText }
      );

      if (res.data) {
        setComments((prev) =>
          prev.map((c) =>
            c._id === editingCommentId
              ? { ...c, commentbody: editText }
              : c
          )
        );

        setEditingCommentId(null);
        setEditText("");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await axiosInstance.delete(
        `/comment/deletecomment/${id}`
      );

      if (res.data.comment) {
        setComments((prev) => prev.filter((c) => c._id !== id));
      }
    } catch (error) {
      console.log(error);
    }
  };

  // ==========================================
  // LIKE COMMENT
  // ==========================================
  const handleLike = async (commentId: string) => {
    if (!user) return;

    try {
      await axiosInstance.post(`/comment/like/${commentId}`, {
        userId: user._id,
      });

      // Reload comments so the actual users in likes/dislikes
      // stay synchronized with MongoDB.
      await loadComments();
    } catch (error) {
      console.error("Error liking comment:", error);
    }
  };

  // ==========================================
  // DISLIKE COMMENT
  // ==========================================
  const handleDislike = async (commentId: string) => {
    if (!user) return;

    try {
      await axiosInstance.post(`/comment/dislike/${commentId}`, {
        userId: user._id,
      });

      // Reload comments so the actual users in likes/dislikes
      // stay synchronized with MongoDB.
      await loadComments();
    } catch (error) {
      console.error("Error disliking comment:", error);
    }
  };

  // ==========================================
  // REPORT COMMENT
  // ==========================================
  const handleReport = async (commentId: string) => {
    if (!user) return;

    try {
      const res = await axiosInstance.post(`/comment/report/${commentId}`, {
        userId: user._id,
      });

      if (res.data.flagged) {
        setComments((prev) =>
          prev.map((c) =>
            c._id === commentId
              ? {
                  ...c,
                  flagged: true,
                  moderationStatus: "flagged",
                }
              : c
          )
        );
      }

      alert("Comment reported for review.");
    } catch (error) {
      console.error("Error reporting comment:", error);
    }
  };
  // ==========================================
  // TRANSLATE COMMENT
  // ==========================================
  const handleTranslate = async (commentId: string) => {
    try {
      setTranslatingCommentId(commentId);

      const res = await axiosInstance.post(
        `/comment/translate/${commentId}`,
        {
          to: translationLanguage,
        }
      );

      if (res.data.translatedText) {
        setTranslatedComments((prev) => ({
          ...prev,
          [commentId]: res.data.translatedText,
        }));
      }
    } catch (error: any) {
      console.error("Error translating comment:", error);

      const message =
        error?.response?.data?.message ||
        "Unable to translate comment.";

      alert(`⚠️ ${message}`);
    } finally {
      setTranslatingCommentId(null);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">
        {comments.length} Comments
      </h2>

      {user && (
        <div className="flex gap-4">
          <Avatar className="w-10 h-10">
            <AvatarImage src={user.image || ""} />
            <AvatarFallback>
              {user.name?.[0] || "U"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-2">
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e: any) => setNewComment(e.target.value)}
              className="min-h-[80px] resize-none border-0 border-b-2 rounded-none focus-visible:ring-0"
            />
             <select
  value={selectedLanguage}
  onChange={(e) => setSelectedLanguage(e.target.value)}
  className="border rounded-md px-3 py-2 text-sm bg-background"
>
  <option value="en">English</option>
  <option value="hi">Hindi</option>
  <option value="te">Telugu</option>
  <option value="ta">Tamil</option>
  <option value="ml">Malayalam</option>
  <option value="kn">Kannada</option>
  <option value="bn">Bengali</option>
  <option value="mr">Marathi</option>
</select>

<select
  value={translationLanguage}
  onChange={(e) => setTranslationLanguage(e.target.value)}
  className="border rounded-md px-3 py-2 text-sm bg-background"
>
  <option value="en">Translate to English</option>
  <option value="hi">Translate to Hindi</option>
  <option value="te">Translate to Telugu</option>
  <option value="ta">Translate to Tamil</option>
  <option value="ml">Translate to Malayalam</option>
  <option value="kn">Translate to Kannada</option>
  <option value="bn">Translate to Bengali</option>
  <option value="mr">Translate to Marathi</option>
</select>
<input
  type="text"
  value={location}
  onChange={(e) => setLocation(e.target.value)}
  placeholder="City/State (optional)"
  className="border rounded-md px-3 py-2 text-sm bg-background"
  maxLength={50}
/>

<label className="flex items-center gap-2 text-sm">
  <input
    type="checkbox"
    checked={showLocation}
    onChange={(e) => setShowLocation(e.target.checked)}
  />
  Show my location publicly
</label>


            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => setNewComment("")}
                disabled={!newComment.trim()}
              >
                Cancel
              </Button>

              <Button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || isSubmitting}
              >
                Comment
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment._id} className="flex gap-4">
              <Avatar className="w-10 h-10">
                <AvatarImage src="/placeholder.svg?height=40&width=40" />

                <AvatarFallback>
                  {comment.usercommented?.[0] || "U"}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">
                    {comment.usercommented}
                  </span>

                  <span className="text-xs text-gray-600">
                    {formatDistanceToNow(
                      new Date(comment.commentedon)
                    )}{" "}
                    ago
                  </span>
                </div>
                {comment.showLocation && comment.location && (
  <div className="text-xs text-gray-500 mb-1">
    📍 {comment.location}
  </div>
)}

                {editingCommentId === comment._id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                    />

                    <div className="flex gap-2 justify-end">
                      <Button
                        onClick={handleUpdateComment}
                        disabled={!editText.trim()}
                      >
                        Save
                      </Button>

                      <Button
                        variant="ghost"
                        onClick={() => {
                          setEditingCommentId(null);
                          setEditText("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                   <p className="text-sm">
  {translatedComments[comment._id] || comment.commentbody}
</p>

                    {/* ==========================================
                        LIKE / DISLIKE / REPORT
                    ========================================== */}
                    <div className="flex items-center gap-4 mt-2">
                      <button
                        type="button"
                        onClick={() => handleLike(comment._id)}
                        disabled={!user}
                        className="text-sm text-gray-500 hover:text-foreground transition-colors"
                      >
                        👍 Like
                        <span className="ml-1">
                          {comment.likes?.length || 0}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDislike(comment._id)}
                        disabled={!user}
                        className="text-sm text-gray-500 hover:text-foreground transition-colors"
                      >
                        👎 Dislike
                        <span className="ml-1">
                          {comment.dislikes?.length || 0}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleReport(comment._id)}
                        disabled={!user}
                        className="text-sm text-gray-500 hover:text-red-500 transition-colors"
                      >
                        🚩 Report
                      </button>
                    </div>
                       <button
  type="button"
  onClick={() => handleTranslate(comment._id)}
  disabled={translatingCommentId === comment._id}
  className="text-sm text-gray-500 hover:text-foreground transition-colors"
>
  {translatingCommentId === comment._id
    ? "Translating..."
    : "🌐 Translate"}
</button>
                    {/* Existing Edit / Delete functionality */}
                    {comment.userid === user?._id && (
                      <div className="flex gap-2 mt-2 text-sm text-gray-500">
                        <button
                          onClick={() => handleEdit(comment)}
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => handleDelete(comment._id)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Comments;