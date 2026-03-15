// Unit tests for DataExportService
// Requirements: 1.10

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataExportService } from '../../services/DataExportService';
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
  const methods = ['select', 'eq', 'in', 'order', 'single', 'gte', 'lte'];
  for (const m of methods) {
    chain[m] = vi.fn(() => {
      if (m === 'single') return Promise.resolve(result);
      return chain;
    });
  }
  // Make the chain itself thenable so `await query` works
  chain.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject);
  return chain;
}

describe('DataExportService', () => {
  let service: DataExportService;

  const workspaceId = 'ws-001';
  const userId = 'user-001';

  // Sample DB rows (snake_case, as returned by Supabase)
  const dbPolicy = {
    id: 'pol-1',
    workspace_id: workspaceId,
    name: 'PII Detection',
    description: 'Detects PII',
    current_version: '1.0.0',
    state: 'draft',
    created_by: userId,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
  };

  const dbVersion = {
    id: 'ver-1',
    policy_id: 'pol-1',
    version: '1.0.0',
    code: 'return ALLOW;',
    metadata: { tags: ['pii'], category: 'security', providers: [], models: [], estimatedCost: 0, testCoverage: 80 },
    created_by: userId,
    created_at: '2026-01-01T00:00:00Z',
  };

  const dbComment = {
    id: 'com-1',
    policy_id: 'pol-1',
    version_id: 'ver-1',
    line_number: 5,
    content: 'Looks good',
    author_id: userId,
    resolved: false,
    mentions: [],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  const dbReply = {
    id: 'rep-1',
    comment_id: 'com-1',
    content: 'Thanks!',
    author_id: 'user-002',
    created_at: '2026-01-01T01:00:00Z',
  };

  const dbAuditEvent = {
    id: 'aud-1',
    workspace_id: workspaceId,
    actor_id: userId,
    action: 'policy_created',
    resource_type: 'policy',
    resource_id: 'pol-1',
    metadata: { policyName: 'PII Detection' },
    created_at: '2026-01-01T00:00:00Z',
  };

  const dbMapping = {
    id: 'map-1',
    policy_id: 'pol-1',
    framework_id: 'owasp-asi-2024',
    requirement_id: 'ASI01',
    notes: 'Covers prompt injection',
    created_at: '2026-01-01T00:00:00Z',
  };

  beforeEach(() => {
    service = new DataExportService();
    vi.clearAllMocks();
  });

  // Utility: set up mockFrom to return the right chain per table
  function setupMocks(overrides: Record<string, any> = {}) {
    const tableData: Record<string, any> = {
      workspaces: { data: { name: 'My Workspace' }, error: null },
      policies: { data: [dbPolicy], error: null },
      policy_versions: { data: [dbVersion], error: null },
      comments: { data: [dbComment], error: null },
      comment_replies: { data: [dbReply], error: null },
      audit_log: { data: [dbAuditEvent], error: null },
      compliance_mappings: { data: [dbMapping], error: null },
      ...overrides,
    };

    mockFrom.mockImplementation((table: string) => {
      const result = tableData[table] || { data: [], error: null };
      return buildChain(result);
    });
  }

  describe('exportWorkspaceData', () => {
    it('should export all workspace data with correct metadata', async () => {
      setupMocks();

      const result = await service.exportWorkspaceData(workspaceId, userId);

      expect(result.metadata.exportVersion).toBe('1.0.0');
      expect(result.metadata.workspaceId).toBe(workspaceId);
      expect(result.metadata.workspaceName).toBe('My Workspace');
      expect(result.metadata.exportedBy).toBe(userId);
      expect(result.metadata.exportedAt).toBeTruthy();
    });

    it('should export policies mapped to domain model', async () => {
      setupMocks();

      const result = await service.exportWorkspaceData(workspaceId, userId);

      expect(result.policies).toHaveLength(1);
      expect(result.policies[0].id).toBe('pol-1');
      expect(result.policies[0].workspaceId).toBe(workspaceId);
      expect(result.policies[0].name).toBe('PII Detection');
      expect(result.policies[0].state).toBe('draft');
      expect(result.policies[0].createdAt).toBeInstanceOf(Date);
    });

    it('should export policy versions', async () => {
      setupMocks();

      const result = await service.exportWorkspaceData(workspaceId, userId);

      expect(result.policyVersions).toHaveLength(1);
      expect(result.policyVersions[0].id).toBe('ver-1');
      expect(result.policyVersions[0].policyId).toBe('pol-1');
      expect(result.policyVersions[0].version).toBe('1.0.0');
      expect(result.policyVersions[0].code).toBe('return ALLOW;');
    });

    it('should export comments and replies', async () => {
      setupMocks();

      const result = await service.exportWorkspaceData(workspaceId, userId);

      expect(result.comments).toHaveLength(1);
      expect(result.comments[0].id).toBe('com-1');
      expect(result.comments[0].content).toBe('Looks good');

      expect(result.commentReplies).toHaveLength(1);
      expect(result.commentReplies[0].id).toBe('rep-1');
      expect(result.commentReplies[0].commentId).toBe('com-1');
    });

    it('should export audit log events', async () => {
      setupMocks();

      const result = await service.exportWorkspaceData(workspaceId, userId);

      expect(result.auditLog).toHaveLength(1);
      expect(result.auditLog[0].id).toBe('aud-1');
      expect(result.auditLog[0].action).toBe('policy_created');
      expect(result.auditLog[0].resourceType).toBe('policy');
    });

    it('should export compliance mappings', async () => {
      setupMocks();

      const result = await service.exportWorkspaceData(workspaceId, userId);

      expect(result.complianceMappings).toHaveLength(1);
      expect(result.complianceMappings[0].id).toBe('map-1');
      expect(result.complianceMappings[0].frameworkId).toBe('owasp-asi-2024');
      expect(result.complianceMappings[0].requirementId).toBe('ASI01');
    });

    it('should generate valid JSON output', async () => {
      setupMocks();

      const result = await service.exportWorkspaceData(workspaceId, userId);
      const json = JSON.stringify(result);
      const parsed = JSON.parse(json);

      expect(parsed.metadata).toBeDefined();
      expect(parsed.policies).toBeDefined();
      expect(parsed.policyVersions).toBeDefined();
      expect(parsed.comments).toBeDefined();
      expect(parsed.commentReplies).toBeDefined();
      expect(parsed.auditLog).toBeDefined();
      expect(parsed.complianceMappings).toBeDefined();
    });

    it('should return empty arrays when workspace has no data', async () => {
      setupMocks({
        policies: { data: [], error: null },
        policy_versions: { data: [], error: null },
        comments: { data: [], error: null },
        comment_replies: { data: [], error: null },
        audit_log: { data: [], error: null },
        compliance_mappings: { data: [], error: null },
      });

      const result = await service.exportWorkspaceData(workspaceId, userId);

      expect(result.policies).toEqual([]);
      expect(result.policyVersions).toEqual([]);
      expect(result.comments).toEqual([]);
      expect(result.commentReplies).toEqual([]);
      expect(result.auditLog).toEqual([]);
      expect(result.complianceMappings).toEqual([]);
    });

    it('should throw when workspace is not found', async () => {
      mockFrom.mockImplementation(() =>
        buildChain({ data: null, error: { message: 'Not found' } })
      );

      await expect(
        service.exportWorkspaceData('nonexistent', userId)
      ).rejects.toThrow('Workspace not found');
    });
  });

  describe('downloadExport', () => {
    it('should create a download link and trigger click', () => {
      const mockClick = vi.fn();
      const mockAppendChild = vi.fn();
      const mockRemoveChild = vi.fn();
      const mockCreateObjectURL = vi.fn(() => 'blob:test-url');
      const mockRevokeObjectURL = vi.fn();

      const mockLink = {
        href: '',
        download: '',
        click: mockClick,
      };

      vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      vi.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild);
      vi.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild);
      global.URL.createObjectURL = mockCreateObjectURL;
      global.URL.revokeObjectURL = mockRevokeObjectURL;

      const exportData: WorkspaceExportData = {
        metadata: {
          exportVersion: '1.0.0',
          exportedAt: new Date().toISOString(),
          workspaceId: 'ws-001',
          workspaceName: 'Test',
          exportedBy: 'user-001',
        },
        policies: [],
        policyVersions: [],
        comments: [],
        commentReplies: [],
        auditLog: [],
        complianceMappings: [],
      };

      service.downloadExport(exportData);

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:test-url');
      expect(mockLink.download).toContain('workspace-export-ws-001');
    });
  });
});
