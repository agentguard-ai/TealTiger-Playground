// CommentThread - Display comment with replies
// Requirements: 6.3, 6.4, 6.5, 6.7

import React, { useState } from 'react';
import { CommentThread as CommentThreadType } from '../../types/comment';
import { CommentForm } from './CommentForm';
import ReactMarkdown from 'react-markdown';

interface CommentThreadProps {
  thread: CommentThreadType;
  onReply: (commentId: string, content: string) => Promise<void>;
  onResolve: (commentId: string) => Promise<void>;
  onReopen: (commentId: string) => Promise<void>;
  currentUserId: string;
}

export const CommentThread: React.FC<CommentThreadProps> = ({
  thread,
  onReply,
  onResolve,
  onReopen,
  currentUserId,
}) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReply = async (content: string) => {
    setIsSubmitting(true);
    try {
      await onReply(thread.comment.id, content);
      setShowReplyForm(false);
    } catch (error) {
      console.error('Failed to add reply:', error);
      alert('Failed to add reply. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolve = async () => {
    try {
      if (thread.comment.resolved) {
        await onReopen(thread.comment.id);
      } else {
        await onResolve(thread.comment.id);
      }
    } catch (error) {
      console.error('Failed to toggle resolve status:', error);
      alert('Failed to update comment status. Please try again.');
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div
      className={`border rounded-lg p-4 mb-4 ${
        thread.comment.resolved ? 'bg-gray-50 border-gray-300' : 'bg-white border-blue-300'
      }`}
    >
      {/* Main Comment */}
      <div className="flex items-start space-x-3">
        <img
          src={thread.author.avatarUrl}
          alt={thread.author.username}
          className="w-8 h-8 rounded-full"
        />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-sm">{thread.author.username}</span>
              <span className="text-xs text-gray-500">
                {formatDate(thread.comment.createdAt)}
              </span>
              {thread.comment.resolved && (
                <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded">
                  Resolved
                </span>
              )}
            </div>
            <button
              onClick={handleResolve}
              className="text-xs text-gray-600 hover:text-gray-900"
            >
              {thread.comment.resolved ? 'Reopen' : 'Resolve'}
            </button>
          </div>
          <div className="mt-1 text-sm prose prose-sm max-w-none">
            <ReactMarkdown>{thread.comment.content}</ReactMarkdown>
          </div>
          <button
            onClick={() => setShowReplyForm(!showReplyForm)}
            className="mt-2 text-xs text-blue-600 hover:text-blue-800"
          >
            Reply
          </button>
        </div>
      </div>

      {/* Replies */}
      {thread.replies.length > 0 && (
        <div className="mt-4 ml-11 space-y-3">
          {thread.replies.map((reply, index) => {
            const replyAuthor = thread.replyAuthors[index];
            return (
              <div key={reply.id} className="flex items-start space-x-3">
                <img
                  src={replyAuthor?.avatarUrl}
                  alt={replyAuthor?.username}
                  className="w-6 h-6 rounded-full"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-xs">
                      {replyAuthor?.username}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(reply.createdAt)}
                    </span>
                  </div>
                  <div className="mt-1 text-sm prose prose-sm max-w-none">
                    <ReactMarkdown>{reply.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reply Form */}
      {showReplyForm && (
        <div className="mt-4 ml-11">
          <CommentForm
            onSubmit={handleReply}
            onCancel={() => setShowReplyForm(false)}
            placeholder="Write a reply..."
            isSubmitting={isSubmitting}
          />
        </div>
      )}
    </div>
  );
};
