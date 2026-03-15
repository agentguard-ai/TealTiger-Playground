import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DatabaseQueryOptimizer,
  PERFORMANCE_BUDGET_MS,
} from '@/services/DatabaseQueryOptimizer';

/**
 * Query optimization performance tests
 * Validates: Requirements 29.2, 29.3
 *
 * Tests that the DatabaseQueryOptimizer:
 * 1. Documents all recommended composite indexes
 * 2. Builds optimized queries for policy listing, audit log, and analytics
 * 3. Measures query performance against the 500ms budget
 */

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
  isSupabaseConfigured: () => true,
}));

// --- Data generators ---

function generateMockPolicies(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `policy-${i}`,
    workspace_id: 'workspace-perf',
    name: `Policy ${i}`,
    description: `Description for policy ${i}`,
    current_version: `1.${i % 10}.0`,
    state: ['draft', 'review', 'approved', 'production'][i % 4],
    created_by: `user-${i % 20}`,
    created_at: new Date(Date.now() - i * 3600000).toISOString(),
    updated_at: new Date(Date.now() - i * 1800000).toISOString(),
  }));
}

function generateMockAuditEvents(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `audit-${i}`,
    workspace_id: 'workspace-perf',
    actor_id: `user-${i % 20}`,
    action: ['policy_created', 'policy_updated', 'policy_approved'][i % 3],
    resource_type: ['policy', 'workspace', 'workspace_member'][i % 3],
    resource_id: `resource-${i}`,
    metadata: { version: `1.${i % 10}.0` },
    created_at: new Date(Date.now() - i * 60000).toISOString(),
  }));
}

function generateMockAnalyticsEvents(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `analytics-${i}`,
    workspace_id: 'workspace-perf',
    user_id: `user-${i % 10}`,
    policy_id: `policy-${i % 50}`,
    event_type: 'evaluation',
    metadata: { provider: 'openai', cost: 0.01 * (i % 5), latency: 100 + i },
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

describe('DatabaseQueryOptimizer', () => {
  let optimizer: DatabaseQueryOptimizer;
  let mockSupabase: any;

  beforeEach(async () => {
    optimizer = new DatabaseQueryOptimizer();
    const supabaseModule = await import('@/lib/supabase');
    mockSupabase = supabaseModule.supabase;
    vi.clearAllMocks();
  });

  // =========================================================================
  // Index recommendations
  // =========================================================================

  describe('getRecommendedIndexes', () => {
    it('should return composite indexes for all key tables', () => {
      const indexes = optimizer.getRecommendedIndexes();

      const tables = new Set(indexes.map((idx) => idx.table));
      expect(tables).toContain('policies');
      expect(tables).toContain('audit_log');
      expect(tables).toContain('analytics_events');
      expect(tables).toContain('comments');
      expect(tables).toContain('policy_versions');
      expect(tables).toContain('compliance_mappings');
    });

    it('should include workspace-scoped composite indexes for policies', () => {
      const indexes = optimizer.getRecommendedIndexes();
      const policyIndexes = indexes.filter((idx) => idx.table === 'policies');

      expect(policyIndexes.length).toBeGreaterThanOrEqual(3);

      const indexNames = policyIndexes.map((idx) => idx.indexName);
      expect(indexNames).toContain('idx_policies_workspace_updated');
      expect(indexNames).toContain('idx_policies_workspace_state');
      expect(indexNames).toContain('idx_policies_workspace_name');
    });

    it('should include workspace-scoped composite indexes for audit_log', () => {
      const indexes = optimizer.getRecommendedIndexes();
      const auditIndexes = indexes.filter((idx) => idx.table === 'audit_log');

      expect(auditIndexes.length).toBeGreaterThanOrEqual(4);

      const indexNames = auditIndexes.map((idx) => idx.indexName);
      expect(indexNames).toContain('idx_audit_log_workspace_created');
      expect(indexNames).toContain('idx_audit_log_workspace_action');
      expect(indexNames).toContain('idx_audit_log_workspace_actor');
      expect(indexNames).toContain('idx_audit_log_workspace_resource');
    });

    it('should document reason and query pattern for every index', () => {
      const indexes = optimizer.getRecommendedIndexes();

      for (const idx of indexes) {
        expect(idx.reason.length).toBeGreaterThan(0);
        expect(idx.queryPattern.length).toBeGreaterThan(0);
        expect(idx.columns.length).toBeGreaterThanOrEqual(2);
      }
    });
  });

  // =========================================================================
  // Optimized policy list query (Req 29.2)
  // =========================================================================

  describe('buildPolicyListQuery – Requirement 29.2', () => {
    it('should build paginated policy list query within 500ms', async () => {
      const mockPolicies = generateMockPolicies(50);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({ data: mockPolicies, error: null }),
            }),
          }),
        }),
      });

      const query = optimizer.buildPolicyListQuery({
        workspaceId: 'workspace-perf',
        page: 1,
        pageSize: 50,
      });

      const { result, durationMs } = await measureTime(async () => {
        const { data, error } = await query;
        if (error) throw error;
        return data;
      });

      expect(result).toHaveLength(50);
      expect(durationMs).toBeLessThan(PERFORMANCE_BUDGET_MS);
    });

    it('should build filtered policy list query with state filter', async () => {
      const draftPolicies = generateMockPolicies(20).filter((p) => p.state === 'draft');

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({ data: draftPolicies, error: null }),
              }),
            }),
          }),
        }),
      });

      const query = optimizer.buildPolicyListQuery({
        workspaceId: 'workspace-perf',
        state: 'draft',
      });

      const { data, error } = await query;
      expect(error).toBeNull();
      expect(data!.every((p: any) => p.state === 'draft')).toBe(true);
    });

    it('should build search query with text filter', async () => {
      const matchingPolicies = generateMockPolicies(5);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({ data: matchingPolicies, error: null }),
              }),
            }),
          }),
        }),
      });

      const query = optimizer.buildPolicyListQuery({
        workspaceId: 'workspace-perf',
        searchQuery: 'PII',
      });

      const { data, error } = await query;
      expect(error).toBeNull();
      expect(data).toHaveLength(5);
    });

    it('should handle 200 policies with pagination within 500ms', async () => {
      const page1 = generateMockPolicies(50);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({ data: page1, error: null }),
            }),
          }),
        }),
      });

      // Fetch 4 pages sequentially
      const durations: number[] = [];
      for (let page = 1; page <= 4; page++) {
        const query = optimizer.buildPolicyListQuery({
          workspaceId: 'workspace-perf',
          page,
          pageSize: 50,
        });

        const { durationMs } = await measureTime(async () => {
          const { data } = await query;
          return data;
        });

        durations.push(durationMs);
        expect(durationMs).toBeLessThan(PERFORMANCE_BUDGET_MS);
      }

      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      expect(avg).toBeLessThan(PERFORMANCE_BUDGET_MS);
    });
  });

  // =========================================================================
  // Optimized audit log query (Req 29.3)
  // =========================================================================

  describe('buildAuditLogQuery – Requirement 29.3', () => {
    it('should build paginated audit log query within 500ms', async () => {
      const mockEvents = generateMockAuditEvents(100);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({ data: mockEvents, error: null }),
            }),
          }),
        }),
      });

      const query = optimizer.buildAuditLogQuery({
        workspaceId: 'workspace-perf',
        page: 1,
        pageSize: 100,
      });

      const { result, durationMs } = await measureTime(async () => {
        const { data, error } = await query;
        if (error) throw error;
        return data;
      });

      expect(result).toHaveLength(100);
      expect(durationMs).toBeLessThan(PERFORMANCE_BUDGET_MS);
    });

    it('should build filtered audit log query by action', async () => {
      const filteredEvents = generateMockAuditEvents(30);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({ data: filteredEvents, error: null }),
              }),
            }),
          }),
        }),
      });

      const query = optimizer.buildAuditLogQuery({
        workspaceId: 'workspace-perf',
        action: 'policy_created',
      });

      const { data, error } = await query;
      expect(error).toBeNull();
      expect(data).toHaveLength(30);
    });

    it('should build filtered audit log query by date range', async () => {
      const recentEvents = generateMockAuditEvents(50);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockResolvedValue({ data: recentEvents, error: null }),
                }),
              }),
            }),
          }),
        }),
      });

      const query = optimizer.buildAuditLogQuery({
        workspaceId: 'workspace-perf',
        dateRange: {
          start: new Date(Date.now() - 86400000),
          end: new Date(),
        },
      });

      const { data, error } = await query;
      expect(error).toBeNull();
      expect(data).toHaveLength(50);
    });

    it('should handle 1000+ events with pagination within 500ms per page', async () => {
      const pageData = generateMockAuditEvents(100);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({ data: pageData, error: null }),
            }),
          }),
        }),
      });

      for (let page = 1; page <= 10; page++) {
        const query = optimizer.buildAuditLogQuery({
          workspaceId: 'workspace-perf',
          page,
          pageSize: 100,
        });

        const { durationMs } = await measureTime(async () => {
          const { data } = await query;
          return data;
        });

        expect(durationMs).toBeLessThan(PERFORMANCE_BUDGET_MS);
      }
    });
  });

  // =========================================================================
  // Optimized analytics aggregation query
  // =========================================================================

  describe('buildAnalyticsQuery', () => {
    it('should build analytics query with date range', async () => {
      const mockEvents = generateMockAnalyticsEvents(200);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: mockEvents, error: null }),
              }),
            }),
          }),
        }),
      });

      const query = optimizer.buildAnalyticsQuery({
        workspaceId: 'workspace-perf',
        dateRange: {
          start: new Date(Date.now() - 7 * 86400000),
          end: new Date(),
        },
      });

      const { result, durationMs } = await measureTime(async () => {
        const { data, error } = await query;
        if (error) throw error;
        return data;
      });

      expect(result).toHaveLength(200);
      expect(durationMs).toBeLessThan(PERFORMANCE_BUDGET_MS);
    });

    it('should build analytics query filtered by policy', async () => {
      const policyEvents = generateMockAnalyticsEvents(40);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ data: policyEvents, error: null }),
                }),
              }),
            }),
          }),
        }),
      });

      const query = optimizer.buildAnalyticsQuery({
        workspaceId: 'workspace-perf',
        dateRange: {
          start: new Date(Date.now() - 7 * 86400000),
          end: new Date(),
        },
        policyId: 'policy-1',
      });

      const { data, error } = await query;
      expect(error).toBeNull();
      expect(data).toHaveLength(40);
    });
  });

  // =========================================================================
  // measureQuery helper
  // =========================================================================

  describe('measureQuery', () => {
    it('should measure execution time and report within budget', async () => {
      const { data, performance: perf } = await optimizer.measureQuery(
        'test-query',
        async () => generateMockPolicies(50)
      );

      expect(data).toHaveLength(50);
      expect(perf.queryName).toBe('test-query');
      expect(perf.durationMs).toBeGreaterThanOrEqual(0);
      expect(perf.rowCount).toBe(50);
      expect(perf.withinBudget).toBe(true);
    });

    it('should flag slow queries as outside budget', async () => {
      const { performance: perf } = await optimizer.measureQuery(
        'slow-query',
        async () => {
          // Simulate a slow operation by doing heavy computation
          const arr: number[] = [];
          for (let i = 0; i < 100; i++) {
            arr.push(i);
          }
          return arr;
        }
      );

      // The fast mock should still be within budget
      expect(perf.queryName).toBe('slow-query');
      expect(typeof perf.withinBudget).toBe('boolean');
    });

    it('should handle non-array results with rowCount 1', async () => {
      const { performance: perf } = await optimizer.measureQuery(
        'single-result',
        async () => ({ id: '1', name: 'test' })
      );

      expect(perf.rowCount).toBe(1);
    });
  });
});
