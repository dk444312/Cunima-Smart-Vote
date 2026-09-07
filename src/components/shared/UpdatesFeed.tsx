import React from "react";
import { Sparkles, Check, Trash2, Heart, MessageCircle } from "lucide-react";
import { LoggedInUser, UpdateRow, UpdateLikeRow, UpdateCommentRow } from "../../types.ts";

interface UpdatesFeedProps {
  currentUser: LoggedInUser | null;
  updates: UpdateRow[];
  updateLikes: Record<string, UpdateLikeRow[]>;
  updateComments: Record<string, UpdateCommentRow[]>;
  newUpdateContent: string;
  setNewUpdateContent: (val: string) => void;
  handleCreateUpdate: (e: React.FormEvent) => void;
  handleDeleteUpdate: (id: string) => void;
  handleToggleLikeUpdate: (id: string) => void;
  newCommentContents: Record<string, string>;
  setNewCommentContents: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handlePostComment: (e: React.FormEvent, updateId: string) => void;
  isAdmin: boolean;
}

export default function UpdatesFeed({
  currentUser,
  updates,
  updateLikes,
  updateComments,
  newUpdateContent,
  setNewUpdateContent,
  handleCreateUpdate,
  handleDeleteUpdate,
  handleToggleLikeUpdate,
  newCommentContents,
  setNewCommentContents,
  handlePostComment,
  isAdmin
}: UpdatesFeedProps) {
  return (
    <div className="space-y-6">
      {/* COMPOSER (Admin Only) */}
      {isAdmin && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
            <span className="inline-flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-full text-xs font-bold border border-blue-200 dark:border-blue-900/40">
              <span className="inline-flex items-center justify-center bg-[#0095F6] text-white rounded-full w-4 h-4 shadow-sm">
                <Check className="w-2.5 h-2.5 stroke-[4.5px]" />
              </span>
              <span>Verified Admin Composer</span>
            </span>
          </div>

          <form onSubmit={handleCreateUpdate} className="space-y-3">
            <textarea
              value={newUpdateContent}
              onChange={(e) => setNewUpdateContent(e.target.value)}
              placeholder="What important update would you like to broadcast to voters today? Type here..."
              className="w-full h-24 p-4 text-sm bg-transparent border border-zinc-200 dark:border-zinc-800 focus:border-[#1a73e8] dark:focus:border-blue-500 focus:outline-none rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 resize-none"
              required
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-zinc-400 font-mono">
                This post will immediately broadcast to all voter portals.
              </span>
              <button
                type="submit"
                disabled={!newUpdateContent.trim()}
                className="px-5 py-2 bg-[#1a73e8] hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-full shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                Publish Broadcast
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FEED BODY */}
      <div className="space-y-4">
        {updates.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl">
            <Sparkles className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">No Election Updates Yet</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mt-1">
              Administrators haven't broadcasted any updates to the channel yet. Stay tuned!
            </p>
          </div>
        ) : (
          updates.map((upd) => {
            const likes = updateLikes[upd.id] || [];
            const comments = updateComments[upd.id] || [];
            const hasLiked = currentUser ? likes.some(l => l.user_id === currentUser.id) : false;

            return (
              <div key={upd.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center font-bold text-xs text-[#1a73e8]">
                      {upd.author.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-50">
                          {upd.author}
                        </span>
                        <span className="inline-flex items-center justify-center bg-[#0095F6] text-white rounded-full w-4 h-4 shadow-sm" title="Meta Verified Admin">
                          <Check className="w-2.5 h-2.5 stroke-[4.5px]" />
                        </span>
                        <span className="text-[10px] bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-bold border border-blue-100 dark:border-blue-900/20">
                          Verified Admin
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {new Date(upd.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteUpdate(upd.id)}
                      className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-full transition-colors cursor-pointer"
                      title="Delete this update post"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
                  {upd.content}
                </div>

                <div className="flex items-center gap-6 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs font-mono">
                  <button
                    onClick={() => handleToggleLikeUpdate(upd.id)}
                    className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                      hasLiked 
                        ? "text-red-500 font-semibold" 
                        : "text-zinc-500 hover:text-red-500"
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${hasLiked ? "fill-red-500 text-red-500" : ""}`} />
                    <span>{likes.length} {likes.length === 1 ? "Like" : "Likes"}</span>
                  </button>

                  <div className="flex items-center gap-1.5 text-zinc-505">
                    <MessageCircle className="w-4 h-4" />
                    <span>{comments.length} {comments.length === 1 ? "Comment" : "Comments"}</span>
                  </div>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-800/20 rounded-xl p-4 space-y-4">
                  {comments.length > 0 && (
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                      {comments.map((c) => {
                        const isCommentAdmin = c.username.toLowerCase() === "admin";
                        return (
                          <div key={c.id} className="flex gap-2.5">
                            <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center font-bold text-[9px] text-zinc-600 dark:text-zinc-300 flex-shrink-0">
                              {c.username.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="bg-white dark:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-700 px-3.5 py-2 rounded-2xl max-w-full text-xs">
                              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                  {c.username}
                                </span>
                                {isCommentAdmin && (
                                  <div className="flex items-center gap-1">
                                    <span className="inline-flex items-center justify-center bg-[#0095F6] text-white rounded-full w-3.5 h-3.5 shadow-sm" title="Meta Verified Admin">
                                      <Check className="w-2 h-2 stroke-[4.5px]" />
                                    </span>
                                    <span className="text-[9px] bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.2 rounded font-bold">
                                      Admin
                                    </span>
                                  </div>
                                )}
                                <span className="text-[9px] text-zinc-400 font-mono">
                                  {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-zinc-700 dark:text-zinc-300 leading-normal">{c.content}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {currentUser && (
                    <form 
                      onSubmit={(e) => handlePostComment(e, upd.id)}
                      className="flex gap-2 pt-1"
                    >
                      <input
                        type="text"
                        value={newCommentContents[upd.id] || ""}
                        onChange={(e) => setNewCommentContents(prev => ({ ...prev, [upd.id]: e.target.value }))}
                        placeholder="Write a supportive comment..."
                        className="flex-1 px-4 py-2 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 focus:border-[#1a73e8] dark:focus:border-blue-500 focus:outline-none rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
                        required
                      />
                      <button
                        type="submit"
                        disabled={!(newCommentContents[upd.id] || "").trim()}
                        className="px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-xl text-xs font-semibold hover:bg-zinc-800 disabled:opacity-40 transition-colors cursor-pointer"
                      >
                        Comment
                      </button>
                    </form>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
