// Unit tests for CollaborationService
// Requirements: 6.1-6.10
// Task 7.1.4: Test comment threading, @mentions, resolution, real-time sync

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CollaborationService } from '@/services/CollaborationService';
import type { Comment } from '@/types/comment';

// --- Supabase mock infrastructure ---

const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom };

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

// Helper: build a chainable query builder with sensible defaults
function chain(overrides: Record<string, any> = {}) {
  const self: any = {};
  const methods = [
    'select', 'insert', 'update', 'delete',
    'eq', 'in', 'gte', 'lte', 'or',
    'order', 'single',
  ];
  for (const m of methods) {
    self[m] = vi.fn(() => self);
  }
  // Apply overrides last so they win
  Object.assign(self, overrides);
  return self;
}

// Timestamps used across tests
const now = new Date().toISOString();

// Reusable row factories
function makeCommentRow(overrides: Record<string, any> = {}) {
  return {
    id: 'comment-1',
    policy_id: 'policy-1',
    version_id: 'version-1',
    line_number: 10,
    content: 'Looks good',
    author_id: 'user-1',
    resolved: false,
    mentions: [],
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function makeReplyRow(overrides: Record<string, any> = {}) {
  return {
    id: 'reply-1',
    comment_id: 'comment-1',
    content: 'Thanks!',
    author_id: 'user-2',
    created_at: now,
    ...overrides,
  };
}

function makeUserRow(overrides: Record<string, any> = {}) {
  return {
    id: 'user-1',
    github_id: 'gh-user-1',
    username: 'testuser',
    email: 'test@example.com',
    avatar_url: 'https://github.com/testuser.png',
    ...overrides,
  };
}

describe('CollaborationService', () => {
  let service: CollaborationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CollaborationService('http://localhost:54321', 'test-key');
  });

  // ─── addComment ──────────────────────────────────────────────────

  describe('addComment', () => {
    it('should create a comment and return mapped result', async () => {
      const row = makeCommentRow();

      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          // resolveMentions — no mentions so returns empty
          return chain({
            select: vi.fn(() => chain({
              in: vi.fn(() => ({ data: [], error: null })),
            })),
          });
        }
        if (table === 'comments') {
          return chain({
            insert: vi.fn(() => chain({
              select: vi.fn(() => chain({
                single: vi.fn().mockResolvedValue({ data: row, error: null }),
              })),
            })),
          });
        }
        return chain();
      });

      const result = await service.addComment('policy-1', 'version-1', 10, 'Looks good', 'user-1');

      expect(result.id).toBe('comment-1');
      expect(result.policyId).toBe('policy-1');
      expect(result.lineNumber).toBe(10);
      expect(result.content).toBe('Looks good');
      expect(result.resolved).toBe(false);
    });

    it('should extract @mentions and resolve user IDs', async () => {
      const row = makeCommentRow({ content: 'Hey @alice @bob check this', mentions: ['uid-alice', 'uid-bob'] });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return chain({
            select: vi.fn(() => chain({
              in: vi.fn(() => ({
                data: [{ id: 'uid-alice' }, { id: 'uid-bob' }],
                error: null,
              })),
            })),
          });
        }
        if (table === 'comments') {
          return chain({
            insert: vi.fn(() => chain({
              select: vi.fn(() => chain({
                single: vi.fn().mockResolvedValue({ data: row, error: null }),
              })),
            })),
          });
        }
        return chain();
      });

      const result = await service.addComment('policy-1', 'version-1', 5, 'Hey @alice @bob check this', 'user-1');

      expect(result.mentions).toEqual(['uid-alice', 'uid-bob']);
    });

    it('should throw when insert fails', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return chain({
            select: vi.fn(() => chain({
              in: vi.fn(() => ({ data: [], error: null })),
            })),
          });
        }
        if (table === 'comments') {
          return chain({
            insert: vi.fn(() => chain({
              select: vi.fn(() => chain({
                single: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
              })),
            })),
          });
        }
        return chain();
      });

      await expect(
        service.addComment('policy-1', 'version-1', 1, 'test', 'user-1')
      ).rejects.toThrow('Failed to add comment: DB error');
    });
  });

  // ─── addReply ───────────────────────────────────────────────────

  describe('addReply', () => {
    it('should create a reply and return mapped result', async () => {
      const row = makeReplyRow();

      mockFrom.mockReturnValue(
        chain({
          insert: vi.fn(() => chain({
            select: vi.fn(() => chain({
              single: vi.fn().mockResolvedValue({ data: row, error: null }),
            })),
          })),
        })
      );

      const result = await service.addReply('comment-1', 'Thanks!', 'user-2');

      expect(result.id).toBe('reply-1');
      expect(result.commentId).toBe('comment-1');
      expect(result.content).toBe('Thanks!');
      expect(result.authorId).toBe('user-2');
    });

    it('should throw when reply insert fails', async () => {
      mockFrom.mockReturnValue(
        chain({
          insert: vi.fn(() => chain({
            select: vi.fn(() => chain({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Insert failed' } }),
            })),
          })),
        })
      );

      await expect(
        service.addReply('comment-1', 'reply', 'user-2')
      ).rejects.toThrow('Failed to add reply: Insert failed');
    });
  });

  // ─── resolveComment / reopenComment ────────────────────────────

  describe('resolveComment', () => {
    it('should update comment to resolved', async () => {
      const mockUpdate = vi.fn(() => chain({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }));

      mockFrom.mockReturnValue(chain({ update: mockUpdate }));

      await service.resolveComment('comment-1');

      expect(mockFrom).toHaveBeenCalledWith('comments');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ resolved: true })
      );
    });

    it('should throw when resolve fails', async () => {
      mockFrom.mockReturnValue(
        chain({
          update: vi.fn(() => chain({
            eq: vi.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
          })),
        })
      );

      await expect(service.resolveComment('comment-1')).rejects.toThrow('Failed to resolve comment');
    });
  });

  describe('reopenComment', () => {
    it('should update comment to unresolved', async () => {
      const mockUpdate = vi.fn(() => chain({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }));

      mockFrom.mockReturnValue(chain({ update: mockUpdate }));

      await service.reopenComment('comment-1');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ resolved: false })
      );
    });

    it('should throw when reopen fails', async () => {
      mockFrom.mockReturnValue(
        chain({
          update: vi.fn(() => chain({
            eq: vi.fn().mockResolvedValue({ error: { message: 'Reopen failed' } }),
          })),
        })
      );

      await expect(service.reopenComment('comment-1')).rejects.toThrow('Failed to reopen comment');
    });
  });

  // ─── getComments ────────────────────────────────────────────────

  describe('getComments', () => {
    it('should return comment threads with replies and authors', async () => {
      const commentRow = makeCommentRow();
      const replyRow = makeReplyRow();
      const authorRow = makeUserRow();
      const replyAuthorRow = makeUserRow({ id: 'user-2', username: 'replier', github_id: 'gh-replier' });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'comments') {
          return chain({
            select: vi.fn(() => chain({
              eq: vi.fn(() => chain({
                eq: vi.fn(() => chain({
                  order: vi.fn(() => chain({
                    order: vi.fn().mockResolvedValue({ data: [commentRow], error: null }),
                  })),
                })),
              })),
            })),
          });
        }
        if (table === 'comment_replies') {
          return chain({
            select: vi.fn(() => chain({
              in: vi.fn(() => chain({
                order: vi.fn().mockResolvedValue({ data: [replyRow], error: null }),
              })),
            })),
          });
        }
        if (table === 'users') {
          return chain({
            select: vi.fn(() => chain({
              in: vi.fn().mockResolvedValue({ data: [authorRow, replyAuthorRow], error: null }),
            })),
          });
        }
        return chain();
      });

      const threads = await service.getComments('policy-1', 'version-1');

      expect(threads).toHaveLength(1);
      expect(threads[0].comment.id).toBe('comment-1');
      expect(threads[0].replies).toHaveLength(1);
      expect(threads[0].replies[0].id).toBe('reply-1');
      expect(threads[0].author.username).toBe('testuser');
      expect(threads[0].replyAuthors).toHaveLength(1);
    });

    it('should return empty array when no comments exist', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'comments') {
          return chain({
            select: vi.fn(() => chain({
              eq: vi.fn(() => chain({
                eq: vi.fn(() => chain({
                  order: vi.fn(() => chain({
                    order: vi.fn().mockResolvedValue({ data: [], error: null }),
                  })),
                })),
              })),
            })),
          });
        }
        return chain();
      });

      const threads = await service.getComments('policy-1', 'version-1');
      expect(threads).toEqual([]);
    });

    it('should throw when fetching comments fails', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'comments') {
          return chain({
            select: vi.fn(() => chain({
              eq: vi.fn(() => chain({
                eq: vi.fn(() => chain({
                  order: vi.fn(() => chain({
                    order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Fetch error' } }),
                  })),
                })),
              })),
            })),
          });
        }
        return chain();
      });

      await expect(service.getComments('policy-1', 'version-1')).rejects.toThrow('Failed to fetch comments');
    });

    it('should throw when fetching replies fails', async () => {
      const commentRow = makeCommentRow();

      mockFrom.mockImplementation((table: string) => {
        if (table === 'comments') {
          return chain({
            select: vi.fn(() => chain({
              eq: vi.fn(() => chain({
                eq: vi.fn(() => chain({
                  order: vi.fn(() => chain({
                    order: vi.fn().mockResolvedValue({ data: [commentRow], error: null }),
                  })),
                })),
              })),
            })),
          });
        }
        if (table === 'comment_replies') {
          return chain({
            select: vi.fn(() => chain({
              in: vi.fn(() => chain({
                order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Replies error' } }),
              })),
            })),
          });
        }
        return chain();
      });

      await expect(service.getComments('policy-1', 'version-1')).rejects.toThrow('Failed to fetch replies');
    });
  });

  // ─── filterComments ─────────────────────────────────────────────

  describe('filterComments', () => {
    it('should filter by resolved status', async () => {
      const resolvedComment = makeCommentRow({ id: 'c-resolved', resolved: true });
      const authorRow = makeUserRow();

      mockFrom.mockImplementation((table: string) => {
        if (table === 'comments') {
          return chain({
            select: vi.fn(() => chain({
              eq: vi.fn(() => chain({
                eq: vi.fn(() => chain({
                  order: vi.fn(() => chain({
                    order: vi.fn().mockResolvedValue({ data: [resolvedComment], error: null }),
                  })),
                })),
              })),
            })),
          });
        }
        if (table === 'comment_replies') {
          return chain({
            select: vi.fn(() => chain({
              in: vi.fn(() => chain({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              })),
            })),
          });
        }
        if (table === 'users') {
          return chain({
            select: vi.fn(() => chain({
              in: vi.fn().mockResolvedValue({ data: [authorRow], error: null }),
            })),
          });
        }
        return chain();
      });

      const threads = await service.filterComments('policy-1', { resolved: true });

      expect(threads).toHaveLength(1);
      expect(threads[0].comment.resolved).toBe(true);
    });

    it('should filter by author', async () => {
      const commentRow = makeCommentRow({ author_id: 'user-42' });
      const authorRow = makeUserRow({ id: 'user-42', username: 'author42' });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'comments') {
          return chain({
            select: vi.fn(() => chain({
              eq: vi.fn(() => chain({
                eq: vi.fn(() => chain({
                  order: vi.fn(() => chain({
                    order: vi.fn().mockResolvedValue({ data: [commentRow], error: null }),
                  })),
                })),
              })),
            })),
          });
        }
        if (table === 'comment_replies') {
          return chain({
            select: vi.fn(() => chain({
              in: vi.fn(() => chain({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              })),
            })),
          });
        }
        if (table === 'users') {
          return chain({
            select: vi.fn(() => chain({
              in: vi.fn().mockResolvedValue({ data: [authorRow], error: null }),
            })),
          });
        }
        return chain();
      });

      const threads = await service.filterComments('policy-1', { author: 'user-42' });

      expect(threads).toHaveLength(1);
      expect(threads[0].comment.authorId).toBe('user-42');
    });

    it('should filter by date range', async () => {
      const commentRow = makeCommentRow();
      const authorRow = makeUserRow();

      mockFrom.mockImplementation((table: string) => {
        if (table === 'comments') {
          return chain({
            select: vi.fn(() => chain({
              eq: vi.fn(() => chain({
                gte: vi.fn(() => chain({
                  lte: vi.fn(() => chain({
                    order: vi.fn(() => chain({
                      order: vi.fn().mockResolvedValue({ data: [commentRow], error: null }),
                    })),
                  })),
                })),
              })),
            })),
          });
        }
        if (table === 'comment_replies') {
          return chain({
            select: vi.fn(() => chain({
              in: vi.fn(() => chain({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              })),
            })),
          });
        }
        if (table === 'users') {
          return chain({
            select: vi.fn(() => chain({
              in: vi.fn().mockResolvedValue({ data: [authorRow], error: null }),
            })),
          });
        }
        return chain();
      });

      const threads = await service.filterComments('policy-1', {
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2025-12-31'),
        },
      });

      expect(threads).toHaveLength(1);
    });

    it('should return empty array when no comments match filter', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'comments') {
          return chain({
            select: vi.fn(() => chain({
              eq: vi.fn(() => chain({
                eq: vi.fn(() => chain({
                  order: vi.fn(() => chain({
                    order: vi.fn().mockResolvedValue({ data: [], error: null }),
                  })),
                })),
              })),
            })),
          });
        }
        return chain();
      });

      const threads = await service.filterComments('policy-1', { resolved: true });
      expect(threads).toEqual([]);
    });

    it('should throw when filter query fails', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'comments') {
          return chain({
            select: vi.fn(() => chain({
              eq: vi.fn(() => chain({
                eq: vi.fn(() => chain({
                  order: vi.fn(() => chain({
                    order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Filter error' } }),
                  })),
                })),
              })),
            })),
          });
        }
        return chain();
      });

      await expect(
        service.filterComments('policy-1', { resolved: false })
      ).rejects.toThrow('Failed to filter comments');
    });
  });

  // ─── countUnresolved ────────────────────────────────────────────

  describe('countUnresolved', () => {
    it('should return count of unresolved comments', async () => {
      mockFrom.mockReturnValue(
        chain({
          select: vi.fn(() => chain({
            eq: vi.fn(() => chain({
              eq: vi.fn().mockResolvedValue({ count: 5, error: null }),
            })),
          })),
        })
      );

      const count = await service.countUnresolved('policy-1');
      expect(count).toBe(5);
    });

    it('should return 0 when no unresolved comments', async () => {
      mockFrom.mockReturnValue(
        chain({
          select: vi.fn(() => chain({
            eq: vi.fn(() => chain({
              eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
            })),
          })),
        })
      );

      const count = await service.countUnresolved('policy-1');
      expect(count).toBe(0);
    });

    it('should return 0 when count is null', async () => {
      mockFrom.mockReturnValue(
        chain({
          select: vi.fn(() => chain({
            eq: vi.fn(() => chain({
              eq: vi.fn().mockResolvedValue({ count: null, error: null }),
            })),
          })),
        })
      );

      const count = await service.countUnresolved('policy-1');
      expect(count).toBe(0);
    });

    it('should throw when count query fails', async () => {
      mockFrom.mockReturnValue(
        chain({
          select: vi.fn(() => chain({
            eq: vi.fn(() => chain({
              eq: vi.fn().mockResolvedValue({ count: null, error: { message: 'Count error' } }),
            })),
          })),
        })
      );

      await expect(service.countUnresolved('policy-1')).rejects.toThrow('Failed to count unresolved comments');
    });
  });

  // ─── notifyMentions ────────────────────────────────────────────

  describe('notifyMentions', () => {
    it('should log notification for mentioned users', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const comment: Comment = {
        id: 'comment-1',
        policyId: 'policy-1',
        versionId: 'version-1',
        lineNumber: 10,
        content: 'Hey @alice',
        authorId: 'user-1',
        resolved: false,
        mentions: ['uid-alice', 'uid-bob'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await service.notifyMentions(comment);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('uid-alice')
      );
      consoleSpy.mockRestore();
    });

    it('should not log when no mentions', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const comment: Comment = {
        id: 'comment-1',
        policyId: 'policy-1',
        versionId: 'version-1',
        lineNumber: 10,
        content: 'No mentions here',
        authorId: 'user-1',
        resolved: false,
        mentions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await service.notifyMentions(comment);

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  // ─── migrateComments ────────────────────────────────────────────

  describe('migrateComments', () => {
    it('should copy comments from old version to new version', async () => {
      const oldComments = [
        makeCommentRow({ id: 'c1', line_number: 5, content: 'First' }),
        makeCommentRow({ id: 'c2', line_number: 15, content: 'Second' }),
      ];

      const mockInsert = vi.fn().mockResolvedValue({ error: null });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'comments') {
          // First call: select old comments; second call: insert new
          return chain({
            select: vi.fn(() => chain({
              eq: vi.fn().mockResolvedValue({ data: oldComments, error: null }),
            })),
            insert: mockInsert,
          });
        }
        return chain();
      });

      await service.migrateComments('old-version', 'new-version');

      expect(mockInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            version_id: 'new-version',
            line_number: 5,
            content: 'First',
          }),
          expect.objectContaining({
            version_id: 'new-version',
            line_number: 15,
            content: 'Second',
          }),
        ])
      );
    });

    it('should do nothing when no comments exist on old version', async () => {
      mockFrom.mockReturnValue(
        chain({
          select: vi.fn(() => chain({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        })
      );

      // Should not throw
      await service.migrateComments('old-version', 'new-version');
    });

    it('should throw when fetching old comments fails', async () => {
      mockFrom.mockReturnValue(
        chain({
          select: vi.fn(() => chain({
            eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'Fetch old error' } }),
          })),
        })
      );

      await expect(
        service.migrateComments('old-version', 'new-version')
      ).rejects.toThrow('Failed to fetch old comments');
    });

    it('should throw when inserting migrated comments fails', async () => {
      const oldComments = [makeCommentRow()];

      mockFrom.mockImplementation((table: string) => {
        if (table === 'comments') {
          return chain({
            select: vi.fn(() => chain({
              eq: vi.fn().mockResolvedValue({ data: oldComments, error: null }),
            })),
            insert: vi.fn().mockResolvedValue({ error: { message: 'Insert migration error' } }),
          });
        }
        return chain();
      });

      await expect(
        service.migrateComments('old-version', 'new-version')
      ).rejects.toThrow('Failed to migrate comments');
    });

    it('should preserve resolved status during migration', async () => {
      const oldComments = [
        makeCommentRow({ id: 'c1', resolved: true }),
        makeCommentRow({ id: 'c2', resolved: false }),
      ];

      const mockInsert = vi.fn().mockResolvedValue({ error: null });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'comments') {
          return chain({
            select: vi.fn(() => chain({
              eq: vi.fn().mockResolvedValue({ data: oldComments, error: null }),
            })),
            insert: mockInsert,
          });
        }
        return chain();
      });

      await service.migrateComments('old-version', 'new-version');

      const insertedComments = mockInsert.mock.calls[0][0];
      expect(insertedComments[0].resolved).toBe(true);
      expect(insertedComments[1].resolved).toBe(false);
    });
  });

  // ─── Constructor ───────────────────────────────────────────────

  describe('constructor', () => {
    it('should throw when URL and key are missing', () => {
      // Temporarily clear env vars
      const origUrl = import.meta.env.VITE_SUPABASE_URL;
      const origKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      import.meta.env.VITE_SUPABASE_URL = '';
      import.meta.env.VITE_SUPABASE_ANON_KEY = '';

      expect(() => new CollaborationService('', '')).toThrow(
        'Supabase URL and anon key are required'
      );

      import.meta.env.VITE_SUPABASE_URL = origUrl;
      import.meta.env.VITE_SUPABASE_ANON_KEY = origKey;
    });
  });
});
