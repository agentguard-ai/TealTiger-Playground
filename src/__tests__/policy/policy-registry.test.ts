import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PolicyRegistryService } from '@/services/PolicyRegistryService';
import { PolicyState } from '@/types/policy';
import type { PolicyMetadata } from '@/types/policy';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
  isSupabaseConfigured: () => true,
}));

const defaultMetadata: PolicyMetadata = {
  tags: ['security'],
  category: 'guardrails',
  providers: ['openai'],
  models: ['gpt-4'],
  estimatedCost: 0.05,
  testCoverage: 80,
};

const now = new Date().toISOString();

function makePolicyRow(overrides: Record<string, any> = {}) {
  return {
    id: 'policy-1',
    workspace_id: 'ws-1',
    name: 'Test Policy',
    description: 'A test policy',
    current_version: '1.0.0',
    state: 'draft',
    created_by: 'user-1',
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function makeVersionRow(overrides: Record<string, any> = {}) {
  return {
    id: 'version-1',
    policy_id: 'policy-1',
    version: '1.0.0',
    code: 'console.log("hello")',
    metadata: defaultMetadata,
    created_by: 'user-1',
    created_at: now,
    ...overrides,
  };
}

describe('PolicyRegistryService', () => {
  let service: PolicyRegistryService;
  let mockSupabase: any;

  beforeEach(async () => {
    service = new PolicyRegistryService();
    const supabaseModule = await import('@/lib/supabase');
    mockSupabase = supabaseModule.supabase;
    vi.clearAllMocks();
  });

  // ─── createPolicy ───────────────────────────────────────────────

  describe('createPolicy', () => {
    it('should create a policy in Draft state with version 1.0.0', async () => {
      const policyRow = makePolicyRow();

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'policies') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: policyRow, error: null }),
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
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
      });

      const result = await service.createPolicy({
        workspaceId: 'ws-1',
        name: 'Test Policy',
        code: 'console.log("hello")',
        metadata: defaultMetadata,
        userId: 'user-1',
      });

      expect(result.id).toBe('policy-1');
      expect(result.state).toBe(PolicyState.Draft);
      expect(result.currentVersion).toBe('1.0.0');
      expect(result.name).toBe('Test Policy');
    });

    it('should throw if policy name already exists in workspace', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'policies') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [{ id: 'existing' }], error: null }),
                }),
              }),
            }),
          };
        }
      });

      await expect(
        service.createPolicy({
          workspaceId: 'ws-1',
          name: 'Duplicate',
          code: '',
          metadata: defaultMetadata,
          userId: 'user-1',
        })
      ).rejects.toThrow('already exists');
    });

    it('should rollback policy if version insert fails', async () => {
      const mockDelete = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'policies') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: makePolicyRow(), error: null }),
              }),
            }),
            delete: mockDelete,
          };
        }
        if (table === 'policy_versions') {
          return {
            insert: vi.fn().mockResolvedValue({ error: { message: 'Version insert failed' } }),
          };
        }
      });

      await expect(
        service.createPolicy({
          workspaceId: 'ws-1',
          name: 'Test Policy',
          code: '',
          metadata: defaultMetadata,
          userId: 'user-1',
        })
      ).rejects.toThrow('Failed to create policy version');

      expect(mockDelete).toHaveBeenCalled();
    });
  });


  // ─── saveVersion ────────────────────────────────────────────────

  describe('saveVersion', () => {
    it('should save a new patch version', async () => {
      const policyRow = makePolicyRow({ current_version: '1.0.0' });
      const newVersionRow = makeVersionRow({ id: 'version-2', version: '1.0.1' });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'policies') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: policyRow, error: null }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === 'policy_versions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: makeVersionRow(), error: null }),
                  }),
                }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: newVersionRow, error: null }),
              }),
            }),
          };
        }
        if (table === 'audit_log') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
      });

      const result = await service.saveVersion({
        policyId: 'policy-1',
        code: 'updated code',
        versionType: 'patch',
        userId: 'user-1',
      });

      expect(result.version).toBe('1.0.1');
      expect(result.id).toBe('version-2');
    });

    it('should save a new minor version', async () => {
      const policyRow = makePolicyRow({ current_version: '1.0.0' });
      const newVersionRow = makeVersionRow({ id: 'version-2', version: '1.1.0' });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'policies') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: policyRow, error: null }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === 'policy_versions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: makeVersionRow(), error: null }),
                  }),
                }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: newVersionRow, error: null }),
              }),
            }),
          };
        }
        if (table === 'audit_log') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
      });

      const result = await service.saveVersion({
        policyId: 'policy-1',
        code: 'updated code',
        versionType: 'minor',
        userId: 'user-1',
      });

      expect(result.version).toBe('1.1.0');
    });

    it('should save a new major version', async () => {
      const policyRow = makePolicyRow({ current_version: '1.2.3' });
      const newVersionRow = makeVersionRow({ id: 'version-2', version: '2.0.0' });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'policies') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: policyRow, error: null }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === 'policy_versions') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: newVersionRow, error: null }),
              }),
            }),
          };
        }
        if (table === 'audit_log') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
      });

      const result = await service.saveVersion({
        policyId: 'policy-1',
        code: 'breaking change',
        versionType: 'major',
        userId: 'user-1',
        metadata: defaultMetadata,
      });

      expect(result.version).toBe('2.0.0');
    });

    it('should throw if policy not found', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'policies') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
              }),
            }),
          };
        }
      });

      await expect(
        service.saveVersion({
          policyId: 'nonexistent',
          code: '',
          versionType: 'patch',
          userId: 'user-1',
        })
      ).rejects.toThrow('Policy not found');
    });

    it('should throw if version insert fails', async () => {
      const policyRow = makePolicyRow();

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'policies') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: policyRow, error: null }),
              }),
            }),
          };
        }
        if (table === 'policy_versions') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Insert failed' } }),
              }),
            }),
          };
        }
      });

      await expect(
        service.saveVersion({
          policyId: 'policy-1',
          code: '',
          versionType: 'patch',
          userId: 'user-1',
          metadata: defaultMetadata,
        })
      ).rejects.toThrow('Failed to save version');
    });

    it('should use metadata from latest version when not provided', async () => {
      const policyRow = makePolicyRow({ current_version: '1.0.0' });
      const latestVersionMeta = { ...defaultMetadata, tags: ['inherited'] };
      const newVersionRow = makeVersionRow({ id: 'version-2', version: '1.0.1', metadata: latestVersionMeta });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'policies') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: policyRow, error: null }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === 'policy_versions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { metadata: latestVersionMeta },
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: newVersionRow, error: null }),
              }),
            }),
          };
        }
        if (table === 'audit_log') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
      });

      const result = await service.saveVersion({
        policyId: 'policy-1',
        code: 'updated',
        versionType: 'patch',
        userId: 'user-1',
      });

      expect(result.metadata.tags).toEqual(['inherited']);
    });
  });


  // ─── revertToVersion ────────────────────────────────────────────

  describe('revertToVersion', () => {
    it('should revert to a previous version by creating a new patch version', async () => {
      const targetVersion = makeVersionRow({ id: 'version-old', version: '1.0.0', code: 'old code' });
      const policyRow = makePolicyRow({ current_version: '1.2.0' });
      const revertedRow = makeVersionRow({ id: 'version-reverted', version: '1.2.1', code: 'old code' });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'policy_versions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: targetVersion, error: null }),
                }),
                single: vi.fn().mockResolvedValue({ data: targetVersion, error: null }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: revertedRow, error: null }),
              }),
            }),
          };
        }
        if (table === 'policies') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: policyRow, error: null }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === 'audit_log') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
      });

      const result = await service.revertToVersion('policy-1', 'version-old', 'user-1');

      expect(result.id).toBe('version-reverted');
      expect(result.version).toBe('1.2.1');
      expect(result.code).toBe('old code');
    });

    it('should throw if target version not found', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'policy_versions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
                }),
              }),
            }),
          };
        }
      });

      await expect(
        service.revertToVersion('policy-1', 'nonexistent', 'user-1')
      ).rejects.toThrow('Version not found');
    });

    it('should throw if policy not found during revert', async () => {
      const targetVersion = makeVersionRow();

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'policy_versions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: targetVersion, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'policies') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
              }),
            }),
          };
        }
      });

      await expect(
        service.revertToVersion('nonexistent', 'version-1', 'user-1')
      ).rejects.toThrow('Policy not found');
    });
  });

  // ─── listVersions ──────────────────────────────────────────────

  describe('listVersions', () => {
    it('should return versions ordered by created_at desc', async () => {
      const versions = [
        makeVersionRow({ id: 'v3', version: '1.2.0', created_at: '2026-03-03T00:00:00Z' }),
        makeVersionRow({ id: 'v2', version: '1.1.0', created_at: '2026-02-02T00:00:00Z' }),
        makeVersionRow({ id: 'v1', version: '1.0.0', created_at: '2026-01-01T00:00:00Z' }),
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'policy_versions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: versions, error: null }),
              }),
            }),
          };
        }
      });

      const result = await service.listVersions('policy-1');

      expect(result).toHaveLength(3);
      expect(result[0].version).toBe('1.2.0');
      expect(result[2].version).toBe('1.0.0');
    });

    it('should return empty array for policy with no versions', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'policy_versions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }
      });

      const result = await service.listVersions('policy-1');
      expect(result).toHaveLength(0);
    });

    it('should throw if listing versions fails', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'policy_versions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
              }),
            }),
          };
        }
      });

      await expect(service.listVersions('policy-1')).rejects.toThrow('Failed to list versions');
    });
  });

  // ─── getVersion ─────────────────────────────────────────────────

  describe('getVersion', () => {
    it('should return a specific version by ID', async () => {
      const versionRow = makeVersionRow({ id: 'version-42', version: '2.1.0' });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'policy_versions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: versionRow, error: null }),
              }),
            }),
          };
        }
      });

      const result = await service.getVersion('version-42');

      expect(result.id).toBe('version-42');
      expect(result.version).toBe('2.1.0');
      expect(result.policyId).toBe('policy-1');
    });

    it('should throw if version not found', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'policy_versions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
              }),
            }),
          };
        }
      });

      await expect(service.getVersion('nonexistent')).rejects.toThrow('Version not found');
    });
  });


  // ─── searchPolicies ─────────────────────────────────────────────

  describe('searchPolicies', () => {
    it('should search policies by name query', async () => {
      const policies = [
        makePolicyRow({ id: 'p1', name: 'PII Detection' }),
        makePolicyRow({ id: 'p2', name: 'PII Redaction' }),
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'policies') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                or: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({ data: policies, error: null }),
                }),
              }),
            }),
          };
        }
      });

      const result = await service.searchPolicies({
        workspaceId: 'ws-1',
        query: 'PII',
      });

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('PII Detection');
    });

    it('should filter by state', async () => {
      const policies = [makePolicyRow({ state: 'approved' })];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'policies') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                or: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({ data: policies, error: null }),
                  }),
                }),
              }),
            }),
          };
        }
      });

      const result = await service.searchPolicies({
        workspaceId: 'ws-1',
        query: 'test',
        filters: { state: PolicyState.Approved },
      });

      expect(result).toHaveLength(1);
      expect(result[0].state).toBe(PolicyState.Approved);
    });

    it('should filter by author', async () => {
      const policies = [makePolicyRow({ created_by: 'user-42' })];

      // Chain: .from('policies').select('*').eq('workspace_id', ...) -> queryBuilder
      // query is empty string (falsy), so .or() is NOT called
      // Then .eq('created_by', ...) -> .order(...)
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'policies') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({ data: policies, error: null }),
                }),
              }),
            }),
          };
        }
      });

      const result = await service.searchPolicies({
        workspaceId: 'ws-1',
        query: '',
        filters: { author: 'user-42' },
      });

      expect(result).toHaveLength(1);
    });

    it('should return empty array when no policies match', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'policies') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                or: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          };
        }
      });

      const result = await service.searchPolicies({
        workspaceId: 'ws-1',
        query: 'nonexistent',
      });

      expect(result).toHaveLength(0);
    });

    it('should throw if search fails', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'policies') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                or: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Search error' } }),
                }),
              }),
            }),
          };
        }
      });

      await expect(
        service.searchPolicies({ workspaceId: 'ws-1', query: 'test' })
      ).rejects.toThrow('Failed to search policies');
    });
  });

  // ─── branchPolicy ──────────────────────────────────────────────

  describe('branchPolicy', () => {
    it('should create a branch copy of a policy', async () => {
      const sourcePolicy = makePolicyRow({ id: 'source-1', name: 'Original' });
      const latestVersion = makeVersionRow({ code: 'original code' });
      const branchedPolicy = makePolicyRow({
        id: 'branch-1',
        name: 'Original-experiment',
        description: 'Branch of Original: A test policy',
      });

      // Track call count to differentiate between branchPolicy's lookups and createPolicy's calls
      let policiesCallCount = 0;

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'policies') {
          policiesCallCount++;
          // First call: branchPolicy fetches source policy (.select().eq().single())
          if (policiesCallCount === 1) {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: sourcePolicy, error: null }),
                }),
              }),
            };
          }
          // Second call: createPolicy -> validateUniqueName (.select().eq().eq().limit())
          if (policiesCallCount === 2) {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                  }),
                }),
              }),
            };
          }
          // Third call: createPolicy -> insert policy
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: branchedPolicy, error: null }),
              }),
            }),
          };
        }
        if (table === 'policy_versions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: latestVersion, error: null }),
                  }),
                }),
              }),
            }),
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === 'audit_log') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
      });

      const result = await service.branchPolicy({
        policyId: 'source-1',
        branchName: 'experiment',
        userId: 'user-1',
      });

      expect(result.name).toBe('Original-experiment');
    });

    it('should throw if source policy not found', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'policies') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
              }),
            }),
          };
        }
      });

      await expect(
        service.branchPolicy({ policyId: 'nonexistent', branchName: 'test', userId: 'user-1' })
      ).rejects.toThrow('Source policy not found');
    });
  });

  // ─── validateUniqueName ─────────────────────────────────────────

  describe('validateUniqueName', () => {
    it('should return true when name is unique', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'policies') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          };
        }
      });

      const result = await service.validateUniqueName('ws-1', 'New Policy');
      expect(result).toBe(true);
    });

    it('should return false when name already exists', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'policies') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [{ id: 'existing' }], error: null }),
                }),
              }),
            }),
          };
        }
      });

      const result = await service.validateUniqueName('ws-1', 'Existing Policy');
      expect(result).toBe(false);
    });

    it('should throw if validation query fails', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'policies') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
                }),
              }),
            }),
          };
        }
      });

      await expect(service.validateUniqueName('ws-1', 'test')).rejects.toThrow('Failed to validate name');
    });
  });

  // ─── getPolicy ──────────────────────────────────────────────────

  describe('getPolicy', () => {
    it('should return a policy by ID', async () => {
      const policyRow = makePolicyRow({ id: 'policy-99', name: 'My Policy' });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'policies') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: policyRow, error: null }),
              }),
            }),
          };
        }
      });

      const result = await service.getPolicy('policy-99');

      expect(result.id).toBe('policy-99');
      expect(result.name).toBe('My Policy');
      expect(result.workspaceId).toBe('ws-1');
    });

    it('should throw if policy not found', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'policies') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
              }),
            }),
          };
        }
      });

      await expect(service.getPolicy('nonexistent')).rejects.toThrow('Policy not found');
    });
  });

  // ─── listPolicies ──────────────────────────────────────────────

  describe('listPolicies', () => {
    it('should list all policies in a workspace', async () => {
      const policies = [
        makePolicyRow({ id: 'p1', name: 'Policy A' }),
        makePolicyRow({ id: 'p2', name: 'Policy B' }),
        makePolicyRow({ id: 'p3', name: 'Policy C' }),
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'policies') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: policies, error: null }),
              }),
            }),
          };
        }
      });

      const result = await service.listPolicies('ws-1');

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Policy A');
      expect(result[2].name).toBe('Policy C');
    });

    it('should return empty array for workspace with no policies', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'policies') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }
      });

      const result = await service.listPolicies('ws-empty');
      expect(result).toHaveLength(0);
    });

    it('should throw if listing fails', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'policies') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
              }),
            }),
          };
        }
      });

      await expect(service.listPolicies('ws-1')).rejects.toThrow('Failed to list policies');
    });
  });

  // ─── incrementVersion (private, tested via saveVersion) ─────────

  describe('incrementVersion (via saveVersion)', () => {
    // Helper to test version increment by calling saveVersion with specific current_version
    async function testVersionIncrement(currentVersion: string, type: 'major' | 'minor' | 'patch', expected: string) {
      const policyRow = makePolicyRow({ current_version: currentVersion });
      const newVersionRow = makeVersionRow({ version: expected });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'policies') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: policyRow, error: null }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === 'policy_versions') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: newVersionRow, error: null }),
              }),
            }),
          };
        }
        if (table === 'audit_log') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
      });

      const result = await service.saveVersion({
        policyId: 'policy-1',
        code: 'code',
        versionType: type,
        userId: 'user-1',
        metadata: defaultMetadata,
      });

      expect(result.version).toBe(expected);
    }

    it('major: 1.0.0 -> 2.0.0', async () => {
      await testVersionIncrement('1.0.0', 'major', '2.0.0');
    });

    it('minor: 1.0.0 -> 1.1.0', async () => {
      await testVersionIncrement('1.0.0', 'minor', '1.1.0');
    });

    it('patch: 1.0.0 -> 1.0.1', async () => {
      await testVersionIncrement('1.0.0', 'patch', '1.0.1');
    });

    it('major: 3.5.7 -> 4.0.0', async () => {
      await testVersionIncrement('3.5.7', 'major', '4.0.0');
    });

    it('minor: 2.3.0 -> 2.4.0', async () => {
      await testVersionIncrement('2.3.0', 'minor', '2.4.0');
    });

    it('patch: 1.2.9 -> 1.2.10', async () => {
      await testVersionIncrement('1.2.9', 'patch', '1.2.10');
    });
  });

  // ─── mapPolicy / mapPolicyVersion (private, tested via public methods) ──

  describe('data mapping', () => {
    it('should correctly map snake_case DB rows to camelCase Policy objects', async () => {
      const row = makePolicyRow({
        id: 'map-test',
        workspace_id: 'ws-map',
        created_by: 'user-map',
        current_version: '3.2.1',
        created_at: '2026-01-15T10:00:00Z',
        updated_at: '2026-02-20T15:30:00Z',
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'policies') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: row, error: null }),
              }),
            }),
          };
        }
      });

      const result = await service.getPolicy('map-test');

      expect(result.id).toBe('map-test');
      expect(result.workspaceId).toBe('ws-map');
      expect(result.createdBy).toBe('user-map');
      expect(result.currentVersion).toBe('3.2.1');
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should correctly map snake_case DB rows to camelCase PolicyVersion objects', async () => {
      const row = makeVersionRow({
        id: 'ver-map',
        policy_id: 'pol-map',
        created_by: 'user-map',
        created_at: '2026-06-01T12:00:00Z',
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'policy_versions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: row, error: null }),
              }),
            }),
          };
        }
      });

      const result = await service.getVersion('ver-map');

      expect(result.id).toBe('ver-map');
      expect(result.policyId).toBe('pol-map');
      expect(result.createdBy).toBe('user-map');
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.metadata).toEqual(defaultMetadata);
    });
  });
});
