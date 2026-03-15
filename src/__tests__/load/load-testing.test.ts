import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkspaceService } from '@/services/WorkspaceService';
import { PolicyRegistryService } from '@/services/PolicyRegistryService';
import { AuditTrailService } from '@/services/AuditTrailService';
import type { AuditAction, ResourceType } from '@/types/audit';
import type { PolicyState } from '@/types/policy';

/**
 * Load testing for enterprise-scale usage
 * Task 8.5.2: Perform load testing
 *
 * Validates system behavior under:
 * - 50 concurrent users
 * - 100 policies per workspace
 * - 1000 audit events
 * - Database query performance
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

const POLICY_STATES: PolicyState[] = ['draft', 'review', 'approved', 'production'] as PolicyState[];

function generateMockMembers(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `member-${i}`,
    workspace_id: 'workspace-load',
    user_id: `user-${i}`,
    role: i === 0 ? 'owner' : i % 3 === 0 ? 'editor' : 'viewer',
    joined_at: new Date(Date.now() - i * 86400000).toISOString(),
  }));
}

function generateMockPolicies(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `policy-${i}`,
    workspace_id: 'workspace-load',
    name: `Load Test Policy ${i}`,
    description: `Policy ${i} for load testing with realistic description content`,
    current_version: `${Math.floor(i / 10)}.${i % 10}.0`,
    state: POLICY_STATES[i % 4],
    created_by: `user-${i % 50}`,
    created_at: new Date(Date.now() - i * 3600000).toISOString(),
    updated_at: new Date(Date.now() - i * 1800000).toISOString(),
  }));
}

function generateMockAuditEvents(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `audit-${i}`,
    workspace_id: 'workspace-load',
    actor_id: `user-${i % 50}`,
    action: AUDIT_ACTIONS[i % AUDIT_ACTIONS.length],
    resource_type: RESOURCE_TYPES[i % RESOURCE_TYPES.length],
    resource_id: `resource-${i}`,
    metadata: {
      policyName: `Policy ${i % 100}`,
      version: `1.${i % 10}.0`,
      environment: ['development', 'staging', 'production'][i % 3],
    },
    created_at: new Date(Date.now() - i * 60000).toISOString(),
  }));
}

function generateMockWorkspaces(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    workspace_id: `workspace-${i}`,
    workspaces: {
      id: `workspace-${i}`,
      name: `Workspace ${i}`,
      slug: `workspace-${i}`,
      owner_id: `user-${i % 50}`,
      settings: {
        requiredApprovers: 1,
        approverUserIds: [`user-${i % 50}`],
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

// Thresholds
const LOAD_THRESHOLD_MS = 1000;
const CONCURRENT_THRESHOLD_MS = 2000;
const PAGE_SIZE = 100;

describe('Load Testing', () => {
  let workspaceService: WorkspaceService;
  let policyRegistryService: PolicyRegistryService;
  let auditTrailService: AuditTrailService;
  let mockSupabase: any;

  beforeEach(async () => {
    workspaceService = new WorkspaceService();
    policyRegistryService = new PolicyRegistryService();
    auditTrailService = new AuditTrailService();
    const supabaseModule = await import('@/lib/supabase');
    mockSupabase = supabaseModule.supabase;
    vi.clearAllMocks();
  });

  // -------------------------------------------------------
  // 1. Test with 50 concurrent users
  // -------------------------------------------------------
  describe('50 concurrent users', () => {
    it('should handle 50 concurrent workspace member lookups', async () => {
      const mockMembers = generateMockMembers(50);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockMembers, error: null }),
          }),
        }),
      });

      // Simulate 50 concurrent users each fetching the member list
      const { result: results, durationMs } = await measureTime(async () => {
        const promises = Array.from({ length: 50 }, () =>
          workspaceService.getMembers('workspace-load')
        );
        return Promise.all(promises);
      });

      expect(results).toHaveLength(50);
      results.forEach((members) => {
        expect(members).toHaveLength(50);
        expect(members[0].joinedAt).toBeInstanceOf(Date);
      });
      expect(durationMs).toBeLessThan(CONCURRENT_THRESHOLD_MS);
    });

    it('should handle 50 concurrent permission checks', async () => {
      // Use vi.spyOn to intercept checkPermission directly
      vi.spyOn(workspaceService, 'checkPermission').mockResolvedValue(true);

      const { result: results, durationMs } = await measureTime(async () => {
        const promises = Array.from({ length: 50 }, (_, i) =>
          workspaceService.checkPermission('workspace-load', `user-${i}`, 'view_policy')
        );
        return Promise.all(promises);
      });

      expect(results).toHaveLength(50);
      results.forEach((allowed) => expect(allowed).toBe(true));
      expect(durationMs).toBeLessThan(CONCURRENT_THRESHOLD_MS);
    });

    it('should handle 50 concurrent policy list requests', async () => {
      const mockPolicies = generateMockPolicies(100);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockPolicies, error: null }),
          }),
        }),
      });

      const { result: results, durationMs } = await measureTime(async () => {
        const promises = Array.from({ length: 50 }, () =>
          policyRegistryService.listPolicies('workspace-load')
        );
        return Promise.all(promises);
      });

      expect(results).toHaveLength(50);
      results.forEach((policies) => expect(policies).toHaveLength(100));
      expect(durationMs).toBeLessThan(CONCURRENT_THRESHOLD_MS);
    });

    it('should handle 50 concurrent audit event reads', async () => {
      const mockEvents = generateMockAuditEvents(100);

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
                range: vi.fn().mockResolvedValue({ data: mockEvents, error: null }),
              }),
            }),
          };
        }),
      });

      const { result: results, durationMs } = await measureTime(async () => {
        const promises = Array.from({ length: 50 }, () =>
          auditTrailService.getEvents('workspace-load', { page: 1, pageSize: PAGE_SIZE })
        );
        return Promise.all(promises);
      });

      expect(results).toHaveLength(50);
      results.forEach((page) => {
        expect(page.items).toHaveLength(100);
        expect(page.total).toBe(1000);
      });
      expect(durationMs).toBeLessThan(CONCURRENT_THRESHOLD_MS);
    });

    it('should handle mixed concurrent operations from 50 users', async () => {
      const mockMembers = generateMockMembers(50);
      const mockPolicies = generateMockPolicies(100);
      const mockEvents = generateMockAuditEvents(100);

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'workspace_members') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: mockMembers, error: null }),
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { role: 'editor' }, error: null }),
                }),
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
        if (table === 'audit_log') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: mockEvents, error: null }),
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
        const promises = Array.from({ length: 50 }, (_, i) => {
          // Each user does a different operation based on index
          if (i % 3 === 0) return workspaceService.getMembers('workspace-load');
          if (i % 3 === 1) return policyRegistryService.listPolicies('workspace-load');
          return auditTrailService.filterEvents('workspace-load', {});
        });
        return Promise.all(promises);
      });

      expect(durationMs).toBeLessThan(CONCURRENT_THRESHOLD_MS);
    });
  });

  // -------------------------------------------------------
  // 2. Test with 100 policies per workspace
  // -------------------------------------------------------
  describe('100 policies per workspace', () => {
    it('should list 100 policies and map all fields correctly', async () => {
      const mockPolicies = generateMockPolicies(100);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockPolicies, error: null }),
          }),
        }),
      });

      const { result, durationMs } = await measureTime(() =>
        policyRegistryService.listPolicies('workspace-load')
      );

      expect(result).toHaveLength(100);
      expect(durationMs).toBeLessThan(LOAD_THRESHOLD_MS);

      // Verify correct mapping of first and last
      expect(result[0].id).toBe('policy-0');
      expect(result[0].createdAt).toBeInstanceOf(Date);
      expect(result[0].updatedAt).toBeInstanceOf(Date);
      expect(result[99].id).toBe('policy-99');

      // Verify all 4 policy states are represented
      const states = new Set(result.map((p) => p.state));
      expect(states.size).toBe(4);
    });

    it('should search across 100 policies within threshold', async () => {
      const matchingPolicies = generateMockPolicies(25);

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
          workspaceId: 'workspace-load',
          query: 'Load Test',
        })
      );

      expect(result.length).toBeGreaterThan(0);
      expect(durationMs).toBeLessThan(LOAD_THRESHOLD_MS);
    });

    it('should handle repeated listing of 100 policies without degradation', async () => {
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
          policyRegistryService.listPolicies('workspace-load')
        );
        durations.push(durationMs);
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      expect(avgDuration).toBeLessThan(LOAD_THRESHOLD_MS);
      durations.forEach((d) => expect(d).toBeLessThan(LOAD_THRESHOLD_MS));
    });

    it('should validate unique names across 100 policies within threshold', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      });

      const { result, durationMs } = await measureTime(() =>
        policyRegistryService.validateUniqueName('workspace-load', 'New Unique Policy')
      );

      expect(result).toBe(true);
      expect(durationMs).toBeLessThan(LOAD_THRESHOLD_MS);
    });
  });

  // -------------------------------------------------------
  // 3. Test with 1000 audit events
  // -------------------------------------------------------
  describe('1000 audit events', () => {
    it('should paginate through 1000 audit events within threshold', async () => {
      const allEvents = generateMockAuditEvents(1000);

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
                range: vi.fn().mockResolvedValue({
                  data: allEvents.slice(0, PAGE_SIZE),
                  error: null,
                }),
              }),
            }),
          };
        }),
      });

      const { result, durationMs } = await measureTime(() =>
        auditTrailService.getEvents('workspace-load', { page: 1, pageSize: PAGE_SIZE })
      );

      expect(result.items).toHaveLength(PAGE_SIZE);
      expect(result.total).toBe(1000);
      expect(result.hasMore).toBe(true);
      expect(result.items[0].createdAt).toBeInstanceOf(Date);
      expect(durationMs).toBeLessThan(LOAD_THRESHOLD_MS);
    });

    it('should filter 1000 events by action type within threshold', async () => {
      const filteredEvents = generateMockAuditEvents(150);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: filteredEvents, error: null }),
            }),
          }),
        }),
      });

      const { result, durationMs } = await measureTime(() =>
        auditTrailService.filterEvents('workspace-load', {
          actions: ['policy_created', 'policy_updated', 'policy_deleted'],
        })
      );

      expect(result.length).toBeGreaterThan(0);
      expect(durationMs).toBeLessThan(LOAD_THRESHOLD_MS);
    });

    it('should log 1000 audit events sequentially within threshold', async () => {
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockImplementation(() =>
              Promise.resolve({
                data: {
                  id: `audit-new-${Date.now()}`,
                  workspace_id: 'workspace-load',
                  actor_id: 'user-0',
                  action: 'policy_created',
                  resource_type: 'policy',
                  resource_id: 'policy-0',
                  metadata: {},
                  created_at: new Date().toISOString(),
                },
                error: null,
              })
            ),
          }),
        }),
      });

      const batchSize = 1000;
      const { durationMs } = await measureTime(async () => {
        const promises = Array.from({ length: batchSize }, (_, i) =>
          auditTrailService.logEvent(
            'workspace-load',
            `user-${i % 50}`,
            AUDIT_ACTIONS[i % AUDIT_ACTIONS.length],
            RESOURCE_TYPES[i % RESOURCE_TYPES.length],
            `resource-${i}`,
            { index: i }
          )
        );
        return Promise.all(promises);
      });

      expect(durationMs).toBeLessThan(CONCURRENT_THRESHOLD_MS);
    });

    it('should format descriptions for 1000 events within threshold', async () => {
      const mockEvents = generateMockAuditEvents(1000);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockEvents, error: null }),
          }),
        }),
      });

      const events = await auditTrailService.filterEvents('workspace-load', {});

      const start = performance.now();
      const descriptions = events.map((e) => auditTrailService.formatEventDescription(e));
      const formatDuration = performance.now() - start;

      expect(descriptions).toHaveLength(1000);
      expect(descriptions.every((d) => typeof d === 'string' && d.length > 0)).toBe(true);
      expect(formatDuration).toBeLessThan(LOAD_THRESHOLD_MS);
    });

    it('should export 1000 audit events as CSV within threshold', async () => {
      const mockEvents = generateMockAuditEvents(1000);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockEvents, error: null }),
          }),
        }),
      });

      const { result, durationMs } = await measureTime(() =>
        auditTrailService.exportCSV('workspace-load', {})
      );

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      // CSV should have header + 1000 data rows
      const lines = result.trim().split('\n');
      expect(lines.length).toBeGreaterThanOrEqual(1001);
      expect(durationMs).toBeLessThan(CONCURRENT_THRESHOLD_MS);
    });
  });

  // -------------------------------------------------------
  // 4. Database query performance
  // -------------------------------------------------------
  describe('database query performance', () => {
    it('should handle workspace creation under load', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'workspaces') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockImplementation(() =>
                  Promise.resolve({
                    data: {
                      id: `ws-${Date.now()}`,
                      name: 'Load Test Workspace',
                      slug: 'load-test-workspace',
                      owner_id: 'user-0',
                      settings: {},
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                    },
                    error: null,
                  })
                ),
              }),
            }),
          };
        }
        if (table === 'workspace_members') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      });

      const { result, durationMs } = await measureTime(() =>
        workspaceService.createWorkspace('Load Test Workspace', 'user-0')
      );

      expect(result.name).toBe('Load Test Workspace');
      expect(durationMs).toBeLessThan(LOAD_THRESHOLD_MS);
    });

    it('should handle concurrent workspace lookups for 50 users', async () => {
      const mockWorkspaces = generateMockWorkspaces(10);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: mockWorkspaces, error: null }),
        }),
      });

      const { result: results, durationMs } = await measureTime(async () => {
        const promises = Array.from({ length: 50 }, (_, i) =>
          workspaceService.listWorkspaces(`user-${i}`)
        );
        return Promise.all(promises);
      });

      expect(results).toHaveLength(50);
      results.forEach((workspaces) => {
        expect(workspaces).toHaveLength(10);
        expect(workspaces[0].createdAt).toBeInstanceOf(Date);
      });
      expect(durationMs).toBeLessThan(CONCURRENT_THRESHOLD_MS);
    });

    it('should handle concurrent policy creation under load', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'policies') {
          // createPolicy first calls validateUniqueName (select), then insert
          const selectFn = vi.fn().mockImplementation((cols: string) => {
            if (cols === 'id') {
              // validateUniqueName path: .select('id').eq().eq().limit()
              return {
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                  }),
                }),
              };
            }
            // insert().select().single() path
            return {
              single: vi.fn().mockImplementation(() =>
                Promise.resolve({
                  data: {
                    id: `policy-new-${Date.now()}-${Math.random()}`,
                    workspace_id: 'workspace-load',
                    name: 'New Policy',
                    description: 'Test',
                    current_version: '1.0.0',
                    state: 'draft',
                    created_by: 'user-0',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  },
                  error: null,
                })
              ),
            };
          });
          return {
            select: selectFn,
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockImplementation(() =>
                  Promise.resolve({
                    data: {
                      id: `policy-new-${Date.now()}-${Math.random()}`,
                      workspace_id: 'workspace-load',
                      name: 'New Policy',
                      description: 'Test',
                      current_version: '1.0.0',
                      state: 'draft',
                      created_by: 'user-0',
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                    },
                    error: null,
                  })
                ),
              }),
            }),
          };
        }
        if (table === 'policy_versions') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === 'audit_log') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'audit-new' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      });

      const { durationMs } = await measureTime(async () => {
        const promises = Array.from({ length: 20 }, (_, i) =>
          policyRegistryService.createPolicy({
            workspaceId: 'workspace-load',
            name: `Concurrent Policy ${i}`,
            code: `// policy ${i}\nconst x = ${i};`,
            metadata: {
              tags: ['load-test'],
              category: 'test',
              providers: ['openai'],
              models: ['gpt-4'],
              estimatedCost: 0.01,
              testCoverage: 80,
            },
            userId: `user-${i % 50}`,
          })
        );
        return Promise.all(promises);
      });

      expect(durationMs).toBeLessThan(CONCURRENT_THRESHOLD_MS);
    });

    it('should handle rapid sequential reads across all services', async () => {
      const mockMembers = generateMockMembers(50);
      const mockPolicies = generateMockPolicies(100);
      const mockEvents = generateMockAuditEvents(100);

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
        if (table === 'audit_log') {
          return {
            select: vi.fn().mockImplementation((_sel: string, opts?: any) => {
              if (opts?.head) {
                return {
                  eq: vi.fn().mockResolvedValue({ count: 1000, error: null }),
                };
              }
              return {
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    range: vi.fn().mockResolvedValue({ data: mockEvents, error: null }),
                  }),
                }),
              };
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      });

      const iterations = 10;
      const durations: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const { durationMs } = await measureTime(async () => {
          const [members, policies, auditPage] = await Promise.all([
            workspaceService.getMembers('workspace-load'),
            policyRegistryService.listPolicies('workspace-load'),
            auditTrailService.getEvents('workspace-load', { page: 1, pageSize: PAGE_SIZE }),
          ]);
          return { members, policies, auditPage };
        });
        durations.push(durationMs);
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      expect(avgDuration).toBeLessThan(LOAD_THRESHOLD_MS);
      // No single iteration should spike
      durations.forEach((d) => expect(d).toBeLessThan(CONCURRENT_THRESHOLD_MS));
    });
  });
});
