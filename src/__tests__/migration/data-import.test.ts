// Unit tests for DataImportService
// Requirements: 1.10, 28.9

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataImportService } from '../../services/DataImportService';
import type { WorkspaceExportData } from '../../services/DataExportService';

// Mock Supabase
const mockFrom = vi.fn();
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
  isSupabaseConfigured: () => true,
}));

// Helper to build a chainable Supabase query mock
function buildChain(result: { data: any; error: any }) {
  const chain: any = {};
  const methods = ['select', 'eq', 'in', 'order', 'single', 'insert', 'gte', 'lte'];
  for (const m of methods) {
    chain[m] = vi.fn(() => {
      if (m === 'single' || m === 'insert') return Promise.resolve(result);
      return chain;
    });
  }
  chain.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject);
  return chain;
}

function createValidExportData(overrides: Partial<WorkspaceExportData> = {}): WorkspaceExportData {
  return {
    metadata: {
      exportVersion: '1.0.0',
      exportedAt: '2026-01-15T00:00:00Z',
      workspaceId: 'ws-001',
      workspaceName: 'Test Workspace',
      exportedBy: 'user-001',
    },
    policies: [
      {
        id: 'pol-1',
        workspaceId: 'ws-001',
        name: 'PII Detection',
        description: 'Detects PII',
        currentVersion: '1.0.0',
        state: 'draft' as any,
        createdBy: 'user-001',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-02'),
      },
    ],
    policyVersions: [
      {
        id: 'ver-1',
        policyId: 'pol-1',
        version: '1.0.0',
        code: 'return ALLOW;',
        metadata: { tags: ['pii'], category: 'security', providers: [], models: [], estimatedCost: 0, testCoverage: 80 },
        createdBy: 'user-001',
        createdAt: new Date('2026-01-01'),
      },
    ],
    comments: [
      {
        id: 'com-1',
        policyId: 'pol-1',
        versionId: 'ver-1',
        lineNumber: 5,
        content: 'Looks good',
        authorId: 'user-001',
        resolved: false,
        mentions: [],
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      },
    ],
    commentReplies: [
      {
        id: 'rep-1',
        commentId: 'com-1',
        content: 'Thanks!',
        authorId: 'user-002',
        createdAt: new Date('2026-01-01'),
      },
    ],
    auditLog: [
      {
        id: 'aud-1',
        workspaceId: 'ws-001',
        actorId: 'user-001',
        action: 'policy_created' as any,
        resourceType: 'policy' as any,
        resourceId: 'pol-1',
        metadata: {},
        createdAt: new Date('2026-01-01'),
      },
    ],
    complianceMappings: [
      {
        id: 'map-1',
        policyId: 'pol-1',
        frameworkId: 'owasp-asi-2024',
        requirementId: 'ASI01',
        notes: 'Covers prompt injection',
        createdAt: new Date('2026-01-01'),
      },
    ],
    ...overrides,
  };
}

describe('DataImportService', () => {
  let service: DataImportService;

  beforeEach(() => {
    service = new DataImportService();
    vi.clearAllMocks();
  });

  describe('validateSchema', () => {
    it('should accept valid export data', () => {
      const data = createValidExportData();
      const result = service.validateSchema(data);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject null input', () => {
      const result = service.validateSchema(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Import data must be a non-null object');
    });

    it('should reject non-object input', () => {
      const result = service.validateSchema('not an object');
      expect(result.valid).toBe(false);
    });

    it('should report missing required top-level fields', () => {
      const result = service.validateSchema({ metadata: { exportVersion: '1.0.0', exportedAt: '', workspaceId: '', workspaceName: '', exportedBy: '' } });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: policies');
      expect(result.errors).toContain('Missing required field: policyVersions');
    });

    it('should report missing metadata fields', () => {
      const data = createValidExportData();
      (data.metadata as any) = { exportVersion: '1.0.0' };
      const result = service.validateSchema(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Missing required metadata field'))).toBe(true);
    });

    it('should reject non-array data fields', () => {
      const data = createValidExportData();
      (data as any).policies = 'not-an-array';
      const result = service.validateSchema(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('policies must be an array');
    });

    it('should validate policy entries have id and name', () => {
      const data = createValidExportData();
      data.policies = [{ id: '', name: '' } as any];
      const result = service.validateSchema(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('policies[0] missing id'))).toBe(true);
    });

    it('should reject non-object metadata', () => {
      const data = createValidExportData();
      (data as any).metadata = 'bad';
      const result = service.validateSchema(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('metadata must be an object');
    });
  });

  describe('checkConflicts', () => {
    it('should detect duplicate policy names', async () => {
      const data = createValidExportData();
      mockFrom.mockImplementation(() =>
        buildChain({ data: [{ id: 'other-id', name: 'PII Detection' }], error: null })
      );

      const result = await service.checkConflicts(data, 'ws-001');
      expect(result.conflicts.some(c => c.includes('Policy name conflict'))).toBe(true);
    });

    it('should detect duplicate policy IDs', async () => {
      const data = createValidExportData();
      mockFrom.mockImplementation(() =>
        buildChain({ data: [{ id: 'pol-1', name: 'Other Policy' }], error: null })
      );

      const result = await service.checkConflicts(data, 'ws-001');
      expect(result.duplicateIds).toContain('pol-1');
      expect(result.conflicts.some(c => c.includes('Policy ID conflict'))).toBe(true);
    });

    it('should return no conflicts for clean import', async () => {
      const data = createValidExportData();
      mockFrom.mockImplementation(() =>
        buildChain({ data: [], error: null })
      );

      const result = await service.checkConflicts(data, 'ws-001');
      expect(result.conflicts).toHaveLength(0);
      expect(result.duplicateIds).toHaveLength(0);
    });

    it('should handle Supabase query errors', async () => {
      const data = createValidExportData();
      mockFrom.mockImplementation(() =>
        buildChain({ data: null, error: { message: 'DB error' } })
      );

      const result = await service.checkConflicts(data, 'ws-001');
      expect(result.conflicts.some(c => c.includes('Failed to check'))).toBe(true);
    });
  });

  describe('importWorkspaceData', () => {
    function setupInsertMocks(overrides: Record<string, any> = {}) {
      mockFrom.mockImplementation((table: string) => {
        if (overrides[table]) {
          return buildChain(overrides[table]);
        }
        // Default: select returns empty (no conflicts), insert succeeds
        return buildChain({ data: [], error: null });
      });
    }

    it('should reject invalid JSON string input', async () => {
      const report = await service.importWorkspaceData('not valid json');
      expect(report.success).toBe(false);
      expect(report.totalErrors).toBeGreaterThan(0);
    });

    it('should reject data that fails schema validation', async () => {
      const report = await service.importWorkspaceData('{}');
      expect(report.success).toBe(false);
      expect(report.totalErrors).toBeGreaterThan(0);
    });

    it('should accept JSON string input', async () => {
      setupInsertMocks();
      const data = createValidExportData();
      const report = await service.importWorkspaceData(JSON.stringify(data));
      expect(report.success).toBe(true);
      expect(report.totalImported).toBeGreaterThan(0);
    });

    it('should accept object input', async () => {
      setupInsertMocks();
      const data = createValidExportData();
      const report = await service.importWorkspaceData(data);
      expect(report.success).toBe(true);
    });

    it('should import all data types in correct order', async () => {
      const insertedTables: string[] = [];
      mockFrom.mockImplementation((table: string) => {
        const chain: any = {};
        const methods = ['select', 'eq', 'in', 'order', 'single', 'gte', 'lte'];
        for (const m of methods) {
          chain[m] = vi.fn(() => chain);
        }
        chain.insert = vi.fn(() => {
          insertedTables.push(table);
          return Promise.resolve({ data: [], error: null });
        });
        chain.then = (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve);
        return chain;
      });

      const data = createValidExportData();
      const report = await service.importWorkspaceData(data);

      expect(report.success).toBe(true);
      expect(report.entries).toHaveLength(6);
      expect(report.entries[0].table).toBe('policies');
      expect(report.entries[1].table).toBe('policy_versions');
      expect(report.entries[2].table).toBe('comments');
      expect(report.entries[3].table).toBe('comment_replies');
      expect(report.entries[4].table).toBe('audit_log');
      expect(report.entries[5].table).toBe('compliance_mappings');
    });

    it('should generate correct import report totals', async () => {
      setupInsertMocks();
      const data = createValidExportData();
      const report = await service.importWorkspaceData(data);

      expect(report.totalImported).toBe(6); // 1 policy + 1 version + 1 comment + 1 reply + 1 audit + 1 mapping
      expect(report.totalSkipped).toBe(0);
      expect(report.totalErrors).toBe(0);
      expect(report.workspaceId).toBe('ws-001');
      expect(report.dryRun).toBe(false);
      expect(report.startedAt).toBeTruthy();
      expect(report.completedAt).toBeTruthy();
    });

    it('should report errors when inserts fail', async () => {
      mockFrom.mockImplementation(() => {
        const chain: any = {};
        const methods = ['select', 'eq', 'in', 'order', 'single', 'gte', 'lte'];
        for (const m of methods) {
          chain[m] = vi.fn(() => chain);
        }
        chain.insert = vi.fn(() => Promise.resolve({ data: null, error: { message: 'Insert failed' } }));
        chain.then = (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve);
        return chain;
      });

      const data = createValidExportData();
      const report = await service.importWorkspaceData(data);

      expect(report.success).toBe(false);
      expect(report.totalErrors).toBeGreaterThan(0);
    });

    it('should fail when conflicts exist and skipConflicts is false', async () => {
      mockFrom.mockImplementation(() =>
        buildChain({ data: [{ id: 'pol-1', name: 'PII Detection' }], error: null })
      );

      const data = createValidExportData();
      const report = await service.importWorkspaceData(data, { skipConflicts: false });

      expect(report.success).toBe(false);
      expect(report.totalErrors).toBeGreaterThan(0);
    });

    it('should skip conflicting items when skipConflicts is true', async () => {
      const callLog: { table: string; method: string }[] = [];
      mockFrom.mockImplementation((table: string) => {
        const chain: any = {};
        const methods = ['select', 'eq', 'in', 'order', 'single', 'gte', 'lte'];
        for (const m of methods) {
          chain[m] = vi.fn(() => {
            if (m === 'single') return Promise.resolve({ data: [], error: null });
            return chain;
          });
        }
        chain.insert = vi.fn(() => {
          callLog.push({ table, method: 'insert' });
          return Promise.resolve({ data: [], error: null });
        });
        // For the conflict check (select on policies), return existing policy
        chain.then = (resolve: any) => {
          if (table === 'policies') {
            return Promise.resolve({ data: [{ id: 'pol-1', name: 'PII Detection' }], error: null }).then(resolve);
          }
          return Promise.resolve({ data: [], error: null }).then(resolve);
        };
        return chain;
      });

      const data = createValidExportData();
      const report = await service.importWorkspaceData(data, { skipConflicts: true });

      expect(report.success).toBe(true);
      // Policy and its version should be skipped
      const policyEntry = report.entries.find(e => e.table === 'policies');
      expect(policyEntry!.skipped).toBe(1);
      expect(policyEntry!.imported).toBe(0);
    });

    it('should use targetWorkspaceId when provided', async () => {
      setupInsertMocks();
      const data = createValidExportData();
      const report = await service.importWorkspaceData(data, { targetWorkspaceId: 'ws-target' });

      expect(report.workspaceId).toBe('ws-target');
    });
  });

  describe('importWorkspaceData - dry run', () => {
    it('should not write any data in dry-run mode', async () => {
      const insertCalls: string[] = [];
      mockFrom.mockImplementation((table: string) => {
        const chain: any = {};
        const methods = ['select', 'eq', 'in', 'order', 'single', 'gte', 'lte'];
        for (const m of methods) {
          chain[m] = vi.fn(() => chain);
        }
        chain.insert = vi.fn(() => {
          insertCalls.push(table);
          return Promise.resolve({ data: [], error: null });
        });
        chain.then = (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve);
        return chain;
      });

      const data = createValidExportData();
      const report = await service.importWorkspaceData(data, { dryRun: true });

      expect(report.dryRun).toBe(true);
      expect(report.success).toBe(true);
      expect(insertCalls).toHaveLength(0); // No inserts in dry-run
    });

    it('should report what would be imported in dry-run mode', async () => {
      mockFrom.mockImplementation(() =>
        buildChain({ data: [], error: null })
      );

      const data = createValidExportData();
      const report = await service.importWorkspaceData(data, { dryRun: true });

      expect(report.entries).toHaveLength(6);
      expect(report.totalImported).toBe(6); // Would import 6 items
      expect(report.totalSkipped).toBe(0);
    });

    it('should show skipped items in dry-run when conflicts exist', async () => {
      mockFrom.mockImplementation(() =>
        buildChain({ data: [{ id: 'pol-1', name: 'Other' }], error: null })
      );

      const data = createValidExportData();
      const report = await service.importWorkspaceData(data, { dryRun: true, skipConflicts: true });

      const policyEntry = report.entries.find(e => e.table === 'policies');
      expect(policyEntry!.skipped).toBe(1);
    });
  });
});
