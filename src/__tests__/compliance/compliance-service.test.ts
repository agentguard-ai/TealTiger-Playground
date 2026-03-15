// Unit tests for ComplianceService
// Requirements: 8.1-8.10

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComplianceService } from '../../services/ComplianceService';
import { BUILT_IN_FRAMEWORKS } from '../../data/compliance-frameworks';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn()
  },
  isSupabaseConfigured: () => true
}));

describe('ComplianceService', () => {
  let service: ComplianceService;

  beforeEach(() => {
    service = new ComplianceService();
    vi.clearAllMocks();
  });

  describe('Built-in Frameworks', () => {
    it('should have 5 built-in frameworks', () => {
      const frameworks = service.getBuiltInFrameworks();
      expect(frameworks).toHaveLength(5);
    });

    it('should include OWASP ASI 2024 framework', () => {
      const frameworks = service.getBuiltInFrameworks();
      const owaspFramework = frameworks.find(f => f.id === 'owasp-asi-2024');
      
      expect(owaspFramework).toBeDefined();
      expect(owaspFramework?.name).toBe('OWASP ASI 2024');
      expect(owaspFramework?.requirements).toHaveLength(10);
    });

    it('should include NIST AI RMF 1.0 framework', () => {
      const frameworks = service.getBuiltInFrameworks();
      const nistFramework = frameworks.find(f => f.id === 'nist-ai-rmf-1.0');
      
      expect(nistFramework).toBeDefined();
      expect(nistFramework?.name).toBe('NIST AI RMF 1.0');
      expect(nistFramework?.requirements.length).toBeGreaterThan(0);
    });

    it('should include SOC2 Type II framework', () => {
      const frameworks = service.getBuiltInFrameworks();
      const soc2Framework = frameworks.find(f => f.id === 'soc2-type-ii');
      
      expect(soc2Framework).toBeDefined();
      expect(soc2Framework?.name).toBe('SOC2 Type II');
    });

    it('should include ISO 27001:2022 framework', () => {
      const frameworks = service.getBuiltInFrameworks();
      const isoFramework = frameworks.find(f => f.id === 'iso-27001-2022');
      
      expect(isoFramework).toBeDefined();
      expect(isoFramework?.name).toBe('ISO 27001:2022');
    });

    it('should include GDPR 2018 framework', () => {
      const frameworks = service.getBuiltInFrameworks();
      const gdprFramework = frameworks.find(f => f.id === 'gdpr-2018');
      
      expect(gdprFramework).toBeDefined();
      expect(gdprFramework?.name).toBe('GDPR 2018');
    });
  });

  describe('mapPolicyToRequirement', () => {
    it('should create a compliance mapping', async () => {
      const { supabase } = await import('../../lib/supabase');
      
      const mockMapping = {
        id: 'mapping-123',
        policy_id: 'policy-123',
        framework_id: 'owasp-asi-2024',
        requirement_id: 'asi01',
        notes: 'Test mapping',
        created_at: new Date().toISOString()
      };

      vi.mocked(supabase!.from).mockImplementation((table: string) => {
        if (table === 'compliance_mappings') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    limit: vi.fn(() => ({
                      single: vi.fn().mockResolvedValue({ data: null, error: null })
                    }))
                  }))
                }))
              }))
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: mockMapping, error: null })
              }))
            }))
          } as any;
        } else if (table === 'audit_log') {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null })
          } as any;
        }
        return {} as any;
      });

      const mapping = await service.mapPolicyToRequirement({
        policyId: 'policy-123',
        frameworkId: 'owasp-asi-2024',
        requirementId: 'asi01',
        notes: 'Test mapping',
        workspaceId: 'workspace-123',
        userId: 'user-123'
      });

      expect(mapping.id).toBe('mapping-123');
      expect(mapping.policyId).toBe('policy-123');
      expect(mapping.frameworkId).toBe('owasp-asi-2024');
      expect(mapping.requirementId).toBe('asi01');
    });

    it('should reject invalid framework ID', async () => {
      await expect(
        service.mapPolicyToRequirement({
          policyId: 'policy-123',
          frameworkId: 'invalid-framework',
          requirementId: 'req-123',
          notes: '',
          workspaceId: 'workspace-123',
          userId: 'user-123'
        })
      ).rejects.toThrow('Framework not found');
    });

    it('should reject invalid requirement ID', async () => {
      await expect(
        service.mapPolicyToRequirement({
          policyId: 'policy-123',
          frameworkId: 'owasp-asi-2024',
          requirementId: 'invalid-requirement',
          notes: '',
          workspaceId: 'workspace-123',
          userId: 'user-123'
        })
      ).rejects.toThrow('Requirement not found');
    });
  });

  describe('calculateCoverage', () => {
    it('should calculate 100% coverage when all requirements are mapped', async () => {
      const { supabase } = await import('../../lib/supabase');
      
      const framework = BUILT_IN_FRAMEWORKS.find(f => f.id === 'owasp-asi-2024')!;
      const allRequirementIds = framework.requirements.map(r => r.id);

      vi.mocked(supabase!.from).mockImplementation((table: string) => {
        if (table === 'policies') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn().mockResolvedValue({
                  data: [{ id: 'policy-1' }],
                  error: null
                })
              }))
            }))
          } as any;
        } else if (table === 'compliance_mappings') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() => ({
                eq: vi.fn(() => ({
                  order: vi.fn().mockResolvedValue({
                    data: allRequirementIds.map(reqId => ({
                      requirement_id: reqId
                    })),
                    error: null
                  })
                }))
              }))
            }))
          } as any;
        }
        return {} as any;
      });

      const coverage = await service.calculateCoverage('workspace-123', 'owasp-asi-2024');

      expect(coverage.coveragePercentage).toBe(100);
      expect(coverage.mappedRequirements).toBe(framework.requirements.length);
      expect(coverage.totalRequirements).toBe(framework.requirements.length);
      expect(coverage.unmappedRequirements).toHaveLength(0);
    });

    it('should calculate 0% coverage when no requirements are mapped', async () => {
      const { supabase } = await import('../../lib/supabase');
      
      vi.mocked(supabase!.from).mockImplementation((table: string) => {
        if (table === 'policies') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn().mockResolvedValue({
                  data: [{ id: 'policy-1' }],
                  error: null
                })
              }))
            }))
          } as any;
        } else if (table === 'compliance_mappings') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() => ({
                eq: vi.fn(() => ({
                  order: vi.fn().mockResolvedValue({
                    data: [],
                    error: null
                  })
                }))
              }))
            }))
          } as any;
        }
        return {} as any;
      });

      const coverage = await service.calculateCoverage('workspace-123', 'owasp-asi-2024');

      expect(coverage.coveragePercentage).toBe(0);
      expect(coverage.mappedRequirements).toBe(0);
      expect(coverage.unmappedRequirements.length).toBeGreaterThan(0);
    });
  });

  describe('exportMappings', () => {
    it('should export mappings as JSON', async () => {
      const { supabase } = await import('../../lib/supabase');
      
      vi.mocked(supabase!.from).mockImplementation((table: string) => {
        if (table === 'policies') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn().mockResolvedValue({
                  data: [{
                    id: 'policy-1',
                    name: 'Test Policy',
                    current_version: '1.0.0',
                    state: 'production'
                  }],
                  error: null
                })
              }))
            }))
          } as any;
        } else if (table === 'compliance_mappings') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() => ({
                order: vi.fn().mockResolvedValue({
                  data: [{
                    id: 'mapping-1',
                    policy_id: 'policy-1',
                    framework_id: 'owasp-asi-2024',
                    requirement_id: 'asi01',
                    notes: 'Test notes',
                    created_at: new Date().toISOString()
                  }],
                  error: null
                })
              }))
            }))
          } as any;
        }
        return {} as any;
      });

      const result = await service.exportMappings({
        workspaceId: 'workspace-123',
        format: 'json'
      });

      const parsed = JSON.parse(result);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(1);
      expect(parsed[0].policy_name).toBe('Test Policy');
      expect(parsed[0].requirement_code).toBe('ASI01');
    });

    it('should export mappings as CSV', async () => {
      const { supabase } = await import('../../lib/supabase');
      
      vi.mocked(supabase!.from).mockImplementation((table: string) => {
        if (table === 'policies') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn().mockResolvedValue({
                  data: [{
                    id: 'policy-1',
                    name: 'Test Policy',
                    current_version: '1.0.0',
                    state: 'production'
                  }],
                  error: null
                })
              }))
            }))
          } as any;
        } else if (table === 'compliance_mappings') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() => ({
                order: vi.fn().mockResolvedValue({
                  data: [{
                    id: 'mapping-1',
                    policy_id: 'policy-1',
                    framework_id: 'owasp-asi-2024',
                    requirement_id: 'asi01',
                    notes: 'Test notes',
                    created_at: new Date().toISOString()
                  }],
                  error: null
                })
              }))
            }))
          } as any;
        }
        return {} as any;
      });

      const result = await service.exportMappings({
        workspaceId: 'workspace-123',
        format: 'csv'
      });

      expect(result).toContain('mapping_id');
      expect(result).toContain('policy_name');
      expect(result).toContain('requirement_code');
      expect(result).toContain('Test Policy');
    });
  });

  describe('loadCustomFramework', () => {
    it('should validate and accept valid custom framework', async () => {
      const customFramework = {
        id: 'custom-framework-1',
        name: 'Custom Framework',
        version: '1.0',
        requirements: [
          {
            id: 'req-1',
            frameworkId: 'custom-framework-1',
            code: 'REQ-1',
            title: 'Requirement 1',
            description: 'Test requirement',
            category: 'Security'
          }
        ]
      };

      const result = await service.loadCustomFramework('workspace-123', customFramework);

      expect(result.id).toBe(customFramework.id);
      expect(result.name).toBe(customFramework.name);
      expect(result.requirements).toHaveLength(1);
    });

    it('should reject framework without required fields', async () => {
      const invalidFramework = {
        id: '',
        name: 'Invalid',
        version: '1.0',
        requirements: []
      } as any;

      await expect(
        service.loadCustomFramework('workspace-123', invalidFramework)
      ).rejects.toThrow('Invalid framework');
    });

    it('should reject framework with invalid requirements', async () => {
      const invalidFramework = {
        id: 'custom-1',
        name: 'Custom',
        version: '1.0',
        requirements: [
          {
            id: 'req-1',
            code: '',
            title: '',
            description: '',
            category: ''
          }
        ]
      } as any;

      await expect(
        service.loadCustomFramework('workspace-123', invalidFramework)
      ).rejects.toThrow('Invalid requirement');
    });
  });
});
