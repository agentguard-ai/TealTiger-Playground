import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PolicyRegistryService } from '@/services/PolicyRegistryService';

/**
 * Performance tests for policy list operations
 * Validates: Requirements 29.2
 *
 * Tests that the policy registry can list, search, paginate,
 * and prepare virtual scrolling data for 100+ policies within 500ms.
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
    name: `Policy ${i} - ${'A'.repeat(50)}`,
    description: `Description for policy ${i} with enough text to simulate real data`,
    current_version: `${Math.floor(i / 10)}.${i % 10}.0`,
    state: ['draft', 'review', 'approved', 'production'][i % 4],
    created_by: `user-${i % 20}`,
    created_at: new Date(Date.now() - i * 3600000).toISOString(),
    updated_at: new Date(Date.now() - i * 1800000).toISOString(),
  }));
}

// --- Performance helper ---

async function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; durationMs: number }> {
  const start = performance.now();
  const result = await fn();
  const durationMs = performance.now() - start;
  return { result, durationMs };
}

// 500ms budget per Requirement 29.2
const POLICY_LIST_THRESHOLD_MS = 500;
const PAGE_SIZE = 50;

describe('Policy List Performance', () => {
  let policyRegistryService: PolicyRegistryService;
  let mockSupabase: any;

  beforeEach(async () => {
    policyRegistryService = new PolicyRegistryService();
    const supabaseModule = await import('@/lib/supabase');
    mockSupabase = supabaseModule.supabase;
    vi.clearAllMocks();
  });

  describe('listPolicies with 100+ policies within 500ms', () => {
    it('should list 150 policies within 500ms', async () => {
      const mockPolicies = generateMockPolicies(150);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockPolicies, error: null }),
          }),
        }),
      });

      const { result, durationMs } = await measureTime(() =>
        policyRegistryService.listPolicies('workspace-perf')
      );

      expect(result).toHaveLength(150);
      expect(durationMs).toBeLessThan(POLICY_LIST_THRESHOLD_MS);
    });

    it('should correctly map all policies with proper types', async () => {
      const mockPolicies = generateMockPolicies(120);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockPolicies, error: null }),
          }),
        }),
      });

      const { result, durationMs } = await measureTime(() =>
        policyRegistryService.listPolicies('workspace-perf')
      );

      expect(result).toHaveLength(120);
      expect(durationMs).toBeLessThan(POLICY_LIST_THRESHOLD_MS);
      expect(result[0].id).toBe('policy-0');
      expect(result[0].createdAt).toBeInstanceOf(Date);
      expect(result[0].updatedAt).toBeInstanceOf(Date);
      expect(result[119].id).toBe('policy-119');
      // All four states should be represented
      const states = new Set(result.map(p => p.state));
      expect(states.size).toBe(4);
    });
  });

  describe('pagination logic (50 policies per page)', () => {
    it('should paginate 150 policies into pages of 50', async () => {
      const allPolicies = generateMockPolicies(150);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: allPolicies, error: null }),
          }),
        }),
      });

      const { result: policies, durationMs } = await measureTime(() =>
        policyRegistryService.listPolicies('workspace-perf')
      );

      expect(durationMs).toBeLessThan(POLICY_LIST_THRESHOLD_MS);

      // Simulate client-side pagination
      const totalPages = Math.ceil(policies.length / PAGE_SIZE);
      expect(totalPages).toBe(3);

      const page1 = policies.slice(0, PAGE_SIZE);
      const page2 = policies.slice(PAGE_SIZE, PAGE_SIZE * 2);
      const page3 = policies.slice(PAGE_SIZE * 2);

      expect(page1).toHaveLength(50);
      expect(page2).toHaveLength(50);
      expect(page3).toHaveLength(50);

      // Pages should contain distinct policies
      const page1Ids = new Set(page1.map(p => p.id));
      const page2Ids = new Set(page2.map(p => p.id));
      expect(page1Ids.size).toBe(50);
      expect(page2Ids.size).toBe(50);
      // No overlap between pages
      for (const id of page2Ids) {
        expect(page1Ids.has(id)).toBe(false);
      }
    });

    it('should handle partial last page correctly', async () => {
      const allPolicies = generateMockPolicies(130);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: allPolicies, error: null }),
          }),
        }),
      });

      const policies = await policyRegistryService.listPolicies('workspace-perf');

      const totalPages = Math.ceil(policies.length / PAGE_SIZE);
      expect(totalPages).toBe(3);

      const lastPage = policies.slice(PAGE_SIZE * 2);
      expect(lastPage).toHaveLength(30); // 130 - 100 = 30
    });

    it('should paginate within 500ms per page slice', async () => {
      const allPolicies = generateMockPolicies(200);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: allPolicies, error: null }),
          }),
        }),
      });

      const { result: policies, durationMs: fetchDuration } = await measureTime(() =>
        policyRegistryService.listPolicies('workspace-perf')
      );

      expect(fetchDuration).toBeLessThan(POLICY_LIST_THRESHOLD_MS);

      // Measure pagination slicing performance
      const totalPages = Math.ceil(policies.length / PAGE_SIZE);
      expect(totalPages).toBe(4);

      for (let page = 0; page < totalPages; page++) {
        const start = performance.now();
        const pageData = policies.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
        const sliceDuration = performance.now() - start;

        expect(pageData.length).toBeLessThanOrEqual(PAGE_SIZE);
        expect(sliceDuration).toBeLessThan(POLICY_LIST_THRESHOLD_MS);
      }
    });
  });

  describe('searchPolicies performance on large datasets', () => {
    it('should search 150 policies by name within 500ms', async () => {
      const mockPolicies = generateMockPolicies(150);
      // Return a subset matching the search query
      const matchingPolicies = mockPolicies.filter((_, i) => i % 5 === 0);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: matchingPolicies, error: null }),
            }),
          }),
        }),
      });

      const { result, durationMs } = await measureTime(() =>
        policyRegistryService.searchPolicies({
          workspaceId: 'workspace-perf',
          query: 'Policy 0',
        })
      );

      expect(result.length).toBeGreaterThan(0);
      expect(durationMs).toBeLessThan(POLICY_LIST_THRESHOLD_MS);
    });

    it('should search with state filter within 500ms', async () => {
      const mockPolicies = generateMockPolicies(150);
      const draftPolicies = mockPolicies.filter(p => p.state === 'draft');

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: draftPolicies, error: null }),
              }),
            }),
          }),
        }),
      });

      const { result, durationMs } = await measureTime(() =>
        policyRegistryService.searchPolicies({
          workspaceId: 'workspace-perf',
          query: 'Policy',
          filters: { state: 'draft' as any },
        })
      );

      expect(result.length).toBeGreaterThan(0);
      expect(durationMs).toBeLessThan(POLICY_LIST_THRESHOLD_MS);
      // All results should be draft
      for (const policy of result) {
        expect(policy.state).toBe('draft');
      }
    });

    it('should handle empty search results efficiently', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      });

      const { result, durationMs } = await measureTime(() =>
        policyRegistryService.searchPolicies({
          workspaceId: 'workspace-perf',
          query: 'nonexistent-policy-xyz',
        })
      );

      expect(result).toHaveLength(0);
      expect(durationMs).toBeLessThan(POLICY_LIST_THRESHOLD_MS);
    });
  });

  describe('virtual scrolling data preparation', () => {
    it('should prepare virtual scroll window from 200 policies within 500ms', async () => {
      const allPolicies = generateMockPolicies(200);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: allPolicies, error: null }),
          }),
        }),
      });

      const { result: policies, durationMs: fetchDuration } = await measureTime(() =>
        policyRegistryService.listPolicies('workspace-perf')
      );

      expect(fetchDuration).toBeLessThan(POLICY_LIST_THRESHOLD_MS);
      expect(policies).toHaveLength(200);

      // Simulate virtual scrolling: only render visible window (e.g., 20 items)
      const VISIBLE_WINDOW = 20;
      const OVERSCAN = 5;

      for (let scrollIndex = 0; scrollIndex < policies.length; scrollIndex += VISIBLE_WINDOW) {
        const start = performance.now();
        const windowStart = Math.max(0, scrollIndex - OVERSCAN);
        const windowEnd = Math.min(policies.length, scrollIndex + VISIBLE_WINDOW + OVERSCAN);
        const visibleItems = policies.slice(windowStart, windowEnd);
        const sliceDuration = performance.now() - start;

        expect(visibleItems.length).toBeLessThanOrEqual(VISIBLE_WINDOW + 2 * OVERSCAN);
        expect(sliceDuration).toBeLessThan(POLICY_LIST_THRESHOLD_MS);
      }
    });

    it('should compute total height and item offsets for 200 policies quickly', async () => {
      const allPolicies = generateMockPolicies(200);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: allPolicies, error: null }),
          }),
        }),
      });

      const policies = await policyRegistryService.listPolicies('workspace-perf');

      // Simulate virtual scroll offset computation
      const ITEM_HEIGHT = 72; // px per policy card
      const start = performance.now();

      const totalHeight = policies.length * ITEM_HEIGHT;
      const offsets = policies.map((_, i) => i * ITEM_HEIGHT);

      const computeDuration = performance.now() - start;

      expect(totalHeight).toBe(200 * ITEM_HEIGHT);
      expect(offsets).toHaveLength(200);
      expect(offsets[0]).toBe(0);
      expect(offsets[199]).toBe(199 * ITEM_HEIGHT);
      expect(computeDuration).toBeLessThan(POLICY_LIST_THRESHOLD_MS);
    });

    it('should support scroll-to-index lookup for 500 policies', async () => {
      const allPolicies = generateMockPolicies(500);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: allPolicies, error: null }),
          }),
        }),
      });

      const { result: policies, durationMs: fetchDuration } = await measureTime(() =>
        policyRegistryService.listPolicies('workspace-perf')
      );

      expect(fetchDuration).toBeLessThan(POLICY_LIST_THRESHOLD_MS);

      // Simulate scroll-to-index: given a scroll offset, find the visible range
      const ITEM_HEIGHT = 72;
      const VIEWPORT_HEIGHT = 600;
      const scrollOffset = 250 * ITEM_HEIGHT; // scroll to middle

      const start = performance.now();
      const startIndex = Math.floor(scrollOffset / ITEM_HEIGHT);
      const endIndex = Math.min(
        policies.length - 1,
        startIndex + Math.ceil(VIEWPORT_HEIGHT / ITEM_HEIGHT)
      );
      const visiblePolicies = policies.slice(startIndex, endIndex + 1);
      const lookupDuration = performance.now() - start;

      expect(startIndex).toBe(250);
      expect(visiblePolicies.length).toBeGreaterThan(0);
      expect(visiblePolicies.length).toBeLessThanOrEqual(Math.ceil(VIEWPORT_HEIGHT / ITEM_HEIGHT) + 1);
      expect(lookupDuration).toBeLessThan(POLICY_LIST_THRESHOLD_MS);
    });
  });

  describe('data mapping efficiency at scale', () => {
    it('should map 150 policies without performance degradation across iterations', async () => {
      const mockPolicies = generateMockPolicies(150);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockPolicies, error: null }),
          }),
        }),
      });

      const durations: number[] = [];
      for (let i = 0; i < 5; i++) {
        const { durationMs } = await measureTime(() =>
          policyRegistryService.listPolicies('workspace-perf')
        );
        durations.push(durationMs);
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      expect(avgDuration).toBeLessThan(POLICY_LIST_THRESHOLD_MS);

      // No single iteration should spike above threshold
      for (const d of durations) {
        expect(d).toBeLessThan(POLICY_LIST_THRESHOLD_MS);
      }
    });
  });
});
