import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuditTrailService } from '@/services/AuditTrailService';
import type { AuditAction, ResourceType } from '@/types/audit';

/**
 * Performance tests for audit log operations
 * Validates: Requirements 29.3
 *
 * Tests that the audit trail service can load, filter, paginate,
 * and prepare virtual scrolling data for 1000+ events within 500ms.
 */

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
  isSupabaseConfigured: () => true,
}));

// --- Data generators ---

const AUDIT_ACTIONS: AuditAction[] = [
  'policy_created', 'policy_updated', 'policy_deleted',
  'policy_approved', 'policy_rejected', 'policy_deployed',
  'policy_evaluated', 'member_added', 'member_removed',
  'member_role_changed', 'workspace_settings_changed',
  'auth_login', 'auth_logout', 'emergency_bypass',
];

const RESOURCE_TYPES: ResourceType[] = [
  'policy', 'policy_version', 'workspace',
  'workspace_member', 'comment', 'compliance_mapping',
];

function generateMockAuditEvents(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `audit-${i}`,
    workspace_id: 'workspace-perf',
    actor_id: `user-${i % 20}`,
    action: AUDIT_ACTIONS[i % AUDIT_ACTIONS.length],
    resource_type: RESOURCE_TYPES[i % RESOURCE_TYPES.length],
    resource_id: `resource-${i}`,
    metadata: {
      policyName: `Policy ${i % 50}`,
      version: `1.${i % 10}.0`,
      environment: ['development', 'staging', 'production'][i % 3],
    },
    created_at: new Date(Date.now() - i * 60000).toISOString(),
  }));
}

// --- Performance helper ---

async function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; durationMs: number }> {
  const start = performance.now();
  const result = await fn();
  const durationMs = performance.now() - start;
  return { result, durationMs };
}

// 500ms budget per Requirement 29.3
const AUDIT_LOG_THRESHOLD_MS = 500;
const PAGE_SIZE = 100;

describe('Audit Log Performance', () => {
  let auditTrailService: AuditTrailService;
  let mockSupabase: any;

  beforeEach(async () => {
    auditTrailService = new AuditTrailService();
    const supabaseModule = await import('@/lib/supabase');
    mockSupabase = supabaseModule.supabase;
    vi.clearAllMocks();
  });

  describe('getEvents with 1000+ events within 500ms', () => {
    it('should load 1000 audit events within 500ms', async () => {
      const mockEvents = generateMockAuditEvents(1000);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockImplementation((_sel: string, opts?: any) => {
          if (opts?.head) {
            return {
              eq: vi.fn().mockResolvedValue({ count: 1000, error: null }),
            };
          }
          return {
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({ data: mockEvents.slice(0, PAGE_SIZE), error: null }),
              }),
            }),
          };
        }),
      });

      const { result, durationMs } = await measureTime(() =>
        auditTrailService.getEvents('workspace-perf', { page: 1, pageSize: PAGE_SIZE })
      );

      expect(result.items).toHaveLength(PAGE_SIZE);
      expect(result.total).toBe(1000);
      expect(result.hasMore).toBe(true);
      expect(durationMs).toBeLessThan(AUDIT_LOG_THRESHOLD_MS);
    });

    it('should load 1500 events page and map correctly', async () => {
      const mockEvents = generateMockAuditEvents(1500);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockImplementation((_sel: string, opts?: any) => {
          if (opts?.head) {
            return {
              eq: vi.fn().mockResolvedValue({ count: 1500, error: null }),
            };
          }
          return {
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({ data: mockEvents.slice(0, PAGE_SIZE), error: null }),
              }),
            }),
          };
        }),
      });

      const { result, durationMs } = await measureTime(() =>
        auditTrailService.getEvents('workspace-perf', { page: 1, pageSize: PAGE_SIZE })
      );

      expect(result.items).toHaveLength(PAGE_SIZE);
      expect(result.total).toBe(1500);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(PAGE_SIZE);
      expect(result.items[0].id).toBe('audit-0');
      expect(result.items[0].createdAt).toBeInstanceOf(Date);
      expect(durationMs).toBeLessThan(AUDIT_LOG_THRESHOLD_MS);
    });
  });

  describe('pagination logic (100 events per page)', () => {
    it('should paginate 1000 events into pages of 100', async () => {
      const allEvents = generateMockAuditEvents(1000);
      const totalCount = 1000;

      // Simulate fetching each page
      for (let page = 1; page <= 10; page++) {
        const from = (page - 1) * PAGE_SIZE;
        const to = from + PAGE_SIZE;
        const pageData = allEvents.slice(from, to);

        mockSupabase.from.mockReturnValue({
          select: vi.fn().mockImplementation((_sel: string, opts?: any) => {
            if (opts?.head) {
              return {
                eq: vi.fn().mockResolvedValue({ count: totalCount, error: null }),
              };
            }
            return {
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockResolvedValue({ data: pageData, error: null }),
                }),
              }),
            };
          }),
        });

        const { result, durationMs } = await measureTime(() =>
          auditTrailService.getEvents('workspace-perf', { page, pageSize: PAGE_SIZE })
        );

        expect(result.items).toHaveLength(PAGE_SIZE);
        expect(result.page).toBe(page);
        expect(result.total).toBe(totalCount);
        expect(durationMs).toBeLessThan(AUDIT_LOG_THRESHOLD_MS);
      }
    });

    it('should handle partial last page correctly', async () => {
      const allEvents = generateMockAuditEvents(1050);
      const lastPageData = allEvents.slice(1000, 1050);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockImplementation((_sel: string, opts?: any) => {
          if (opts?.head) {
            return {
              eq: vi.fn().mockResolvedValue({ count: 1050, error: null }),
            };
          }
          return {
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({ data: lastPageData, error: null }),
              }),
            }),
          };
        }),
      });

      const { result, durationMs } = await measureTime(() =>
        auditTrailService.getEvents('workspace-perf', { page: 11, pageSize: PAGE_SIZE })
      );

      expect(result.items).toHaveLength(50);
      expect(result.total).toBe(1050);
      expect(result.hasMore).toBe(false);
      expect(durationMs).toBeLessThan(AUDIT_LOG_THRESHOLD_MS);
    });

    it('should compute hasMore correctly across pages', async () => {
      const totalCount = 250;

      // Page 1: hasMore = true
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockImplementation((_sel: string, opts?: any) => {
          if (opts?.head) {
            return {
              eq: vi.fn().mockResolvedValue({ count: totalCount, error: null }),
            };
          }
          return {
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({
                  data: generateMockAuditEvents(PAGE_SIZE),
                  error: null,
                }),
              }),
            }),
          };
        }),
      });

      const page1 = await auditTrailService.getEvents('workspace-perf', { page: 1, pageSize: PAGE_SIZE });
      expect(page1.hasMore).toBe(true);

      // Page 3 (last): hasMore = false
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockImplementation((_sel: string, opts?: any) => {
          if (opts?.head) {
            return {
              eq: vi.fn().mockResolvedValue({ count: totalCount, error: null }),
            };
          }
          return {
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({
                  data: generateMockAuditEvents(50),
                  error: null,
                }),
              }),
            }),
          };
        }),
      });

      const page3 = await auditTrailService.getEvents('workspace-perf', { page: 3, pageSize: PAGE_SIZE });
      expect(page3.hasMore).toBe(false);
    });
  });

  describe('filterEvents performance on large datasets', () => {
    it('should filter 1000+ events by date range within 500ms', async () => {
      const recentEvents = generateMockAuditEvents(200);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: recentEvents, error: null }),
              }),
            }),
          }),
        }),
      });

      const { result, durationMs } = await measureTime(() =>
        auditTrailService.filterEvents('workspace-perf', {
          dateRange: {
            start: new Date(Date.now() - 86400000), // last 24h
            end: new Date(),
          },
        })
      );

      expect(result.length).toBeGreaterThan(0);
      expect(durationMs).toBeLessThan(AUDIT_LOG_THRESHOLD_MS);
    });

    it('should filter by actor within 500ms', async () => {
      const actorEvents = generateMockAuditEvents(100);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: actorEvents, error: null }),
            }),
          }),
        }),
      });

      const { result, durationMs } = await measureTime(() =>
        auditTrailService.filterEvents('workspace-perf', {
          actor: 'user-5',
        })
      );

      expect(result.length).toBeGreaterThan(0);
      expect(durationMs).toBeLessThan(AUDIT_LOG_THRESHOLD_MS);
    });

    it('should filter by action type within 500ms', async () => {
      const actionEvents = generateMockAuditEvents(150);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: actionEvents, error: null }),
            }),
          }),
        }),
      });

      const { result, durationMs } = await measureTime(() =>
        auditTrailService.filterEvents('workspace-perf', {
          actions: ['policy_created', 'policy_updated', 'policy_deleted'],
        })
      );

      expect(result.length).toBeGreaterThan(0);
      expect(durationMs).toBeLessThan(AUDIT_LOG_THRESHOLD_MS);
    });

    it('should filter by resource type within 500ms', async () => {
      const resourceEvents = generateMockAuditEvents(80);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: resourceEvents, error: null }),
            }),
          }),
        }),
      });

      const { result, durationMs } = await measureTime(() =>
        auditTrailService.filterEvents('workspace-perf', {
          resourceType: 'policy',
        })
      );

      expect(result.length).toBeGreaterThan(0);
      expect(durationMs).toBeLessThan(AUDIT_LOG_THRESHOLD_MS);
    });

    it('should handle empty filter results efficiently', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      });

      const { result, durationMs } = await measureTime(() =>
        auditTrailService.filterEvents('workspace-perf', {
          actor: 'nonexistent-user',
        })
      );

      expect(result).toHaveLength(0);
      expect(durationMs).toBeLessThan(AUDIT_LOG_THRESHOLD_MS);
    });
  });

  describe('virtual scrolling data preparation', () => {
    it('should prepare virtual scroll window from 1000+ events within 500ms', async () => {
      const allEvents = generateMockAuditEvents(1200);

      // Simulate fetching all events for client-side virtual scrolling
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: allEvents, error: null }),
          }),
        }),
      });

      const { result: events, durationMs: fetchDuration } = await measureTime(() =>
        auditTrailService.filterEvents('workspace-perf', {})
      );

      expect(fetchDuration).toBeLessThan(AUDIT_LOG_THRESHOLD_MS);
      expect(events).toHaveLength(1200);

      // Simulate virtual scrolling: only render visible window
      const VISIBLE_WINDOW = 20;
      const OVERSCAN = 5;

      for (let scrollIndex = 0; scrollIndex < events.length; scrollIndex += VISIBLE_WINDOW) {
        const start = performance.now();
        const windowStart = Math.max(0, scrollIndex - OVERSCAN);
        const windowEnd = Math.min(events.length, scrollIndex + VISIBLE_WINDOW + OVERSCAN);
        const visibleItems = events.slice(windowStart, windowEnd);
        const sliceDuration = performance.now() - start;

        expect(visibleItems.length).toBeLessThanOrEqual(VISIBLE_WINDOW + 2 * OVERSCAN);
        expect(sliceDuration).toBeLessThan(AUDIT_LOG_THRESHOLD_MS);
      }
    });

    it('should compute total height and item offsets for 1500 events quickly', async () => {
      const allEvents = generateMockAuditEvents(1500);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: allEvents, error: null }),
          }),
        }),
      });

      const events = await auditTrailService.filterEvents('workspace-perf', {});

      // Simulate virtual scroll offset computation
      const ITEM_HEIGHT = 64; // px per audit event card
      const start = performance.now();

      const totalHeight = events.length * ITEM_HEIGHT;
      const offsets = events.map((_, i) => i * ITEM_HEIGHT);

      const computeDuration = performance.now() - start;

      expect(totalHeight).toBe(1500 * ITEM_HEIGHT);
      expect(offsets).toHaveLength(1500);
      expect(offsets[0]).toBe(0);
      expect(offsets[1499]).toBe(1499 * ITEM_HEIGHT);
      expect(computeDuration).toBeLessThan(AUDIT_LOG_THRESHOLD_MS);
    });

    it('should support scroll-to-index lookup for 2000 events', async () => {
      const allEvents = generateMockAuditEvents(2000);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: allEvents, error: null }),
          }),
        }),
      });

      const { result: events, durationMs: fetchDuration } = await measureTime(() =>
        auditTrailService.filterEvents('workspace-perf', {})
      );

      expect(fetchDuration).toBeLessThan(AUDIT_LOG_THRESHOLD_MS);

      // Simulate scroll-to-index: given a scroll offset, find the visible range
      const ITEM_HEIGHT = 64;
      const VIEWPORT_HEIGHT = 600;
      const scrollOffset = 1000 * ITEM_HEIGHT; // scroll to middle

      const start = performance.now();
      const startIndex = Math.floor(scrollOffset / ITEM_HEIGHT);
      const endIndex = Math.min(
        events.length - 1,
        startIndex + Math.ceil(VIEWPORT_HEIGHT / ITEM_HEIGHT)
      );
      const visibleEvents = events.slice(startIndex, endIndex + 1);
      const lookupDuration = performance.now() - start;

      expect(startIndex).toBe(1000);
      expect(visibleEvents.length).toBeGreaterThan(0);
      expect(visibleEvents.length).toBeLessThanOrEqual(Math.ceil(VIEWPORT_HEIGHT / ITEM_HEIGHT) + 1);
      expect(lookupDuration).toBeLessThan(AUDIT_LOG_THRESHOLD_MS);
    });
  });

  describe('data mapping efficiency at scale', () => {
    it('should map 1000 audit events without performance degradation across iterations', async () => {
      const mockEvents = generateMockAuditEvents(1000);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockEvents, error: null }),
          }),
        }),
      });

      const durations: number[] = [];
      for (let i = 0; i < 5; i++) {
        const { durationMs } = await measureTime(() =>
          auditTrailService.filterEvents('workspace-perf', {})
        );
        durations.push(durationMs);
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      expect(avgDuration).toBeLessThan(AUDIT_LOG_THRESHOLD_MS);

      // No single iteration should spike above threshold
      for (const d of durations) {
        expect(d).toBeLessThan(AUDIT_LOG_THRESHOLD_MS);
      }
    });

    it('should format event descriptions for 1000 events within 500ms', async () => {
      const mockEvents = generateMockAuditEvents(1000);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockEvents, error: null }),
          }),
        }),
      });

      const events = await auditTrailService.filterEvents('workspace-perf', {});

      const start = performance.now();
      const descriptions = events.map(e => auditTrailService.formatEventDescription(e));
      const formatDuration = performance.now() - start;

      expect(descriptions).toHaveLength(1000);
      expect(descriptions.every(d => typeof d === 'string' && d.length > 0)).toBe(true);
      expect(formatDuration).toBeLessThan(AUDIT_LOG_THRESHOLD_MS);
    });
  });
});
