// Comprehensive unit tests for ComplianceService and ComplianceReportService
// Task 7.1.6: Test framework mapping, coverage calculation, report generation, custom frameworks
// Requirements: 8.1-8.10, 9.1-9.10

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComplianceService } from '@/services/ComplianceService';
import { ComplianceReportService } from '@/services/ComplianceReportService';
import { BUILT_IN_FRAMEWORKS, getFrameworkById } from '@/data/compliance-frameworks';
import type { ComplianceFramework } from '@/types/compliance';
import type { ComplianceReport, PolicyReportEntry, ReportSummary, AuditSummary } from '@/types/compliance-report';

// --- Mock supabase ---

const mockFrom = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: { from: (...args: any[]) => mockFrom(...args) },
  isSupabaseConfigured: vi.fn(() => true),
}));

// --- Mock complianceService for ComplianceReportService ---

const mockGetPolicyMappings = vi.fn();

vi.mock('@/services/ComplianceService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/ComplianceService')>();
  return {
    ...actual,
    complianceService: {
      getPolicyMappings: (...args: any[]) => mockGetPolicyMappings(...args),
    },
  };
});

// --- Chainable query builder helper ---

function chain(overrides: Record<string, any> = {}) {
  const self: any = new Promise((resolve) => resolve(self));
  const methods = [
    'select', 'insert', 'update', 'delete',
    'eq', 'in', 'gte', 'lte', 'or',
    'order', 'single', 'limit',
  ];
  for (const m of methods) {
    self[m] = vi.fn(() => self);
  }
  // Allow overrides to replace specific terminal methods
  Object.assign(self, overrides);
  // Make it thenable with data/error
  self.then = undefined; // remove Promise thenable so it acts as plain object
  return self;
}

// --- Helper to build a mock report for ComplianceReportService tests ---

function makeMockReport(overrides: Partial<ComplianceReport> = {}): ComplianceReport {
  return {
    id: 'report-1',
    workspaceId: 'ws-1',
    frameworkId: 'owasp-asi-2024',
    generatedAt: new Date('2026-06-01T12:00:00Z'),
    generatedBy: 'user-1',
    filters: {},
    summary: {
      totalPolicies: 2,
      mappedPolicies: 1,
      coveragePercentage: 50,
      averageTestCoverage: 75,
      averageSuccessRate: 90,
    },
    policies: [
      {
        policy: {
          id: 'p-1', workspaceId: 'ws-1', name: 'PII Detection',
          description: 'Detects PII', currentVersion: '1.0.0',
          state: 'production' as any, createdBy: 'user-1',
          createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-06-01'),
        },
        version: {
          id: 'v-1', policyId: 'p-1', version: '1.0.0',
          code: 'const x = 1;', metadata: { tags: [], category: 'security', providers: [], models: [], estimatedCost: 0, testCoverage: 80 },
          createdBy: 'user-1', createdAt: new Date('2026-01-01'),
        },
        mappings: [{ id: 'm-1', policyId: 'p-1', frameworkId: 'owasp-asi-2024', requirementId: 'asi01', notes: 'PII mapping', createdAt: new Date() }],
        testCoverage: 80,
        successRate: 95,
        approvalStatus: 'approved',
        lastModified: new Date('2026-06-01'),
      },
      {
        policy: {
          id: 'p-2', workspaceId: 'ws-1', name: 'Cost Control',
          description: 'Controls cost', currentVersion: '2.0.0',
          state: 'draft' as any, createdBy: 'user-2',
          createdAt: new Date('2026-02-01'), updatedAt: new Date('2026-05-01'),
        },
        version: {
          id: 'v-2', policyId: 'p-2', version: '2.0.0',
          code: 'const y = 2;', metadata: { tags: [], category: 'cost', providers: [], models: [], estimatedCost: 5, testCoverage: 70 },
          createdBy: 'user-2', createdAt: new Date('2026-02-01'),
        },
        mappings: [],
        testCoverage: 70,
        successRate: 85,
        approvalStatus: 'No approvals',
        lastModified: new Date('2026-05-01'),
      },
    ],
    auditSummary: {
      totalChanges: 5,
      totalApprovals: 2,
      totalDeployments: 1,
      recentEvents: [],
    },
    ...overrides,
  };
}

// ============================================================
// ComplianceService Tests
// ============================================================

describe('ComplianceService', () => {
  let service: ComplianceService;

  beforeEach(() => {
    service = new ComplianceService();
    vi.clearAllMocks();
  });

  // --- 1. getBuiltInFrameworks ---

  describe('getBuiltInFrameworks', () => {
    it('should return exactly 5 built-in frameworks', () => {
      const frameworks = service.getBuiltInFrameworks();
      expect(frameworks).toHaveLength(5);
    });

    it('should include all expected framework IDs', () => {
      const frameworks = service.getBuiltInFrameworks();
      const ids = frameworks.map(f => f.id);
      expect(ids).toContain('owasp-asi-2024');
      expect(ids).toContain('nist-ai-rmf-1.0');
      expect(ids).toContain('soc2-type-ii');
      expect(ids).toContain('iso-27001-2022');
      expect(ids).toContain('gdpr-2018');
    });

    it('should return frameworks with non-empty requirements', () => {
      const frameworks = service.getBuiltInFrameworks();
      for (const fw of frameworks) {
        expect(fw.requirements.length).toBeGreaterThan(0);
        expect(fw.name).toBeTruthy();
        expect(fw.version).toBeTruthy();
      }
    });

    it('should have OWASP framework with 10 requirements (ASI01-ASI10)', () => {
      const frameworks = service.getBuiltInFrameworks();
      const owasp = frameworks.find(f => f.id === 'owasp-asi-2024')!;
      expect(owasp.requirements).toHaveLength(10);
      expect(owasp.requirements[0].code).toBe('ASI01');
    });
  });

  // --- 2. mapPolicyToRequirement ---

  describe('mapPolicyToRequirement', () => {
    it('should create a mapping and return mapped result', async () => {
      const now = new Date().toISOString();
      const mockMapping = {
        id: 'map-1', policy_id: 'p-1', framework_id: 'owasp-asi-2024',
        requirement_id: 'asi01', notes: 'Maps PII detection', created_at: now,
      };

      // First call: compliance_mappings SELECT (check existing) -> no existing
      // Second call: compliance_mappings INSERT -> returns mapping
      // Third call: audit_log INSERT
      mockFrom.mockImplementation((table: string) => {
        if (table === 'compliance_mappings') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    limit: vi.fn(() => ({
                      single: vi.fn().mockResolvedValue({ data: null, error: null }),
                    })),
                  })),
                })),
              })),
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: mockMapping, error: null }),
              })),
            })),
          } as any;
        }
        if (table === 'audit_log') {
          return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) } as any;
        }
        return {} as any;
      });

      const result = await service.mapPolicyToRequirement({
        policyId: 'p-1', frameworkId: 'owasp-asi-2024', requirementId: 'asi01',
        notes: 'Maps PII detection', workspaceId: 'ws-1', userId: 'user-1',
      });

      expect(result.id).toBe('map-1');
      expect(result.policyId).toBe('p-1');
      expect(result.frameworkId).toBe('owasp-asi-2024');
      expect(result.requirementId).toBe('asi01');
      expect(result.notes).toBe('Maps PII detection');
    });

    it('should throw for invalid framework ID', async () => {
      await expect(
        service.mapPolicyToRequirement({
          policyId: 'p-1', frameworkId: 'nonexistent-framework', requirementId: 'r-1',
          notes: '', workspaceId: 'ws-1', userId: 'user-1',
        })
      ).rejects.toThrow('Framework not found: nonexistent-framework');
    });

    it('should throw for invalid requirement ID', async () => {
      await expect(
        service.mapPolicyToRequirement({
          policyId: 'p-1', frameworkId: 'owasp-asi-2024', requirementId: 'nonexistent-req',
          notes: '', workspaceId: 'ws-1', userId: 'user-1',
        })
      ).rejects.toThrow('Requirement not found: nonexistent-req');
    });

    it('should throw when mapping already exists', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'compliance_mappings') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    limit: vi.fn(() => ({
                      single: vi.fn().mockResolvedValue({ data: { id: 'existing-map' }, error: null }),
                    })),
                  })),
                })),
              })),
            })),
          } as any;
        }
        return {} as any;
      });

      await expect(
        service.mapPolicyToRequirement({
          policyId: 'p-1', frameworkId: 'owasp-asi-2024', requirementId: 'asi01',
          notes: '', workspaceId: 'ws-1', userId: 'user-1',
        })
      ).rejects.toThrow('Mapping already exists');
    });

    it('should throw when Supabase insert fails', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'compliance_mappings') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    limit: vi.fn(() => ({
                      single: vi.fn().mockResolvedValue({ data: null, error: null }),
                    })),
                  })),
                })),
              })),
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
              })),
            })),
          } as any;
        }
        return {} as any;
      });

      await expect(
        service.mapPolicyToRequirement({
          policyId: 'p-1', frameworkId: 'owasp-asi-2024', requirementId: 'asi01',
          notes: '', workspaceId: 'ws-1', userId: 'user-1',
        })
      ).rejects.toThrow('Failed to create mapping: DB error');
    });
  });

  // --- 3. unmapPolicy ---

  describe('unmapPolicy', () => {
    it('should delete an existing mapping', async () => {
      const deleteFn = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'compliance_mappings') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'map-1', workspace_id: 'ws-1', created_by: 'user-1', policy_id: 'p-1', framework_id: 'owasp-asi-2024', requirement_id: 'asi01' },
                  error: null,
                }),
              })),
            })),
            delete: deleteFn,
          } as any;
        }
        if (table === 'audit_log') {
          return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) } as any;
        }
        return {} as any;
      });

      await expect(service.unmapPolicy('map-1')).resolves.toBeUndefined();
    });

    it('should throw when mapping not found', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'compliance_mappings') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
              })),
            })),
          } as any;
        }
        return {} as any;
      });

      await expect(service.unmapPolicy('nonexistent')).rejects.toThrow('Mapping not found');
    });

    it('should throw when delete fails', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'compliance_mappings') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'map-1', workspace_id: 'ws-1', created_by: 'user-1', policy_id: 'p-1', framework_id: 'fw-1', requirement_id: 'r-1' },
                  error: null,
                }),
              })),
            })),
            delete: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'Delete failed' } }),
            })),
          } as any;
        }
        return {} as any;
      });

      await expect(service.unmapPolicy('map-1')).rejects.toThrow('Failed to delete mapping: Delete failed');
    });
  });

  // --- 4. getPolicyMappings ---

  describe('getPolicyMappings', () => {
    it('should return mappings for a policy', async () => {
      const now = new Date().toISOString();
      mockFrom.mockImplementation((table: string) => {
        if (table === 'compliance_mappings') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn().mockResolvedValue({
                  data: [
                    { id: 'm-1', policy_id: 'p-1', framework_id: 'owasp-asi-2024', requirement_id: 'asi01', notes: 'note1', created_at: now },
                    { id: 'm-2', policy_id: 'p-1', framework_id: 'nist-ai-rmf-1.0', requirement_id: 'govern-1', notes: 'note2', created_at: now },
                  ],
                  error: null,
                }),
              })),
            })),
          } as any;
        }
        return {} as any;
      });

      const mappings = await service.getPolicyMappings('p-1');
      expect(mappings).toHaveLength(2);
      expect(mappings[0].policyId).toBe('p-1');
      expect(mappings[1].frameworkId).toBe('nist-ai-rmf-1.0');
    });

    it('should return empty array when no mappings exist', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'compliance_mappings') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              })),
            })),
          } as any;
        }
        return {} as any;
      });

      const mappings = await service.getPolicyMappings('p-no-mappings');
      expect(mappings).toHaveLength(0);
    });

    it('should throw when query fails', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'compliance_mappings') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Query error' } }),
              })),
            })),
          } as any;
        }
        return {} as any;
      });

      await expect(service.getPolicyMappings('p-1')).rejects.toThrow('Failed to get policy mappings');
    });
  });

  // --- 5. calculateCoverage ---

  describe('calculateCoverage', () => {
    it('should calculate correct coverage percentage', async () => {
      // Map 3 out of 10 OWASP requirements
      mockFrom.mockImplementation((table: string) => {
        if (table === 'policies') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: [{ id: 'p-1' }, { id: 'p-2' }], error: null }),
            })),
          } as any;
        }
        if (table === 'compliance_mappings') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({
                  data: [
                    { requirement_id: 'asi01' },
                    { requirement_id: 'asi02' },
                    { requirement_id: 'asi03' },
                  ],
                  error: null,
                }),
              })),
            })),
          } as any;
        }
        return {} as any;
      });

      const coverage = await service.calculateCoverage('ws-1', 'owasp-asi-2024');
      expect(coverage.frameworkId).toBe('owasp-asi-2024');
      expect(coverage.totalRequirements).toBe(10);
      expect(coverage.mappedRequirements).toBe(3);
      expect(coverage.coveragePercentage).toBe(30);
      expect(coverage.unmappedRequirements).toHaveLength(7);
    });

    it('should return 0% coverage when no policies exist in workspace', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'policies') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            })),
          } as any;
        }
        return {} as any;
      });

      const coverage = await service.calculateCoverage('ws-empty', 'owasp-asi-2024');
      expect(coverage.coveragePercentage).toBe(0);
      expect(coverage.mappedRequirements).toBe(0);
      expect(coverage.unmappedRequirements).toHaveLength(10);
    });

    it('should return 100% when all requirements are mapped', async () => {
      const owasp = getFrameworkById('owasp-asi-2024')!;
      const allReqIds = owasp.requirements.map(r => r.id);

      mockFrom.mockImplementation((table: string) => {
        if (table === 'policies') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: [{ id: 'p-1' }], error: null }),
            })),
          } as any;
        }
        if (table === 'compliance_mappings') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({
                  data: allReqIds.map(id => ({ requirement_id: id })),
                  error: null,
                }),
              })),
            })),
          } as any;
        }
        return {} as any;
      });

      const coverage = await service.calculateCoverage('ws-1', 'owasp-asi-2024');
      expect(coverage.coveragePercentage).toBe(100);
      expect(coverage.unmappedRequirements).toHaveLength(0);
    });

    it('should deduplicate requirement IDs from multiple mappings', async () => {
      // Two mappings for the same requirement should count as 1
      mockFrom.mockImplementation((table: string) => {
        if (table === 'policies') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: [{ id: 'p-1' }, { id: 'p-2' }], error: null }),
            })),
          } as any;
        }
        if (table === 'compliance_mappings') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({
                  data: [
                    { requirement_id: 'asi01' },
                    { requirement_id: 'asi01' }, // duplicate
                    { requirement_id: 'asi02' },
                  ],
                  error: null,
                }),
              })),
            })),
          } as any;
        }
        return {} as any;
      });

      const coverage = await service.calculateCoverage('ws-1', 'owasp-asi-2024');
      expect(coverage.mappedRequirements).toBe(2); // deduplicated
      expect(coverage.coveragePercentage).toBe(20);
    });

    it('should throw for invalid framework', async () => {
      await expect(
        service.calculateCoverage('ws-1', 'nonexistent-framework')
      ).rejects.toThrow('Framework not found');
    });
  });

  // --- 6. getUnmappedRequirements ---

  describe('getUnmappedRequirements', () => {
    it('should return only unmapped requirements', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'policies') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: [{ id: 'p-1' }], error: null }),
            })),
          } as any;
        }
        if (table === 'compliance_mappings') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({
                  data: [{ requirement_id: 'asi01' }, { requirement_id: 'asi02' }],
                  error: null,
                }),
              })),
            })),
          } as any;
        }
        return {} as any;
      });

      const unmapped = await service.getUnmappedRequirements('ws-1', 'owasp-asi-2024');
      expect(unmapped).toHaveLength(8);
      const unmappedIds = unmapped.map(r => r.id);
      expect(unmappedIds).not.toContain('asi01');
      expect(unmappedIds).not.toContain('asi02');
      expect(unmappedIds).toContain('asi03');
    });

    it('should return all requirements when none are mapped', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'policies') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: [{ id: 'p-1' }], error: null }),
            })),
          } as any;
        }
        if (table === 'compliance_mappings') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({ data: [], error: null }),
              })),
            })),
          } as any;
        }
        return {} as any;
      });

      const unmapped = await service.getUnmappedRequirements('ws-1', 'owasp-asi-2024');
      expect(unmapped).toHaveLength(10);
    });
  });

  // --- 7. loadCustomFramework ---

  describe('loadCustomFramework', () => {
    it('should accept and return a valid custom framework', async () => {
      const custom: ComplianceFramework = {
        id: 'custom-sec-1',
        name: 'Custom Security Framework',
        version: '2.0',
        requirements: [
          { id: 'cs-1', frameworkId: 'custom-sec-1', code: 'CS-01', title: 'Auth Check', description: 'Verify auth', category: 'Auth' },
          { id: 'cs-2', frameworkId: 'custom-sec-1', code: 'CS-02', title: 'Data Encrypt', description: 'Encrypt data', category: 'Data' },
        ],
      };

      const result = await service.loadCustomFramework('ws-1', custom);
      expect(result.id).toBe('custom-sec-1');
      expect(result.name).toBe('Custom Security Framework');
      expect(result.requirements).toHaveLength(2);
      // Ensure frameworkId is set on each requirement
      for (const req of result.requirements) {
        expect(req.frameworkId).toBe('custom-sec-1');
      }
    });

    it('should reject framework with empty id', async () => {
      await expect(
        service.loadCustomFramework('ws-1', { id: '', name: 'X', version: '1.0', requirements: [{ id: 'r1', frameworkId: '', code: 'R1', title: 'T', description: 'D', category: 'C' }] })
      ).rejects.toThrow('Invalid framework: missing required fields');
    });

    it('should reject framework with empty name', async () => {
      await expect(
        service.loadCustomFramework('ws-1', { id: 'x', name: '', version: '1.0', requirements: [{ id: 'r1', frameworkId: 'x', code: 'R1', title: 'T', description: 'D', category: 'C' }] })
      ).rejects.toThrow('Invalid framework: missing required fields');
    });

    it('should reject framework with empty requirements array', async () => {
      await expect(
        service.loadCustomFramework('ws-1', { id: 'x', name: 'X', version: '1.0', requirements: [] })
      ).rejects.toThrow('Invalid framework: requirements must be a non-empty array');
    });

    it('should reject requirement missing required fields', async () => {
      await expect(
        service.loadCustomFramework('ws-1', {
          id: 'x', name: 'X', version: '1.0',
          requirements: [{ id: 'r1', frameworkId: 'x', code: '', title: '', description: '', category: '' }],
        })
      ).rejects.toThrow('Invalid requirement: missing required fields');
    });
  });

  // --- 8. exportMappings ---

  describe('exportMappings', () => {
    const setupExportMock = (mappings: any[] = [], policies: any[] = []) => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'policies') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: policies, error: null }),
            })),
          } as any;
        }
        if (table === 'compliance_mappings') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() => ({
                eq: vi.fn(() => ({
                  order: vi.fn().mockResolvedValue({ data: mappings, error: null }),
                })),
                order: vi.fn().mockResolvedValue({ data: mappings, error: null }),
              })),
            })),
          } as any;
        }
        return {} as any;
      });
    };

    it('should export as JSON with enriched data', async () => {
      const now = new Date().toISOString();
      setupExportMock(
        [{ id: 'map-1', policy_id: 'p-1', framework_id: 'owasp-asi-2024', requirement_id: 'asi01', notes: 'note', created_at: now }],
        [{ id: 'p-1', name: 'PII Policy', current_version: '1.0.0', state: 'production' }],
      );

      const result = await service.exportMappings({ workspaceId: 'ws-1', format: 'json' });
      const parsed = JSON.parse(result);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].policy_name).toBe('PII Policy');
      expect(parsed[0].framework_name).toBe('OWASP ASI 2024');
      expect(parsed[0].requirement_code).toBe('ASI01');
    });

    it('should export as CSV with headers and data rows', async () => {
      const now = new Date().toISOString();
      setupExportMock(
        [{ id: 'map-1', policy_id: 'p-1', framework_id: 'owasp-asi-2024', requirement_id: 'asi01', notes: 'note', created_at: now }],
        [{ id: 'p-1', name: 'PII Policy', current_version: '1.0.0', state: 'production' }],
      );

      const result = await service.exportMappings({ workspaceId: 'ws-1', format: 'csv' });
      const lines = result.split('\n');
      expect(lines.length).toBeGreaterThanOrEqual(2); // header + at least 1 data row
      expect(lines[0]).toContain('mapping_id');
      expect(lines[0]).toContain('policy_name');
      expect(lines[1]).toContain('PII Policy');
    });

    it('should return empty JSON array when no policies exist', async () => {
      setupExportMock([], []);
      const result = await service.exportMappings({ workspaceId: 'ws-empty', format: 'json' });
      expect(result).toBe('[]');
    });

    it('should return "No mappings found" for CSV when no policies', async () => {
      setupExportMock([], []);
      const result = await service.exportMappings({ workspaceId: 'ws-empty', format: 'csv' });
      expect(result).toBe('No mappings found');
    });

    it('should filter by frameworkId when provided', async () => {
      const now = new Date().toISOString();
      setupExportMock(
        [{ id: 'map-1', policy_id: 'p-1', framework_id: 'owasp-asi-2024', requirement_id: 'asi01', notes: '', created_at: now }],
        [{ id: 'p-1', name: 'Policy', current_version: '1.0.0', state: 'draft' }],
      );

      const result = await service.exportMappings({ workspaceId: 'ws-1', frameworkId: 'owasp-asi-2024', format: 'json' });
      const parsed = JSON.parse(result);
      expect(parsed).toHaveLength(1);
    });
  });

  // --- 9. getFramework ---

  describe('getFramework', () => {
    it('should return a built-in framework by ID', async () => {
      const fw = await service.getFramework('ws-1', 'owasp-asi-2024');
      expect(fw).not.toBeNull();
      expect(fw!.id).toBe('owasp-asi-2024');
      expect(fw!.name).toBe('OWASP ASI 2024');
    });

    it('should return null for unknown framework ID', async () => {
      const fw = await service.getFramework('ws-1', 'unknown-framework');
      expect(fw).toBeNull();
    });
  });

  // --- 10. listFrameworks ---

  describe('listFrameworks', () => {
    it('should return all built-in frameworks', async () => {
      const frameworks = await service.listFrameworks('ws-1');
      expect(frameworks).toHaveLength(5);
      const ids = frameworks.map(f => f.id);
      expect(ids).toContain('owasp-asi-2024');
      expect(ids).toContain('gdpr-2018');
    });

    it('should return a copy (not the same reference)', async () => {
      const frameworks1 = await service.listFrameworks('ws-1');
      const frameworks2 = await service.listFrameworks('ws-1');
      expect(frameworks1).not.toBe(frameworks2);
    });
  });

  // --- 11. FRAMEWORKS constant ---

  describe('FRAMEWORKS constant', () => {
    it('should expose all 5 framework ID constants', () => {
      expect(service.FRAMEWORKS.OWASP_ASI).toBe('owasp-asi-2024');
      expect(service.FRAMEWORKS.NIST_AI_RMF).toBe('nist-ai-rmf-1.0');
      expect(service.FRAMEWORKS.SOC2_TYPE_II).toBe('soc2-type-ii');
      expect(service.FRAMEWORKS.ISO_27001).toBe('iso-27001-2022');
      expect(service.FRAMEWORKS.GDPR).toBe('gdpr-2018');
    });
  });
});

// ============================================================
// ComplianceReportService Tests
// ============================================================

describe('ComplianceReportService', () => {
  let reportService: ComplianceReportService;

  beforeEach(() => {
    reportService = new ComplianceReportService();
    vi.clearAllMocks();
  });

  // --- 1. generateReport ---

  describe('generateReport', () => {
    it('should generate a report with policy entries and audit summary', async () => {
      const now = new Date().toISOString();

      // Mock policies query
      mockFrom.mockImplementation((table: string) => {
        if (table === 'policies') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn().mockResolvedValue({
                  data: [{
                    id: 'p-1', workspace_id: 'ws-1', name: 'PII Detection',
                    description: 'Detects PII', current_version: '1.0.0',
                    state: 'production', created_by: 'user-1',
                    created_at: now, updated_at: now,
                  }],
                  error: null,
                }),
              })),
            })),
          } as any;
        }
        if (table === 'policy_versions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: 'v-1', policy_id: 'p-1', version: '1.0.0',
                      code: 'const x = 1;',
                      metadata: { tags: [], category: 'security', providers: [], models: [], estimatedCost: 0, testCoverage: 85 },
                      created_by: 'user-1', created_at: now,
                    },
                    error: null,
                  }),
                })),
              })),
            })),
          } as any;
        }
        if (table === 'analytics_events') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({
                  data: [
                    { metadata: { success: true } },
                    { metadata: { success: true } },
                    { metadata: { success: false } },
                  ],
                  error: null,
                }),
              })),
            })),
          } as any;
        }
        if (table === 'policy_approvals') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({
                      data: { status: 'approved' },
                      error: null,
                    }),
                  })),
                })),
              })),
            })),
          } as any;
        }
        if (table === 'audit_log') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn().mockResolvedValue({
                  data: [
                    { id: 'ae-1', workspace_id: 'ws-1', actor_id: 'user-1', action: 'policy_created', resource_type: 'policy', resource_id: 'p-1', metadata: {}, created_at: now },
                    { id: 'ae-2', workspace_id: 'ws-1', actor_id: 'user-1', action: 'policy_approved', resource_type: 'policy', resource_id: 'p-1', metadata: {}, created_at: now },
                  ],
                  error: null,
                }),
              })),
            })),
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          } as any;
        }
        return {} as any;
      });

      mockGetPolicyMappings.mockResolvedValue([
        { id: 'm-1', policyId: 'p-1', frameworkId: 'owasp-asi-2024', requirementId: 'asi01', notes: '', createdAt: new Date() },
      ]);

      const report = await reportService.generateReport({
        workspaceId: 'ws-1',
        frameworkId: 'owasp-asi-2024',
        userId: 'user-1',
      });

      expect(report.id).toBeTruthy();
      expect(report.workspaceId).toBe('ws-1');
      expect(report.frameworkId).toBe('owasp-asi-2024');
      expect(report.generatedBy).toBe('user-1');
      expect(report.policies).toHaveLength(1);
      expect(report.policies[0].policy.name).toBe('PII Detection');
      expect(report.policies[0].version.version).toBe('1.0.0');
      expect(report.policies[0].approvalStatus).toBe('approved');
      expect(report.summary.totalPolicies).toBe(1);
      expect(report.auditSummary).toBeDefined();
      expect(report.auditSummary.totalApprovals).toBe(1);
    });

    it('should throw for invalid framework', async () => {
      await expect(
        reportService.generateReport({
          workspaceId: 'ws-1',
          frameworkId: 'nonexistent',
          userId: 'user-1',
        })
      ).rejects.toThrow('Framework not found: nonexistent');
    });

    it('should handle workspace with no policies', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'policies') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              })),
            })),
          } as any;
        }
        if (table === 'audit_log') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              })),
            })),
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          } as any;
        }
        return {} as any;
      });

      const report = await reportService.generateReport({
        workspaceId: 'ws-empty',
        frameworkId: 'owasp-asi-2024',
        userId: 'user-1',
      });

      expect(report.policies).toHaveLength(0);
      expect(report.summary.totalPolicies).toBe(0);
      expect(report.summary.coveragePercentage).toBe(0);
      expect(report.summary.averageTestCoverage).toBe(0);
      expect(report.summary.averageSuccessRate).toBe(0);
    });
  });

  // --- 2. exportCSV ---

  describe('exportCSV', () => {
    it('should generate CSV with correct headers', async () => {
      const report = makeMockReport();
      const csv = await reportService.exportCSV(report);
      const lines = csv.split('\n');

      expect(lines[0]).toBe('Policy Name,Version,State,Test Coverage (%),Success Rate (%),Approval Status,Mapped Requirements,Last Modified,Created By');
    });

    it('should include one data row per policy entry', async () => {
      const report = makeMockReport();
      const csv = await reportService.exportCSV(report);
      const lines = csv.split('\n');

      // header + 2 policy rows
      expect(lines).toHaveLength(3);
    });

    it('should contain correct policy data in CSV rows', async () => {
      const report = makeMockReport();
      const csv = await reportService.exportCSV(report);

      expect(csv).toContain('PII Detection');
      expect(csv).toContain('1.0.0');
      expect(csv).toContain('production');
      expect(csv).toContain('80'); // testCoverage
      expect(csv).toContain('95'); // successRate
      expect(csv).toContain('Cost Control');
      expect(csv).toContain('2.0.0');
    });

    it('should escape CSV values containing commas', async () => {
      const report = makeMockReport();
      // Modify a policy name to contain a comma
      report.policies[0].policy.name = 'PII, Detection Policy';
      const csv = await reportService.exportCSV(report);

      expect(csv).toContain('"PII, Detection Policy"');
    });

    it('should handle empty policies array', async () => {
      const report = makeMockReport({ policies: [] });
      const csv = await reportService.exportCSV(report);
      const lines = csv.split('\n');

      // Only header row
      expect(lines).toHaveLength(1);
      expect(lines[0]).toContain('Policy Name');
    });
  });

  // --- 3. exportPDF ---

  describe('exportPDF', () => {
    it('should return a Blob', async () => {
      const report = makeMockReport();
      const blob = await reportService.exportPDF(report);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('text/html');
    });

    it('should include framework name in HTML content', async () => {
      const report = makeMockReport();
      const blob = await reportService.exportPDF(report);
      const html = await blob.text();

      expect(html).toContain('OWASP ASI 2024');
      expect(html).toContain('Compliance Report');
    });

    it('should apply branding when provided', async () => {
      const report = makeMockReport();
      const blob = await reportService.exportPDF(report, {
        organizationName: 'TealTiger Corp',
        primaryColor: '#00AA55',
        footer: 'Confidential - TealTiger',
      });
      const html = await blob.text();

      expect(html).toContain('TealTiger Corp');
      expect(html).toContain('#00AA55');
      expect(html).toContain('Confidential - TealTiger');
    });

    it('should include policy details in HTML table', async () => {
      const report = makeMockReport();
      const blob = await reportService.exportPDF(report);
      const html = await blob.text();

      expect(html).toContain('PII Detection');
      expect(html).toContain('Cost Control');
    });

    it('should include audit summary in HTML', async () => {
      const report = makeMockReport();
      const blob = await reportService.exportPDF(report);
      const html = await blob.text();

      expect(html).toContain('Audit Summary');
      expect(html).toContain('Total Changes: 5');
      expect(html).toContain('Total Approvals: 2');
    });
  });

  // --- 4. scheduleReport ---

  describe('scheduleReport', () => {
    it('should store schedule configuration in Supabase', async () => {
      const insertFn = vi.fn().mockResolvedValue({ data: null, error: null });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'scheduled_reports') {
          return { insert: insertFn } as any;
        }
        if (table === 'audit_log') {
          return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) } as any;
        }
        return {} as any;
      });

      await reportService.scheduleReport({
        workspaceId: 'ws-1',
        frameworkId: 'owasp-asi-2024',
        schedule: 'weekly',
        recipients: ['user-1@example.com', 'user-2@example.com'],
        userId: 'user-1',
      });

      expect(insertFn).toHaveBeenCalledWith(
        expect.objectContaining({
          workspace_id: 'ws-1',
          framework_id: 'owasp-asi-2024',
          schedule: 'weekly',
          recipients: ['user-1@example.com', 'user-2@example.com'],
          created_by: 'user-1',
          enabled: true,
        })
      );
    });

    it('should throw when Supabase insert fails', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'scheduled_reports') {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: { message: 'Insert failed' } }),
          } as any;
        }
        return {} as any;
      });

      await expect(
        reportService.scheduleReport({
          workspaceId: 'ws-1',
          frameworkId: 'owasp-asi-2024',
          schedule: 'monthly',
          recipients: ['admin@example.com'],
          userId: 'user-1',
        })
      ).rejects.toThrow('Failed to schedule report: Insert failed');
    });

    it('should log an audit event after scheduling', async () => {
      const auditInsertFn = vi.fn().mockResolvedValue({ data: null, error: null });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'scheduled_reports') {
          return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) } as any;
        }
        if (table === 'audit_log') {
          return { insert: auditInsertFn } as any;
        }
        return {} as any;
      });

      await reportService.scheduleReport({
        workspaceId: 'ws-1',
        frameworkId: 'owasp-asi-2024',
        schedule: 'weekly',
        recipients: ['user@example.com'],
        userId: 'user-1',
      });

      expect(auditInsertFn).toHaveBeenCalledWith(
        expect.objectContaining({
          workspace_id: 'ws-1',
          actor_id: 'user-1',
          action: 'compliance_report_scheduled',
        })
      );
    });
  });
});
