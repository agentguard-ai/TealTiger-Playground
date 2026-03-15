// CollaborationService - Inline collaboration comments
// Requirements: 6.1-6.10

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  Comment,
  CommentReply,
  CommentThread,
  CommentFilters,
  AddCommentInput,
  AddReplyInput,
  AuthUser,
} from '../types/comment';

export class CollaborationService {
  private supabase: SupabaseClient;

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    const url = supabaseUrl || import.meta.env.VITE_SUPABASE_URL;
    const key = supabaseKey || import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!url || !key) {
      throw new Error('Supabase URL and anon key are required');
    }

    this.supabase = createClient(url, key);
  }

  /**
   * Adds a comment to a specific line
   * Requirements: 6.1, 6.2
   */
  async addComment(
    policyId: string,
    versionId: string,
    lineNumber: number,
    content: string,
    authorId: string
  ): Promise<Comment> {
    // Extract mentions from content (@username)
    const mentions = this.extractMentions(content);
    const mentionUserIds = await this.resolveMentions(mentions);

    const { data, error } = await this.supabase
      .from('comments')
      .insert({
        policy_id: policyId,
        version_id: versionId,
        line_number: lineNumber,
        content,
        author_id: authorId,
        resolved: false,
        mentions: mentionUserIds,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add comment: ${error.message}`);
    }

    const comment = this.mapComment(data);

    // Notify mentioned users
    if (mentionUserIds.length > 0) {
      await this.notifyMentions(comment);
    }

    return comment;
  }

  /**
   * Adds a reply to a comment thread
   * Requirements: 6.3
   */
  async addReply(
    commentId: string,
    content: string,
    authorId: string
  ): Promise<CommentReply> {
    const { data, error } = await this.supabase
      .from('comment_replies')
      .insert({
        comment_id: commentId,
        content,
        author_id: authorId,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add reply: ${error.message}`);
    }

    return this.mapReply(data);
  }

  /**
   * Resolves a comment thread
   * Requirements: 6.7
   */
  async resolveComment(commentId: string): Promise<void> {
    const { error } = await this.supabase
      .from('comments')
      .update({ resolved: true, updated_at: new Date().toISOString() })
      .eq('id', commentId);

    if (error) {
      throw new Error(`Failed to resolve comment: ${error.message}`);
    }
  }

  /**
   * Reopens a resolved comment
   * Requirements: 6.7
   */
  async reopenComment(commentId: string): Promise<void> {
    const { error } = await this.supabase
      .from('comments')
      .update({ resolved: false, updated_at: new Date().toISOString() })
      .eq('id', commentId);

    if (error) {
      throw new Error(`Failed to reopen comment: ${error.message}`);
    }
  }

  /**
   * Gets all comments for a policy version
   * Requirements: 6.1, 6.3, 6.4
   */
  async getComments(
    policyId: string,
    versionId: string
  ): Promise<CommentThread[]> {
    // Fetch comments
    const { data: comments, error: commentsError } = await this.supabase
      .from('comments')
      .select('*')
      .eq('policy_id', policyId)
      .eq('version_id', versionId)
      .order('line_number', { ascending: true })
      .order('created_at', { ascending: true });

    if (commentsError) {
      throw new Error(`Failed to fetch comments: ${commentsError.message}`);
    }

    if (!comments || comments.length === 0) {
      return [];
    }

    // Fetch replies for all comments
    const commentIds = comments.map((c) => c.id);
    const { data: replies, error: repliesError } = await this.supabase
      .from('comment_replies')
      .select('*')
      .in('comment_id', commentIds)
      .order('created_at', { ascending: true });

    if (repliesError) {
      throw new Error(`Failed to fetch replies: ${repliesError.message}`);
    }

    // Fetch all unique author IDs
    const authorIds = new Set<string>();
    comments.forEach((c) => authorIds.add(c.author_id));
    replies?.forEach((r) => authorIds.add(r.author_id));

    const authors = await this.fetchAuthors(Array.from(authorIds));

    // Build comment threads
    const threads: CommentThread[] = comments.map((commentData) => {
      const comment = this.mapComment(commentData);
      const commentReplies = (replies || [])
        .filter((r) => r.comment_id === comment.id)
        .map((r) => this.mapReply(r));

      const author = authors.get(comment.authorId)!;
      const replyAuthors = commentReplies
        .map((r) => authors.get(r.authorId))
        .filter((a): a is AuthUser => a !== undefined);

      return {
        comment,
        replies: commentReplies,
        author,
        replyAuthors,
      };
    });

    return threads;
  }

  /**
   * Filters comments by status, author, or date
   * Requirements: 6.10
   */
  async filterComments(
    policyId: string,
    filters: CommentFilters
  ): Promise<CommentThread[]> {
    let query = this.supabase
      .from('comments')
      .select('*')
      .eq('policy_id', policyId);

    if (filters.author) {
      query = query.eq('author_id', filters.author);
    }

    if (filters.resolved !== undefined) {
      query = query.eq('resolved', filters.resolved);
    }

    if (filters.dateRange) {
      query = query
        .gte('created_at', filters.dateRange.start.toISOString())
        .lte('created_at', filters.dateRange.end.toISOString());
    }

    const { data: comments, error } = await query
      .order('line_number', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to filter comments: ${error.message}`);
    }

    if (!comments || comments.length === 0) {
      return [];
    }

    // Fetch replies and authors (same as getComments)
    const commentIds = comments.map((c) => c.id);
    const { data: replies } = await this.supabase
      .from('comment_replies')
      .select('*')
      .in('comment_id', commentIds)
      .order('created_at', { ascending: true });

    const authorIds = new Set<string>();
    comments.forEach((c) => authorIds.add(c.author_id));
    replies?.forEach((r) => authorIds.add(r.author_id));

    const authors = await this.fetchAuthors(Array.from(authorIds));

    const threads: CommentThread[] = comments.map((commentData) => {
      const comment = this.mapComment(commentData);
      const commentReplies = (replies || [])
        .filter((r) => r.comment_id === comment.id)
        .map((r) => this.mapReply(r));

      const author = authors.get(comment.authorId)!;
      const replyAuthors = commentReplies
        .map((r) => authors.get(r.authorId))
        .filter((a): a is AuthUser => a !== undefined);

      return {
        comment,
        replies: commentReplies,
        author,
        replyAuthors,
      };
    });

    return threads;
  }

  /**
   * Counts unresolved comments
   * Requirements: 6.8
   */
  async countUnresolved(policyId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('policy_id', policyId)
      .eq('resolved', false);

    if (error) {
      throw new Error(`Failed to count unresolved comments: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Notifies mentioned users
   * Requirements: 6.6
   */
  async notifyMentions(comment: Comment): Promise<void> {
    // In a real implementation, this would send notifications
    // For now, we'll just log (can be extended with email/webhook)
    if (comment.mentions.length > 0) {
      console.log(
        `Notifying users ${comment.mentions.join(', ')} about comment ${comment.id}`
      );
      // TODO: Implement notification system (email, in-app, webhook)
    }
  }

  /**
   * Persists comments across policy versions
   * Requirements: 6.9
   */
  async migrateComments(
    oldVersionId: string,
    newVersionId: string
  ): Promise<void> {
    // Fetch all comments from old version
    const { data: oldComments, error: fetchError } = await this.supabase
      .from('comments')
      .select('*')
      .eq('version_id', oldVersionId);

    if (fetchError) {
      throw new Error(`Failed to fetch old comments: ${fetchError.message}`);
    }

    if (!oldComments || oldComments.length === 0) {
      return;
    }

    // Create new comments for new version (preserving line numbers)
    const newComments = oldComments.map((comment) => ({
      policy_id: comment.policy_id,
      version_id: newVersionId,
      line_number: comment.line_number,
      content: comment.content,
      author_id: comment.author_id,
      resolved: comment.resolved,
      mentions: comment.mentions,
    }));

    const { error: insertError } = await this.supabase
      .from('comments')
      .insert(newComments);

    if (insertError) {
      throw new Error(`Failed to migrate comments: ${insertError.message}`);
    }
  }

  // Helper methods

  private extractMentions(content: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const matches = content.matchAll(mentionRegex);
    return Array.from(matches, (m) => m[1]);
  }

  private async resolveMentions(usernames: string[]): Promise<string[]> {
    if (usernames.length === 0) {
      return [];
    }

    const { data, error } = await this.supabase
      .from('users')
      .select('id')
      .in('username', usernames);

    if (error) {
      console.error('Failed to resolve mentions:', error);
      return [];
    }

    return data?.map((u) => u.id) || [];
  }

  private async fetchAuthors(
    authorIds: string[]
  ): Promise<Map<string, AuthUser>> {
    const { data, error } = await this.supabase
      .from('users')
      .select('id, github_id, username, email, avatar_url')
      .in('id', authorIds);

    if (error) {
      throw new Error(`Failed to fetch authors: ${error.message}`);
    }

    const authorsMap = new Map<string, AuthUser>();
    data?.forEach((user) => {
      authorsMap.set(user.id, {
        id: user.id,
        githubId: user.github_id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatar_url,
      });
    });

    return authorsMap;
  }

  private mapComment(data: any): Comment {
    return {
      id: data.id,
      policyId: data.policy_id,
      versionId: data.version_id,
      lineNumber: data.line_number,
      content: data.content,
      authorId: data.author_id,
      resolved: data.resolved,
      mentions: data.mentions || [],
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  private mapReply(data: any): CommentReply {
    return {
      id: data.id,
      commentId: data.comment_id,
      content: data.content,
      authorId: data.author_id,
      createdAt: new Date(data.created_at),
    };
  }
}
