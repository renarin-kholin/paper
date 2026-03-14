"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, MessageCircle, RefreshCw, Send } from "lucide-react";
import { useAccount } from "wagmi";
import { fetchCommentFromIPFS, uploadCommentToIPFS } from "~~/lib/ipfs";

interface StoredComment {
  cid: string;
  author: string;
  timestamp: number;
}

interface CommentWithBody {
  author: string;
  body: string;
  timestamp: number;
  key: string;
}

interface CommentSectionProps {
  articleId: bigint;
}

export function CommentSection({ articleId }: CommentSectionProps) {
  const { address: connectedAddress, isConnected } = useAccount();

  const [comments, setComments] = useState<CommentWithBody[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getStorageKey = useCallback(() => `paper:comments:${articleId.toString()}`, [articleId]);

  const readStoredComments = useCallback((): StoredComment[] => {
    if (typeof window === "undefined") return [];

    try {
      const raw = window.localStorage.getItem(getStorageKey());
      if (!raw) return [];

      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];

      return parsed.filter(comment => {
        if (typeof comment !== "object" || comment === null) return false;
        const candidate = comment as Partial<StoredComment>;
        return (
          typeof candidate.cid === "string" &&
          typeof candidate.author === "string" &&
          typeof candidate.timestamp === "number"
        );
      }) as StoredComment[];
    } catch {
      return [];
    }
  }, [getStorageKey]);

  const loadComments = useCallback(async () => {
    const storedComments = readStoredComments();
    const loadedComments = await Promise.all(
      storedComments.map(async comment => {
        const { author, cid, timestamp } = comment;
        if (!author || !cid) return null;

        let body = "[Comment unavailable]";
        try {
          const data = await fetchCommentFromIPFS(cid);
          body = data.body || body;
        } catch {
          // Keep fallback body when IPFS fetch fails.
        }

        return {
          author,
          body,
          timestamp,
          key: `${cid}:${timestamp}`,
        } as CommentWithBody;
      }),
    );

    const validComments = loadedComments.filter(Boolean) as CommentWithBody[];
    validComments.sort((a, b) => b.timestamp - a.timestamp);
    setComments(validComments);
    setIsLoading(false);
  }, [readStoredComments]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleRefresh = async () => {
    setIsLoading(true);
    await loadComments();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !isConnected || !connectedAddress) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const commentData = {
        author: connectedAddress,
        body: newComment.trim(),
        createdAt: Date.now(),
      };

      const cid = await uploadCommentToIPFS(commentData);
      const existing = readStoredComments();
      const nextComments: StoredComment[] = [
        ...existing,
        {
          cid,
          author: connectedAddress,
          timestamp: Date.now(),
        },
      ];

      if (typeof window !== "undefined") {
        window.localStorage.setItem(getStorageKey(), JSON.stringify(nextComments));
      }

      setNewComment("");
      setIsLoading(true);
      await loadComments();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add comment";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatAddress = (addr: string) => {
    if (!addr) return "Unknown";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="border-t border-stone-200 mt-16 pt-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          <h2 className="text-xl font-bold text-stone-900">
            Responses {comments.length > 0 && `(${comments.length})`}
          </h2>
        </div>
        <button
          onClick={handleRefresh}
          className="p-2 hover:bg-stone-100 rounded-full transition-colors"
          title="Refresh comments"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

      {isConnected ? (
        <form onSubmit={handleSubmit} className="mb-8">
          <textarea
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder="What are your thoughts?"
            className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-stone-400 focus:outline-none resize-none font-serif"
            rows={3}
            disabled={isSubmitting}
          />
          <div className="flex justify-end mt-2">
            <button
              type="submit"
              disabled={!newComment.trim() || isSubmitting}
              className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-full font-medium hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Respond
            </button>
          </div>
        </form>
      ) : (
        <div className="mb-8 p-4 bg-stone-50 rounded-xl text-center text-stone-500">
          Connect your wallet to leave a comment.
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
        </div>
      ) : comments.length > 0 ? (
        <div className="space-y-6">
          {comments.map(comment => (
            <div key={comment.key} className="border-b border-stone-100 pb-6 last:border-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-xs font-medium text-stone-600">
                  {comment.author ? comment.author.slice(2, 4).toUpperCase() : "??"}
                </div>
                <span className="font-medium text-stone-900 text-sm">{formatAddress(comment.author)}</span>
                <span className="text-stone-400 text-sm">{formatDate(comment.timestamp)}</span>
              </div>
              <p className="text-stone-700 font-serif leading-relaxed">{comment.body}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-stone-400 py-8">No comments yet. Be the first to respond!</div>
      )}
    </div>
  );
}
