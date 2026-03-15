import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CollaborationService } from '@/services/CollaborationService';

/**
 * Performance tests for comment loading operations
 * Validates: Requirements 29.5
 *
 * Tests that the CollaborationService can load 50+ comments,
 * filter comments, count unresolved, load threaded replies,
 * and migrate comments across versions within 300ms per policy.
 */

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
  isSupabaseConfigured: () => true,
}));

// --- Data generators ---

function generateMockComments(count: number, policyId = 'policy-perf', versionId = 'version-perf') {
  return Array.from({ length: count }, (_, i) => ({
    id: `comment-${i}`,
    policy_id: policyId,
    version_id: versionId,
    line_number: (i % 100) + 1,
    content: `This is comment ${i} with some review feedback about the policy logic on this line.`,
    author_id: `user-${i % 10}`,
    resolved: i % 3 === 0,
    mentions: i % 5 === 0 ? [`user-${(i + 1) % 10}`] : [],
    created_at: new Date(Date.now() - i * 60000).toISOString(),
    updated_at: new Date(Date.now() - i * 30000).toISOString(),
  }));
}

function generateMockReplies(comments: any[], repliesPerComment = 2) {
  const replies: any[] = [];
  let replyIdx = 0;
  for (const comment of comments) {
    const numReplies = replyIdx % 4 === 0 ? 0 : repliesPerComment;
    for (let r = 0; r < numReplies; r++) {
      replies.push({
        id: `reply-${replyIdx}-${r}`,
        comment_id: comment.id,
        content: `Reply ${r} to comment ${comment.id}`,
        author_id: `user-${(replyIdx + r + 1) % 10}`,
        created_at: new Date(Date.now() - (replyIdx * 60000) + (r * 1000)).toISOString(),
      });
    }
    replyIdx++;
  }
  return replies;
}

function generateMockAuthors(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `user-${i}`,
    github_id: `gh-${i}`,
    username: `developer${i}`,
    email: `dev${i}@example.com`,
    avatar_url: `https://avatars.example.com/${i}.png`,
  }));
}

// --- Performance helper ---

async function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; durationMs: number }> {
  const start = performance.now();
  const result = await fn();
  const durationMs = performance.now() - start;
  return { result, durationMs };
}

// 300ms budget per Requirement 29.5
const COMMENT_THRESHOLD_MS = 300;

describe('Comment Loading Performance', () => {
  let collaborationService: CollaborationService;
  let mockSupabase: any;

  beforeEach(async () => {
    // Construct with dummy values so the constructor doesn't throw
    collaborationService = new CollaborationService('https://fake.supabase.co', 'fake-key');
    // Replace the internal supabase client with our mock
    const supabaseModule = await import('@/lib/supabase');
    mockSupabase = supabaseModule.supabase;
    // Patch the private supabase field
    (collaborationService as any).supabase = mockSupabase;
    vi.clearAllMocks();
  });

  describe('getComments with 50+ comments within 300ms', () => {
    function mockGetCommentsQuery(comments: any[], replies: any[], authors: any[]) {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'comments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({ data: comments, error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'comment_replies') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: replies, error: null }),
              }),
            }),
          };
        }
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: authors, error: null }),
            }),
          };
        }
        return {};
      });
    }

    it('should load 50 comments with replies within 300ms', async () => {
      const comments = generateMockComments(50);
      const replies = generateMockReplies(comments);
      const authors = generateMockAuthors(10);
      mockGetCommentsQuery(comments, replies, authors);

      const { result, durationMs } = await measureTime(() =>
        collaborationService.getComments('policy-perf', 'version-perf')
      );

      expect(result).toHaveLength(50);
      expect(result[0].comment).toBeDefined();
      expect(result[0].author).toBeDefined();
      expect(durationMs).toBeLessThan(COMMENT_THRESHOLD_MS);
    });

    it('should load 100 comments with replies within 300ms', async () => {
      const comments = generateMockComments(100);
      const replies = generateMockReplies(comments);
      const authors = generateMockAuthors(10);
      mockGetCommentsQuery(comments, replies, authors);

      const { result, durationMs } = await measureTime(() =>
        collaborationService.getComments('policy-perf', 'version-perf')
      );

      expect(result).toHaveLength(100);
      // Verify thread structure is preserved
      for (const thread of result) {
        expect(thread.comment.policyId).toBe('policy-perf');
        expect(thread.comment.versionId).toBe('version-perf');
        expect(thread.author.username).toBeDefined();
      }
      expect(durationMs).toBeLessThan(COMMENT_THRESHOLD_MS);
    });

    it('should load 200 comments (high volume) within 300ms', async () => {
      const comments = generateMockComments(200);
      const replies = generateMockReplies(comments, 3);
      const authors = generateMockAuthors(20);
      mockGetCommentsQuery(comments, replies, authors);

      const { result, durationMs } = await measureTime(() =>
        collaborationService.getComments('policy-perf', 'version-perf')
      );

      expect(result).toHaveLength(200);
      expect(durationMs).toBeLessThan(COMMENT_THRESHOLD_MS);
    });

    it('should handle empty comment set gracefully within 300ms', async () => {
      mockGetCommentsQuery([], [], []);

      const { result, durationMs } = await measureTime(() =>
        collaborationService.getComments('policy-perf', 'version-perf')
      );

      expect(result).toHaveLength(0);
      expect(durationMs).toBeLessThan(COMMENT_THRESHOLD_MS);
    });
  });

  describe('filterComments performance with large datasets', () => {
    function mockFilterQuery(comments: any[], replies: any[], authors: any[]) {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'comments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({ data: comments, error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'comment_replies') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: replies, error: null }),
              }),
            }),
          };
        }
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: authors, error: null }),
            }),
          };
        }
        return {};
      });
    }

    it('should filter by resolved status from 100 comments within 300ms', async () => {
      // Supabase handles filtering; we get back the filtered set
      const unresolvedComments = generateMockComments(60).map(c => ({ ...c, resolved: false }));
      const replies = generateMockReplies(unresolvedComments);
      const authors = generateMockAuthors(10);
      mockFilterQuery(unresolvedComments, replies, authors);

      const { result, durationMs } = await measureTime(() =>
        collaborationService.filterComments('policy-perf', { resolved: false })
      );

      expect(result.length).toBe(60);
      expect(durationMs).toBeLessThan(COMMENT_THRESHOLD_MS);
    });

    it('should filter by author from 100 comments within 300ms', async () => {
      const authorComments = generateMockComments(25).map(c => ({ ...c, author_id: 'user-5' }));
      const replies = generateMockReplies(authorComments);
      const authors = generateMockAuthors(10);
      mockFilterQuery(authorComments, replies, authors);

      const { result, durationMs } = await measureTime(() =>
        collaborationService.filterComments('policy-perf', { author: 'user-5' })
      );

      expect(result.length).toBe(25);
      expect(durationMs).toBeLessThan(COMMENT_THRESHOLD_MS);
    });

    it('should filter by date range from 100 comments within 300ms', async () => {
      const recentComments = generateMockComments(40);
      const replies = generateMockReplies(recentComments);
      const authors = generateMockAuthors(10);

      // For date range filtering, the Supabase mock chain is different
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'comments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  lte: vi.fn().mockReturnValue({
                    order: vi.fn().mockReturnValue({
                      order: vi.fn().mockResolvedValue({ data: recentComments, error: null }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'comment_replies') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: replies, error: null }),
              }),
            }),
          };
        }
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: authors, error: null }),
            }),
          };
        }
        return {};
      });

      const { result, durationMs } = await measureTime(() =>
        collaborationService.filterComments('policy-perf', {
          dateRange: {
            start: new Date(Date.now() - 86400000),
            end: new Date(),
          },
        })
      );

      expect(result.length).toBe(40);
      expect(durationMs).toBeLessThan(COMMENT_THRESHOLD_MS);
    });

    it('should handle empty filter results within 300ms', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'comments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({ data: [], error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      const { result, durationMs } = await measureTime(() =>
        collaborationService.filterComments('policy-perf', { resolved: true })
      );

      expect(result).toHaveLength(0);
      expect(durationMs).toBeLessThan(COMMENT_THRESHOLD_MS);
    });
  });

  describe('threaded reply loading performance', () => {
    it('should build 50 threads with multiple replies within 300ms', async () => {
      const comments = generateMockComments(50);
      const replies = generateMockReplies(comments, 5); // 5 replies per comment
      const authors = generateMockAuthors(15);

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'comments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({ data: comments, error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'comment_replies') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: replies, error: null }),
              }),
            }),
          };
        }
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: authors, error: null }),
            }),
          };
        }
        return {};
      });

      const { result, durationMs } = await measureTime(() =>
        collaborationService.getComments('policy-perf', 'version-perf')
      );

      expect(result).toHaveLength(50);
      // Verify threads have replies correctly associated
      const threadsWithReplies = result.filter(t => t.replies.length > 0);
      expect(threadsWithReplies.length).toBeGreaterThan(0);
      // Each reply should reference its parent comment
      for (const thread of threadsWithReplies) {
        for (const reply of thread.replies) {
          expect(reply.commentId).toBe(thread.comment.id);
        }
      }
      expect(durationMs).toBeLessThan(COMMENT_THRESHOLD_MS);
    });

    it('should handle threads with 0 replies efficiently', async () => {
      const comments = generateMockComments(75);
      const authors = generateMockAuthors(10);

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'comments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({ data: comments, error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'comment_replies') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: authors, error: null }),
            }),
          };
        }
        return {};
      });

      const { result, durationMs } = await measureTime(() =>
        collaborationService.getComments('policy-perf', 'version-perf')
      );

      expect(result).toHaveLength(75);
      for (const thread of result) {
        expect(thread.replies).toHaveLength(0);
      }
      expect(durationMs).toBeLessThan(COMMENT_THRESHOLD_MS);
    });
  });

  describe('countUnresolved performance', () => {
    it('should count unresolved comments from 100+ comments within 300ms', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 67, error: null }),
          }),
        }),
      });

      const { result, durationMs } = await measureTime(() =>
        collaborationService.countUnresolved('policy-perf')
      );

      expect(result).toBe(67);
      expect(durationMs).toBeLessThan(COMMENT_THRESHOLD_MS);
    });

    it('should handle zero unresolved comments within 300ms', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
          }),
        }),
      });

      const { result, durationMs } = await measureTime(() =>
        collaborationService.countUnresolved('policy-perf')
      );

      expect(result).toBe(0);
      expect(durationMs).toBeLessThan(COMMENT_THRESHOLD_MS);
    });

    it('should count unresolved across repeated calls without degradation', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 42, error: null }),
          }),
        }),
      });

      const durations: number[] = [];
      for (let i = 0; i < 5; i++) {
        const { durationMs } = await measureTime(() =>
          collaborationService.countUnresolved('policy-perf')
        );
        durations.push(durationMs);
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      expect(avgDuration).toBeLessThan(COMMENT_THRESHOLD_MS);
      for (const d of durations) {
        expect(d).toBeLessThan(COMMENT_THRESHOLD_MS);
      }
    });
  });

  describe('migrateComments across versions performance', () => {
    it('should migrate 50+ comments to a new version within 300ms', async () => {
      const oldComments = generateMockComments(60, 'policy-perf', 'old-version');

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'comments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: oldComments, error: null }),
            }),
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return {};
      });

      const { durationMs } = await measureTime(() =>
        collaborationService.migrateComments('old-version', 'new-version')
      );

      expect(durationMs).toBeLessThan(COMMENT_THRESHOLD_MS);
    });

    it('should migrate 150 comments to a new version within 300ms', async () => {
      const oldComments = generateMockComments(150, 'policy-perf', 'old-version');

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'comments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: oldComments, error: null }),
            }),
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return {};
      });

      const { durationMs } = await measureTime(() =>
        collaborationService.migrateComments('old-version', 'new-version')
      );

      expect(durationMs).toBeLessThan(COMMENT_THRESHOLD_MS);
    });

    it('should handle migration with no comments gracefully within 300ms', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'comments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        return {};
      });

      const { durationMs } = await measureTime(() =>
        collaborationService.migrateComments('old-version', 'new-version')
      );

      expect(durationMs).toBeLessThan(COMMENT_THRESHOLD_MS);
    });
  });

  describe('data mapping efficiency at scale', () => {
    it('should map and build threads without degradation across iterations', async () => {
      const comments = generateMockComments(75);
      const replies = generateMockReplies(comments);
      const authors = generateMockAuthors(10);

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'comments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({ data: comments, error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'comment_replies') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: replies, error: null }),
              }),
            }),
          };
        }
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: authors, error: null }),
            }),
          };
        }
        return {};
      });

      const durations: number[] = [];
      for (let i = 0; i < 5; i++) {
        const { durationMs } = await measureTime(() =>
          collaborationService.getComments('policy-perf', 'version-perf')
        );
        durations.push(durationMs);
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      expect(avgDuration).toBeLessThan(COMMENT_THRESHOLD_MS);
      for (const d of durations) {
        expect(d).toBeLessThan(COMMENT_THRESHOLD_MS);
      }
    });
  });
});
