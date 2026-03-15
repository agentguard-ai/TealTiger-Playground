// Comment types for inline collaboration
// Requirements: 6.1-6.10

export interface Comment {
  id: string;
  policyId: string;
  versionId: string;
  lineNumber: number;
  content: string; // Markdown supported
  authorId: string;
  resolved: boolean;
  mentions: string[]; // User IDs mentioned with @
  createdAt: Date;
  updatedAt: Date;
}

export interface CommentReply {
  id: string;
  commentId: string;
  content: string;
  authorId: string;
  createdAt: Date;
}

export interface CommentThread {
  comment: Comment;
  replies: CommentReply[];
  author: AuthUser;
  replyAuthors: AuthUser[];
}

export interface AuthUser {
  id: string;
  githubId: string;
  username: string;
  email: string;
  avatarUrl: string;
}

export interface CommentFilters {
  author?: string;
  resolved?: boolean;
  dateRange?: { start: Date; end: Date };
}

export interface AddCommentInput {
  policyId: string;
  versionId: string;
  lineNumber: number;
  content: string;
  authorId: string;
}

export interface AddReplyInput {
  commentId: string;
  content: string;
  authorId: string;
}
