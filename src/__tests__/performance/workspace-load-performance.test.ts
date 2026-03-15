import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkspaceService } from '@/services/WorkspaceService';
import { PolicyRegistryService } from '@/services/PolicyRegistryService';

/**
 * Performance tests for workspace data loading
 * Validates: Requirements 29.1
 *
 * Tests that workspace data (members, policies) loads within
 * acceptable time thresholds even with large datasets.
 */

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
  isSupabaseConfigured: () => true,
}));

// --- Data generators ---

function generateMockMembers(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `member-${i}`,
    workspace_id: 'workspace-perf',
    user_id: `user-${i}`,
    role: i === 0 ? 'owner' : i % 3 === 0 ? 'editor' : 'viewer',
    joined_at: new Date(Date.now() - i * 86400000).toISOString(),
  }));
}

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

function generateMockWorkspaces(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    workspace_id: `workspace-${i}`,
    workspaces: {
      id: `workspace-${i}`,
      name: `Workspace ${i}`,
      slug: `workspace-${i}`,
      owner_id: 'user-0',
      settings: {
        requiredApprovers: 1,
        approverUserIds: ['user-0'],
        allowEmergencyBypass: false,
        autoApprovalRules: [],
        rateLimitPool: { enabled: false },
        budgetAlerts: [],
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  }));
}

// --- Performance helper ---

async function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; durationMs: number }> {
  const start = performance.now();
  const result = await fn();
  const durationMs = performance.now() - start;
  return { result, durationMs };
}

// 1s budget. Supabase calls are mocked so we're measuring mapping/processing overhead.
const LOAD_THRESHOLD_MS = 1000;

describe('Workspace Load Performance', () => {
  let workspaceService: WorkspaceService;
  let policyRegistryService: PolicyRegistryService;
  let mockSupabase: any;

  beforeEach(async () => {
    workspaceService = new WorkspaceService();
    policyRegistryService = new PolicyRegistryService();
    const supabaseModule = await import('@/lib/supabase');
    mockSupabase = supabaseModule.supabase;
    vi.clearAllMocks();
  });

  describe('getMembers with 50 team members', () => {
    it('should load 50 team members within the time threshold', async () => {
      const mockMembers = generateMockMembers(50);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockMembers, error: null }),
          }),
        }),
      });

      const { result, durationMs } = await measureTime(() =>
        workspaceService.getMembers('workspace-perf')
      );

      expect(result).toHaveLength(50);
      expect(durationMs).toBeLessThan(LOAD_THRESHOLD_MS);
    });

    it('should correctly map all 50 members with proper types', async () => {
      const mockMembers = generateMockMembers(50);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockMembers, error: null }),
          }),
        }),
      });

      const result = await workspaceService.getMembers('workspace-perf');

      expect(result).toHaveLength(50);
      // Verify first and last member are mapped correctly
      expect(result[0].id).toBe('member-0');
      expect(result[0].role).toBe('owner');
      expect(result[0].joinedAt).toBeInstanceOf(Date);
      expect(result[49].id).toBe('member-49');
      expect(result[49].joinedAt).toBeInstanceOf(Date);
    });
  });

  describe('listPolicies with 100 policies', () => {
    it('should load 100 policies within the time threshold', async () => {
      const mockPolicies = generateMockPolicies(100);

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

      expect(result).toHaveLength(100);
      expect(durationMs).toBeLessThan(LOAD_THRESHOLD_MS);
    });

    it('should correctly map all 100 policies with proper types', async () => {
      const mockPolicies = generateMockPolicies(100);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockPolicies, error: null }),
          }),
        }),
      });

      const result = await policyRegistryService.listPolicies('workspace-perf');

      expect(result).toHaveLength(100);
      expect(result[0].id).toBe('policy-0');
      expect(result[0].createdAt).toBeInstanceOf(Date);
      expect(result[0].updatedAt).toBeInstanceOf(Date);
      expect(result[99].id).toBe('policy-99');
      // Verify state distribution across all 4 states
      const states = new Set(result.map(p => p.state));
      expect(states.size).toBe(4);
    });
  });

  describe('combined workspace data load (members + policies)', () => {
    it('should load 50 members and 100 policies concurrently within the threshold', async () => {
      const mockMembers = generateMockMembers(50);
      const mockPolicies = generateMockPolicies(100);

      // Track which table is being queried
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'workspace_members') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: mockMembers, error: null }),
              }),
            }),
          };
        }
        if (table === 'policies') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: mockPolicies, error: null }),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        };
      });

      const { durationMs } = await measureTime(async () => {
        const [members, policies] = await Promise.all([
          workspaceService.getMembers('workspace-perf'),
          policyRegistryService.listPolicies('workspace-perf'),
        ]);
        return { members, policies };
      });

      expect(durationMs).toBeLessThan(LOAD_THRESHOLD_MS);
    });
  });

  describe('listWorkspaces with multiple workspaces', () => {
    it('should load workspace list within the time threshold', async () => {
      const mockWorkspaces = generateMockWorkspaces(10);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: mockWorkspaces, error: null }),
        }),
      });

      const { result, durationMs } = await measureTime(() =>
        workspaceService.listWorkspaces('user-0')
      );

      expect(result).toHaveLength(10);
      expect(durationMs).toBeLessThan(LOAD_THRESHOLD_MS);
      // Verify mapping correctness
      expect(result[0].name).toBe('Workspace 0');
      expect(result[0].createdAt).toBeInstanceOf(Date);
    });
  });

  describe('data mapping efficiency at scale', () => {
    it('should map 50 members without degradation', async () => {
      const mockMembers = generateMockMembers(50);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockMembers, error: null }),
          }),
        }),
      });

      // Run multiple iterations to detect any memory/perf issues
      const durations: number[] = [];
      for (let i = 0; i < 5; i++) {
        const { durationMs } = await measureTime(() =>
          workspaceService.getMembers('workspace-perf')
        );
        durations.push(durationMs);
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      expect(avgDuration).toBeLessThan(LOAD_THRESHOLD_MS);

      // No single iteration should spike above threshold
      for (const d of durations) {
        expect(d).toBeLessThan(LOAD_THRESHOLD_MS);
      }
    });

    it('should map 100 policies without degradation', async () => {
      const mockPolicies = generateMockPolicies(100);

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
      expect(avgDuration).toBeLessThan(LOAD_THRESHOLD_MS);

      for (const d of durations) {
        expect(d).toBeLessThan(LOAD_THRESHOLD_MS);
      }
    });
  });
});
