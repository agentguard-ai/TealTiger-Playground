// Property-based tests for compliance mapping
// Requirements: 8.6-8.10
// Properties: 26, 27, 28, 29, 30

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { ComplianceService } from '../../services/ComplianceService';
import { BUILT_IN_FRAMEWORKS } from '../../data/compliance-frameworks';
import type { ComplianceFramework, ComplianceRequirement } from '../../types/compliance';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              single: vi.fn()
            }))
          }))
        })),
        in: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn()
          })),
          order: vi.fn()
        }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn()
      }))
    }))
  },
  isSupabaseConfigured: () => true
}));

// Arbitraries for property-based testing
const frameworkIdArbitrary = fc.constantFrom(
  'owasp-asi-2024',
  'nist-ai-rmf-1.0',
  'soc2-type-ii',
  'iso-27001-2022',
  'gdpr-2018'
);

const requirementArbitrary = fc.record({
  id: fc.string({ minLength: 3, maxLength: 20 }),
  frameworkId: fc.string({ minLength: 5, maxLength: 30 }),
  code: fc.string({ minLength: 2, maxLength: 20 }),
  title: fc.string({ minLength: 5, maxLength: 100 }),
  description: fc.string({ minLength: 10, maxLength: 500 }),
  category: fc.string({ minLength: 3, maxLength: 50 })
}) as fc.Arbitrary<ComplianceRequirement>;

const customFrameworkArbitrary = fc.record({
  id: fc.string({ minLength: 5, maxLength: 30 }),
  name: fc.string({ minLength: 5, maxLength: 50 }),
  version: fc.string({ minLength: 3, maxLength: 10 }),
  requirements: fc.array(requirementArbitrary, { minLength: 1, maxLength: 20 })
}) as fc.Arbitrary<ComplianceFramework>;

describe('Compliance Mapping Property Tests', () => {
  let service: ComplianceService;

  beforeEach(() => {
    service = new ComplianceService();
    vi.clearAllMocks();
  });

  /**
   * Property 26: Compliance Coverage Calculation
   * Validates: Requirements 8.6
   * 
   * Test that coverage percentage is calculated correctly as (mapped / total) × 100.
   */
  it('Property 26: Coverage percentage equals (mapped / total) × 100', async () => {
    await fc.assert(
      fc.asyncProperty(
        frameworkIdArbitrary,
        fc.array(fc.string({ minLength: 10, maxLength: 36 }), { minLength: 0, maxLength: 20 }),
        async (frameworkId, mappedRequirementIds) => {
          const framework = BUILT_IN_FRAMEWORKS.find(f => f.id === frameworkId);
          if (!framework) return true;

          const totalRequirements = framework.requirements.length;
          const uniqueMappedIds = new Set(
            mappedRequirementIds.filter(id => 
              framework.requirements.some(req => req.id === id)
            )
          );
          const mappedCount = uniqueMappedIds.size;

          const { supabase } = await import('../../lib/supabase');
          
          // Mock policies query
          vi.mocked(supabase!.from).mockImplementation((table: string) => {
            if (table === 'policies') {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    order: vi.fn().mockResolvedValue({
                      data: [{ id: 'policy-1' }, { id: 'policy-2' }],
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
                        data: Array.from(uniqueMappedIds).map(reqId => ({
                          id: 'mapping-' + reqId,
                          policy_id: 'policy-1',
                          framework_id: frameworkId,
                          requirement_id: reqId,
                          notes: '',
                          created_at: new Date().toISOString()
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

          const coverage = await service.calculateCoverage('workspace-123', frameworkId);

          // Property: Coverage percentage should equal (mapped / total) × 100
          const expectedPercentage = totalRequirements > 0 
            ? Math.round((mappedCount / totalRequirements) * 100)
            : 0;

          expect(coverage.coveragePercentage).toBe(expectedPercentage);
          expect(coverage.totalRequirements).toBe(totalRequirements);
          expect(coverage.mappedRequirements).toBe(mappedCount);

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 27: Unmapped Requirements Identification
   * Validates: Requirements 8.7
   * 
   * Test that unmapped requirements list includes all non-mapped requirements.
   */
  it('Property 27: Unmapped list includes all requirements without mappings', async () => {
    await fc.assert(
      fc.asyncProperty(
        frameworkIdArbitrary,
        fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 0, maxLength: 10 }),
        async (frameworkId, mappedIndices) => {
          const framework = BUILT_IN_FRAMEWORKS.find(f => f.id === frameworkId);
          if (!framework) return true;

          const uniqueMappedIndices = new Set(
            mappedIndices.filter(idx => idx < framework.requirements.length)
          );
          const mappedRequirementIds = Array.from(uniqueMappedIndices).map(
            idx => framework.requirements[idx].id
          );

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
                        data: mappedRequirementIds.map(reqId => ({
                          id: 'mapping-' + reqId,
                          policy_id: 'policy-1',
                          framework_id: frameworkId,
                          requirement_id: reqId,
                          notes: '',
                          created_at: new Date().toISOString()
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

          const unmappedRequirements = await service.getUnmappedRequirements(
            'workspace-123',
            frameworkId
          );

          // Property: Unmapped list should contain exactly the requirements not in mapped set
          const mappedSet = new Set(mappedRequirementIds);
          const expectedUnmapped = framework.requirements.filter(
            req => !mappedSet.has(req.id)
          );

          expect(unmappedRequirements.length).toBe(expectedUnmapped.length);
          
          const unmappedIds = new Set(unmappedRequirements.map(r => r.id));
          expectedUnmapped.forEach(req => {
            expect(unmappedIds.has(req.id)).toBe(true);
          });

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 28: Custom Framework Round-Trip
   * Validates: Requirements 8.8
   * 
   * Test that custom framework structure is preserved through load operation.
   */
  it('Property 28: Custom framework preserves structure through load', async () => {
    await fc.assert(
      fc.asyncProperty(
        customFrameworkArbitrary,
        async (framework) => {
          // Ensure frameworkId matches for all requirements
          framework.requirements.forEach(req => {
            req.frameworkId = framework.id;
          });

          // Load custom framework
          const loadedFramework = await service.loadCustomFramework(
            'workspace-123',
            framework
          );

          // Property: Loaded framework should match original exactly
          expect(loadedFramework.id).toBe(framework.id);
          expect(loadedFramework.name).toBe(framework.name);
          expect(loadedFramework.version).toBe(framework.version);
          expect(loadedFramework.requirements.length).toBe(framework.requirements.length);

          // Verify each requirement is preserved
          framework.requirements.forEach((req, idx) => {
            const loadedReq = loadedFramework.requirements[idx];
            expect(loadedReq.id).toBe(req.id);
            expect(loadedReq.code).toBe(req.code);
            expect(loadedReq.title).toBe(req.title);
            expect(loadedReq.description).toBe(req.description);
            expect(loadedReq.category).toBe(req.category);
            expect(loadedReq.frameworkId).toBe(framework.id);
          });

          return true;
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property 29: Compliance Report Completeness
   * Validates: Requirements 8.9
   * 
   * Test that all mapped policies appear in exported report.
   */
  it('Property 29: Export includes all mapped policies', async () => {
    await fc.assert(
      fc.asyncProperty(
        frameworkIdArbitrary,
        fc.array(
          fc.record({
            policyId: fc.string({ minLength: 10, maxLength: 36 }),
            requirementId: fc.string({ minLength: 3, maxLength: 20 })
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (frameworkId, mappings) => {
          const framework = BUILT_IN_FRAMEWORKS.find(f => f.id === frameworkId);
          if (!framework) return true;

          // Filter to valid requirement IDs
          const validMappings = mappings.filter(m =>
            framework.requirements.some(req => req.id === m.requirementId)
          );

          if (validMappings.length === 0) return true;

          const uniquePolicyIds = Array.from(new Set(validMappings.map(m => m.policyId)));

          const { supabase } = await import('../../lib/supabase');
          
          vi.mocked(supabase!.from).mockImplementation((table: string) => {
            if (table === 'policies') {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    order: vi.fn().mockResolvedValue({
                      data: uniquePolicyIds.map(id => ({
                        id,
                        name: `Policy ${id}`,
                        description: '',
                        current_version: '1.0.0',
                        state: 'production'
                      })),
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
                        data: validMappings.map((m, idx) => ({
                          id: `mapping-${idx}`,
                          policy_id: m.policyId,
                          framework_id: frameworkId,
                          requirement_id: m.requirementId,
                          notes: '',
                          created_at: new Date().toISOString()
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

          const exportedJson = await service.exportMappings({
            workspaceId: 'workspace-123',
            frameworkId,
            format: 'json'
          });

          const exportedData = JSON.parse(exportedJson);

          // Property: All unique policies should appear in export
          const exportedPolicyIds = new Set(exportedData.map((item: any) => item.policy_id));
          uniquePolicyIds.forEach(policyId => {
            expect(exportedPolicyIds.has(policyId)).toBe(true);
          });

          // Property: Export should have same number of mappings
          expect(exportedData.length).toBe(validMappings.length);

          return true;
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property 30: Compliance Mapping Export Round-Trip
   * Validates: Requirements 8.9
   * 
   * Test that JSON export can be parsed and contains all mapping data.
   */
  it('Property 30: JSON export preserves all mapping data', async () => {
    await fc.assert(
      fc.asyncProperty(
        frameworkIdArbitrary,
        fc.array(
          fc.record({
            policyId: fc.string({ minLength: 10, maxLength: 36 }),
            policyName: fc.string({ minLength: 5, maxLength: 50 }),
            requirementId: fc.string({ minLength: 3, maxLength: 20 }),
            notes: fc.string({ minLength: 0, maxLength: 200 })
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (frameworkId, mappings) => {
          const framework = BUILT_IN_FRAMEWORKS.find(f => f.id === frameworkId);
          if (!framework) return true;

          // Filter to valid requirement IDs
          const validMappings = mappings.filter(m =>
            framework.requirements.some(req => req.id === m.requirementId)
          );

          if (validMappings.length === 0) return true;

          const { supabase } = await import('../../lib/supabase');
          
          vi.mocked(supabase!.from).mockImplementation((table: string) => {
            if (table === 'policies') {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    order: vi.fn().mockResolvedValue({
                      data: validMappings.map(m => ({
                        id: m.policyId,
                        name: m.policyName,
                        description: '',
                        current_version: '1.0.0',
                        state: 'production'
                      })),
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
                      data: validMappings.map((m, idx) => ({
                        id: `mapping-${idx}`,
                        policy_id: m.policyId,
                        framework_id: frameworkId,
                        requirement_id: m.requirementId,
                        notes: m.notes,
                        created_at: new Date().toISOString()
                      })),
                      error: null
                    })
                  }))
                }))
              } as any;
            }
            return {} as any;
          });

          // Export as JSON
          const exportedJson = await service.exportMappings({
            workspaceId: 'workspace-123',
            frameworkId,
            format: 'json'
          });

          // Property: JSON should be valid and parseable
          expect(() => JSON.parse(exportedJson)).not.toThrow();

          const exportedData = JSON.parse(exportedJson);

          // Property: All mapping data should be preserved
          expect(exportedData.length).toBe(validMappings.length);

          exportedData.forEach((item: any, idx: number) => {
            const original = validMappings[idx];
            expect(item.policy_id).toBe(original.policyId);
            expect(item.policy_name).toBe(original.policyName);
            expect(item.requirement_id).toBe(original.requirementId);
            expect(item.notes).toBe(original.notes);
            expect(item.framework_id).toBe(frameworkId);
          });

          return true;
        }
      ),
      { numRuns: 30 }
    );
  });
});
