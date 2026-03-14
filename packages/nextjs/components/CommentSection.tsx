"use client";

import { useEffect, useState } from "react";
import { Loader2, MessageCircle, Send } from "lucide-react";
import { useAccount } from "wagmi";
import { useScaffoldEventHistory, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { Comment, fetchCommentFromIPFS, uploadCommentToIPFS } from "~~/lib/ipfs";

interface CommentEvent {
  articleId: bigint;
  author: string;
  cid: string;
  timestamp: bigint;
  blockNumber: bigint;
  blockHash: string;
  transactionHash: string;
}

interface CommentWithContent extends CommentEvent {
  content?: Comment;
  isLoading: boolean;
}

interface CommentSectionProps {
  articleId: bigint;
}

export function CommentSection({ articleId }: CommentSectionProps) {
  const { address: connectedAddress, isConnected } = useAccount();
  const { writeContractAsync } = useScaffoldWriteContract({ contractName: "Social" });

  const [comments, setComments] = useState<CommentWithContent[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: events } = useScaffoldEventHistory({
    contractName: "Social",
    eventName: "CommentAdded",
    fromBlock: 0n,
    filters: { articleId },
    watch: true,
  });

  useEffect(() => {
    async function loadComments() {
      if (!events) {
        setIsLoadingComments(false);
        return;
      }

      const typedEvents = events as unknown as CommentEvent[];
      const commentsWithContent: CommentWithContent[] = [];

      for (const event of typedEvents) {
        try {
          const content = await fetchCommentFromIPFS(event.cid);
          commentsWithContent.push({
            ...event,
            content,
            isLoading: false,
          });
        } catch {
          commentsWithContent.push({
            ...event,
            content: { author: event.author, body: "[Failed to load comment]", createdAt: Number(event.timestamp) },
            isLoading: false,
          });
        }
      }

      setComments(commentsWithContent.reverse());
      setIsLoadingComments(false);
    }

    loadComments();
  }, [events]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !isConnected) return;

    setIsSubmitting(true);
    try {
      if (!connectedAddress) return;

      const commentData: Comment = {
        author: connectedAddress,
        body: newComment.trim(),
        createdAt: Date.now(),
      };

      const cid = await uploadCommentToIPFS(commentData);

      await writeContractAsync({
        functionName: "addComment" as any,
        args: [articleId, cid] as any,
      });

      setNewComment("");
    } catch (err) {
      console.error("Failed to add comment:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="border-t border-stone-200 mt-16 pt-8">
      <div className="flex items-center gap-2 mb-6">
        <MessageCircle className="w-5 h-5" />
        <h2 className="text-xl font-bold text-stone-900">Responses {comments.length > 0 && `(${comments.length})`}</h2>
      </div>

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

      {isLoadingComments ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
        </div>
      ) : comments.length > 0 ? (
        <div className="space-y-6">
          {comments.map(comment => (
            <div key={comment.transactionHash} className="border-b border-stone-100 pb-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-xs font-medium text-stone-600">
                  {comment.content?.author.slice(2, 4).toUpperCase()}
                </div>
                <span className="font-medium text-stone-900 text-sm">
                  {comment.content?.author.slice(0, 6)}...{comment.content?.author.slice(-4)}
                </span>
                <span className="text-stone-400 text-sm">
                  {comment.content?.createdAt ? new Date(comment.content.createdAt).toLocaleDateString() : ""}
                </span>
              </div>
              <p className="text-stone-700 font-serif leading-relaxed">{comment.content?.body}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-stone-400 py-8">No comments yet. Be the first to respond!</div>
      )}
    </div>
  );
}
