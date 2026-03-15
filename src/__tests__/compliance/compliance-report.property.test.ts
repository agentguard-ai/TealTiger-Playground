// Property-based tests for compliance reports
// Requirements: 9.2-9.9
// Properties: 31, 32, 33, 34, 35, 36, 37

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { ComplianceReportService } from '../../services/ComplianceReportService';
import { BUILT_IN_FRAMEWORKS } from '../../data/compliance-frameworks';
import type { ComplianceReport, PolicyReportEntry } from '../../types/compliance-report';
import { PolicyState } from '../../types/policy';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'audit_log') {
        return {
          insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          }))
        };
      }
      return {
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
          })),
          gte: vi.fn(function(this: any) { return this; }),
          lte: vi.fn(function(this: any) { return this; })
        })),
        delete: vi.fn(() => ({
          eq: vi.fn()
        }))
      };
    })
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

const policyStateArbitrary = fc.constantFrom(
  PolicyState.Draft,
  PolicyState.Review,
  PolicyState.Approved,
  PolicyState.Production
);

const policyArbitrary = fc.record({
  id: fc.string({ minLength: 10, maxLength: 36 }),
  name: fc.string({ minLength: 5, maxLength: 50 }),
  description: fc.string({ minLength: 10, maxLength: 200 }),
  currentVersion: fc.string({ minLength: 5, maxLength: 10 }),
  state: policyStateArbitrary,
  createdBy: fc.string({ minLength: 10, maxLength: 36 }),
  testCoverage: fc.integer({ min: 0, max: 100 }),
  successRate: fc.integer({ min: 0, max: 100 }),
  mappingCount: fc.integer({ min: 0, max: 10 })
});

describe('Compliance Report Property Tests', () => {
  let service: ComplianceReportService;

  beforeEach(async () => {
    service = new ComplianceReportService();
    vi.clearAllMocks();
    
    // Reset the mock to ensure audit_log insert works
    const { supabase } = await import('../../lib/supabase');
    vi.mocked(supabase!.from).mockImplementation((table: string) => {
      if (table === 'audit_log') {
        return {
          insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          }))
        } as any;
      }
      return {
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
          })),
          gte: vi.fn(function(this: any) { return this; }),
          lte: vi.fn(function(this: any) { return this; })
        })),
        delete: vi.fn(() => ({
          eq: vi.fn()
        }))
      } as any;
    });
  });

  /**
   * Property 31: Compliance Report Data Inclusion
   * Validates: Requirements 9.2
   * 
   * Test that each policy entry includes version, author, approval status, and last modified date.
   */
  it('Property 31: Report includes all required policy data fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        frameworkIdArbitrary,
        fc.array(policyArbitrary, { minLength: 1, maxLength: 10 }),
        async (frameworkId, policies) => {
          const { supabase } = await import('../../lib/supabase');
          
          // Mock database responses
          vi.mocked(supabase!.from).mockImplementation((table: string) => {
            if (table === 'policies') {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    order: vi.fn().mockResolvedValue({
                      data: policies.map(p => ({
                        id: p.id,
                        workspace_id: 'workspace-123',
                        name: p.name,
                        description: p.description,
                        current_version: p.currentVersion,
                        state: p.state,
                        created_by: p.createdBy,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                      })),
                      error: null
                    })
                  }))
                }))
              } as any;
            } else if (table === 'policy_versions') {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    eq: vi.fn(() => ({
                      single: vi.fn((policyId: string, version: string) => {
                        const policy = policies.find(p => p.id === policyId);
                        return Promise.resolve({
                          data: {
                            id: `version-${policyId}`,
                            policy_id: policyId,
                            version: policy?.currentVersion || '1.0.0',
                            code: 'policy code',
                            metadata: { testCoverage: policy?.testCoverage || 0 },
                            created_by: policy?.createdBy || 'user-123',
                            created_at: new Date().toISOString()
                          },
                          error: null
                        });
                      })
                    }))
                  }))
                }))
              } as any;
            } else if (table === 'compliance_mappings') {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    order: vi.fn((policyId: string) => {
                      const policy = policies.find(p => p.id === policyId);
                      const mappings = Array.from({ length: policy?.mappingCount || 0 }, (_, i) => ({
                        id: `mapping-${i}`,
                        policy_id: policyId,
                        framework_id: frameworkId,
                        requirement_id: `req-${i}`,
                        notes: '',
                        created_at: new Date().toISOString()
                      }));
                      return Promise.resolve({ data: mappings, error: null });
                    })
                  }))
                }))
              } as any;
            } else if (table === 'analytics_events') {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    eq: vi.fn((policyId: string) => {
                      const policy = policies.find(p => p.id === policyId);
                      const successRate = policy?.successRate || 100;
                      const total = 100;
                      const successful = Math.round((successRate / 100) * total);
                      const events = Array.from({ length: total }, (_, i) => ({
                        metadata: { success: i < successful, policy_id: policyId }
                      }));
                      return Promise.resolve({ data: events, error: null });
                    })
                  }))
                }))
              } as any;
            } else if (table === 'policy_approvals') {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    order: vi.fn(() => ({
                      limit: vi.fn(() => ({
                        single: vi.fn().mockResolvedValue({
                          data: { status: 'approved' },
                          error: null
                        })
                      }))
                    }))
                  }))
                }))
              } as any;
            } else if (table === 'audit_log') {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    order: vi.fn().mockResolvedValue({
                      data: [],
                      error: null
                    })
                  }))
                }))
              } as any;
            }
            return {} as any;
          });

          const report = await service.generateReport({
            workspaceId: 'workspace-123',
            frameworkId,
            userId: 'user-123'
          });

          // Property: Each policy entry must include all required fields
          report.policies.forEach((entry: PolicyReportEntry) => {
            expect(entry.policy).toBeDefined();
            expect(entry.version).toBeDefined();
            expect(entry.version.version).toBeDefined();
            expect(entry.policy.createdBy).toBeDefined();
            expect(entry.approvalStatus).toBeDefined();
            expect(entry.lastModified).toBeInstanceOf(Date);
            expect(entry.testCoverage).toBeGreaterThanOrEqual(0);
            expect(entry.successRate).toBeGreaterThanOrEqual(0);
            expect(Array.isArray(entry.mappings)).toBe(true);
          });

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 32: Test Coverage Metric Accuracy
   * Validates: Requirements 9.3
   * 
   * Test that test coverage metrics are accurately calculated from policy metadata.
   */
  it('Property 32: Test coverage matches policy metadata', async () => {
    await fc.assert(
      fc.asyncProperty(
        frameworkIdArbitrary,
        fc.array(policyArbitrary, { minLength: 1, maxLength: 10 }),
        async (frameworkId, policies) => {
          const { supabase } = await import('../../lib/supabase');
          
          vi.mocked(supabase!.from).mockImplementation((table: string) => {
            if (table === 'policies') {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    order: vi.fn().mockResolvedValue({
                      data: policies.map(p => ({
                        id: p.id,
                        workspace_id: 'workspace-123',
                        name: p.name,
                        description: p.description,
                        current_version: p.currentVersion,
                        state: p.state,
                        created_by: p.createdBy,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                      })),
                      error: null
                    })
                  }))
                }))
              } as any;
            } else if (table === 'policy_versions') {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    eq: vi.fn(() => ({
                      single: vi.fn((policyId: string) => {
                        const policy = policies.find(p => p.id === policyId);
                        return Promise.resolve({
                          data: {
                            id: `version-${policyId}`,
                            policy_id: policyId,
                            version: policy?.currentVersion || '1.0.0',
                            code: 'policy code',
                            metadata: { testCoverage: policy?.testCoverage || 0 },
                            created_by: policy?.createdBy || 'user-123',
                            created_at: new Date().toISOString()
                          },
                          error: null
                        });
                      })
                    }))
                  }))
                }))
              } as any;
            } else if (table === 'compliance_mappings') {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    order: vi.fn().mockResolvedValue({ data: [], error: null })
                  }))
                }))
              } as any;
            } else if (table === 'analytics_events') {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    eq: vi.fn().mockResolvedValue({ data: [], error: null })
                  }))
                }))
              } as any;
            } else if (table === 'policy_approvals') {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    order: vi.fn(() => ({
                      limit: vi.fn(() => ({
                        single: vi.fn().mockResolvedValue({ data: null, error: null })
                      }))
                    }))
                  }))
                }))
              } as any;
            } else if (table === 'audit_log') {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    order: vi.fn().mockResolvedValue({ data: [], error: null })
                  }))
                }))
              } as any;
            }
            return {} as any;
          });

          const report = await service.generateReport({
            workspaceId: 'workspace-123',
            frameworkId,
            userId: 'user-123'
          });

          // Property: Test coverage in report should match policy metadata
          report.policies.forEach((entry: PolicyReportEntry, idx: number) => {
            const originalPolicy = policies[idx];
            expect(entry.testCoverage).toBe(originalPolicy.testCoverage);
          });

          // Property: Average test coverage should be correct
          const expectedAverage = policies.length > 0
            ? Math.round(policies.reduce((sum, p) => sum + p.testCoverage, 0) / policies.length)
            : 0;
          expect(report.summary.averageTestCoverage).toBe(expectedAverage);

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 33: Success Rate Calculation
   * Validates: Requirements 9.4
   * 
   * Test that success rate is calculated as (successful / total) × 100.
   */
  it('Property 33: Success rate equals (successful / total) × 100', async () => {
    await fc.assert(
      fc.asyncProperty(
        frameworkIdArbitrary,
        fc.array(policyArbitrary, { minLength: 1, maxLength: 10 }),
        async (frameworkId, policies) => {
          const { supabase } = await import('../../lib/supabase');
          
          vi.mocked(supabase!.from).mockImplementation((table: string) => {
            if (table === 'policies') {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    order: vi.fn().mockResolvedValue({
                      data: policies.map(p => ({
                        id: p.id,
                        workspace_id: 'workspace-123',
                        name: p.name,
                        description: p.description,
                        current_version: p.currentVersion,
                        state: p.state,
                        created_by: p.createdBy,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                      })),
                      error: null
                    })
                  }))
                }))
              } as any;
            } else if (table === 'policy_versions') {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    eq: vi.fn(() => ({
                      single: vi.fn((policyId: string) => {
                        const policy = policies.find(p => p.id === policyId);
                        return Promise.resolve({
                          data: {
                            id: `version-${policyId}`,
                            policy_id: policyId,
                            version: policy?.currentVersion || '1.0.0',
                            code: 'policy code',
                            metadata: { testCoverage: policy?.testCoverage || 0 },
                            created_by: policy?.createdBy || 'user-123',
                            created_at: new Date().toISOString()
                          },
                          error: null
                        });
                      })
                    }))
                  }))
                }))
              } as any;
            } else if (table === 'compliance_mappings') {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    order: vi.fn().mockResolvedValue({ data: [], error: null })
                  }))
                }))
              } as any;
            } else if (table === 'analytics_events') {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    eq: vi.fn((policyId: string) => {
                      const policy = policies.find(p => p.id === policyId);
                      const successRate = policy?.successRate || 100;
                      const total = 100;
                      const successful = Math.round((successRate / 100) * total);
                      const events = Array.from({ length: total }, (_, i) => ({
                        metadata: { success: i < successful, policy_id: policyId }
                      }));
                      return Promise.resolve({ data: events, error: null });
                    })
                  }))
                }))
              } as any;
            } else if (table === 'policy_approvals') {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    order: vi.fn(() => ({
                      limit: vi.fn(() => ({
                        single: vi.fn().mockResolvedValue({ data: null, error: null })
                      }))
                    }))
                  }))
                }))
              } as any;
            } else if (table === 'audit_log') {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    order: vi.fn().mockResolvedValue({ data: [], error: null })
                  }))
                }))
              } as any;
            }
            return {} as any;
          });

          const report = await service.generateReport({
            workspaceId: 'workspace-123',
            frameworkId,
            userId: 'user-123'
          });

          // Property: Success rate should match expected calculation
          report.policies.forEach((entry: PolicyReportEntry, idx: number) => {
            const originalPolicy = policies[idx];
            expect(entry.successRate).toBe(originalPolicy.successRate);
          });

          // Property: Average success rate should be correct
          const expectedAverage = policies.length > 0
            ? Math.round(policies.reduce((sum, p) => sum + p.successRate, 0) / policies.length)
            : 0;
          expect(report.summary.averageSuccessRate).toBe(expectedAverage);

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 34: Audit Summary Completeness
   * Validates: Requirements 9.5
   * 
   * Test that audit summary includes all required event counts.
   */
  it('Property 34: Audit summary includes changes, approvals, and deployments', async () => {
    await fc.assert(
      fc.asyncProperty(
        frameworkIdArbitrary,
        fc.record({
          changes: fc.integer({ min: 0, max: 50 }),
          approvals: fc.integer({ min: 0, max: 30 }),
          deployments: fc.integer({ min: 0, max: 20 })
        }),
        async (frameworkId, eventCounts) => {
          const { supabase } = await import('../../lib/supabase');
          
          // Create audit events
          const auditEvents = [
            ...Array.from({ length: eventCounts.changes }, (_, i) => ({
              id: `change-${i}`,
              workspace_id: 'workspace-123',
              actor_id: 'user-123',
              action: i % 2 === 0 ? 'policy_updated' : 'policy_created',
              resource_type: 'policy',
              resource_id: `policy-${i}`,
              metadata: {},
              created_at: new Date().toISOString()
            })),
            ...Array.from({ length: eventCounts.approvals }, (_, i) => ({
              id: `approval-${i}`,
              workspace_id: 'workspace-123',
              actor_id: 'user-123',
              action: 'policy_approved',
              resource_type: 'policy',
              resource_id: `policy-${i}`,
              metadata: {},
              created_at: new Date().toISOString()
            })),
            ...Array.from({ length: eventCounts.deployments }, (_, i) => ({
              id: `deployment-${i}`,
              workspace_id: 'workspace-123',
              actor_id: 'user-123',
              action: i % 2 === 0 ? 'policy_deployed' : 'policy_state_changed',
              resource_type: 'policy',
              resource_id: `policy-${i}`,
              metadata: {},
              created_at: new Date().toISOString()
            }))
          ];

          vi.mocked(supabase!.from).mockImplementation((table: string) => {
            if (table === 'policies') {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    order: vi.fn().mockResolvedValue({ data: [], error: null })
                  }))
                }))
              } as any;
            } else if (table === 'audit_log') {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    order: vi.fn().mockResolvedValue({
                      data: auditEvents,
                      error: null
                    })
                  }))
                }))
              } as any;
            }
            return {} as any;
          });

          const report = await service.generateReport({
            workspaceId: 'workspace-123',
            frameworkId,
            userId: 'user-123'
          });

          // Property: Audit summary should have correct counts
          expect(report.auditSummary.totalChanges).toBe(eventCounts.changes);
          expect(report.auditSummary.totalApprovals).toBe(eventCounts.approvals);
          expect(report.auditSummary.totalDeployments).toBe(eventCounts.deployments);
          expect(Array.isArray(report.auditSummary.recentEvents)).toBe(true);

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 35: Report Filtering Correctness
   * Validates: Requirements 9.6
   * 
   * Test that report filters match only specified criteria.
   */
  it('Property 35: Report filters return only matching policies', async () => {
    await fc.assert(
      fc.asyncProperty(
        frameworkIdArbitrary,
        policyStateArbitrary,
        fc.array(policyArbitrary, { minLength: 5, maxLength: 15 }),
        async (frameworkId, filterState, policies) => {
          // Ensure we have policies in different states
          const diversePolicies = policies.map((p, idx) => ({
            ...p,
            state: idx % 4 === 0 ? PolicyState.Draft :
                   idx % 4 === 1 ? PolicyState.Review :
                   idx % 4 === 2 ? PolicyState.Approved :
                   PolicyState.Production
          }));

          const { supabase } = await import('../../lib/supabase');
          
          // Filter policies by state
          const filteredPolicies = diversePolicies.filter(p => p.state === filterState);

          vi.mocked(supabase!.from).mockImplementation((table: string) => {
            if (table === 'policies') {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(function(this: any, field: string, value: string) {
                    if (field === 'state') {
                      // Return filtered policies
                      return {
                        order: vi.fn().mockResolvedValue({
                          data: filteredPolicies.map(p => ({
                            id: p.id,
                            workspace_id: 'workspace-123',
                            name: p.name,
                            description: p.description,
                            current_version: p.currentVersion,
                            state: p.state,
                            created_by: p.createdBy,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                          })),
                          error: null
                        })
                      };
                    }
                    return this;
                  })
                }))
              } as any;
            } else if (table === 'policy_versions') {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    eq: vi.fn(() => ({
                      single: vi.fn((policyId: string) => {
                        const policy = filteredPolicies.find(p => p.id === policyId);
                        return Promise.resolve({
                          data: policy ? {
                            id: `version-${policyId}`,
                            policy_id: policyId,
                            version: policy.currentVersion,
                            code: 'policy code',
                            metadata: { testCoverage: policy.testCoverage },
                            created_by: policy.createdBy,
                            created_at: new Date().toISOString()
                          } : null,
                          error: null
                        });
                      })
                    }))
                  }))
                }))
              } as any;
            } else if (table === 'compliance_mappings') {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    order: vi.fn().mockResolvedValue({ data: [], error: null })
                  }))
                }))
              } as any;
            } else if (table === 'analytics_events') {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    eq: vi.fn().mockResolvedValue({ data: [], error: null })
                  }))
                }))
              } as any;
            } else if (table === 'policy_approvals') {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    order: vi.fn(() => ({
                      limit: vi.fn(() => ({
                        single: vi.fn().mockResolvedValue({ data: null, error: null })
                      }))
                    }))
                  }))
                }))
              } as any;
            } else if (table === 'audit_log') {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    order: vi.fn().mockResolvedValue({ data: [], error: null })
                  }))
                }))
              } as any;
            }
            return {} as any;
          });

          const report = await service.generateReport({
            workspaceId: 'workspace-123',
            frameworkId,
            filters: { policyState: filterState },
            userId: 'user-123'
          });

          // Property: All policies in report should match filter state
          report.policies.forEach((entry: PolicyReportEntry) => {
            expect(entry.policy.state).toBe(filterState);
          });

          // Property: Report should have correct count
          expect(report.policies.length).toBe(filteredPolicies.length);

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 36: Report CSV Export Round-Trip
   * Validates: Requirements 9.8
   * 
   * Test that CSV export preserves all tabular data.
   */
  it('Property 36: CSV export preserves policy data', async () => {
    await fc.assert(
      fc.asyncProperty(
        frameworkIdArbitrary,
        fc.array(policyArbitrary, { minLength: 1, maxLength: 10 }),
        async (frameworkId, policies) => {
          const { supabase } = await import('../../lib/supabase');
          
          vi.mocked(supabase!.from).mockImplementation((table: string) => {
            if (table === 'policies') {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    order: vi.fn().mockResolvedValue({
                      data: policies.map(p => ({
                        id: p.id,
                        workspace_id: 'workspace-123',
                        name: p.name,
                        description: p.description,
                        current_version: p.currentVersion,
                        state: p.state,
                        created_by: p.createdBy,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                      })),
                      error: null
                    })
                  }))
                }))
              } as any;
            } else if (table === 'policy_versions') {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    eq: vi.fn(() => ({
                      single: vi.fn((policyId: string) => {
                        const policy = policies.find(p => p.id === policyId);
                        return Promise.resolve({
                          data: {
                            id: `version-${policyId}`,
                            policy_id: policyId,
                            version: policy?.currentVersion || '1.0.0',
                            code: 'policy code',
                            metadata: { testCoverage: policy?.testCoverage || 0 },
                            created_by: policy?.createdBy || 'user-123',
                            created_at: new Date().toISOString()
                          },
                          error: null
                        });
                      })
                    }))
                  }))
                }))
              } as any;
            } else if (table === 'compliance_mappings') {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    order: vi.fn((policyId: string) => {
                      const policy = policies.find(p => p.id === policyId);
                      const mappings = Array.from({ length: policy?.mappingCount || 0 }, (_, i) => ({
                        id: `mapping-${i}`,
                        policy_id: policyId,
                        framework_id: frameworkId,
                        requirement_id: `req-${i}`,
                        notes: '',
                        created_at: new Date().toISOString()
                      }));
                      return Promise.resolve({ data: mappings, error: null });
                    })
                  }))
                }))
              } as any;
            } else if (table === 'analytics_events') {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    eq: vi.fn((policyId: string) => {
                      const policy = policies.find(p => p.id === policyId);
                      const successRate = policy?.successRate || 100;
                      const total = 100;
                      const successful = Math.round((successRate / 100) * total);
                      const events = Array.from({ length: total }, (_, i) => ({
                        metadata: { success: i < successful, policy_id: policyId }
                      }));
                      return Promise.resolve({ data: events, error: null });
                    })
                  }))
                }))
              } as any;
            } else if (table === 'policy_approvals') {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    order: vi.fn(() => ({
                      limit: vi.fn(() => ({
                        single: vi.fn().mockResolvedValue({
                          data: { status: 'approved' },
                          error: null
                        })
                      }))
                    }))
                  }))
                }))
              } as any;
            } else if (table === 'audit_log') {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    order: vi.fn().mockResolvedValue({ data: [], error: null })
                  }))
                }))
              } as any;
            }
            return {} as any;
          });

          const report = await service.generateReport({
            workspaceId: 'workspace-123',
            frameworkId,
            userId: 'user-123'
          });

          const csv = await service.exportCSV(report);

          // Property: CSV should contain header row
          const lines = csv.split('\n');
          expect(lines.length).toBeGreaterThan(0);
          
          const headers = lines[0].split(',');
          expect(headers).toContain('Policy Name');
          expect(headers).toContain('Version');
          expect(headers).toContain('State');
          expect(headers).toContain('Test Coverage (%)');
          expect(headers).toContain('Success Rate (%)');

          // Property: CSV should have one row per policy (plus header)
          expect(lines.length).toBe(policies.length + 1);

          // Property: Each data row should contain policy information
          for (let i = 1; i < lines.length; i++) {
            const row = lines[i];
            if (row.trim()) {
              const policy = policies[i - 1];
              expect(row).toContain(policy.name);
              expect(row).toContain(policy.currentVersion);
              expect(row).toContain(policy.state);
            }
          }

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 37: Executive Summary Accuracy
   * Validates: Requirements 9.9
   * 
   * Test that executive summary statistics are accurate.
   */
  it('Property 37: Executive summary statistics match report data', async () => {
    await fc.assert(
      fc.asyncProperty(
        frameworkIdArbitrary,
        fc.array(policyArbitrary, { minLength: 1, maxLength: 10 }),
        async (frameworkId, policies) => {
          const { supabase } = await import('../../lib/supabase');
          
          vi.mocked(supabase!.from).mockImplementation((table: string) => {
            if (table === 'policies') {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    order: vi.fn().mockResolvedValue({
                      data: policies.map(p => ({
                        id: p.id,
                        workspace_id: 'workspace-123',
                        name: p.name,
                        description: p.description,
                        current_version: p.currentVersion,
                        state: p.state,
                        created_by: p.createdBy,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                      })),
                      error: null
                    })
                  }))
                }))
              } as any;
            } else if (table === 'policy_versions') {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    eq: vi.fn(() => ({
                      single: vi.fn((policyId: string) => {
                        const policy = policies.find(p => p.id === policyId);
                        return Promise.resolve({
                          data: {
                            id: `version-${policyId}`,
                            policy_id: policyId,
                            version: policy?.currentVersion || '1.0.0',
                            code: 'policy code',
                            metadata: { testCoverage: policy?.testCoverage || 0 },
                            created_by: policy?.createdBy || 'user-123',
                            created_at: new Date().toISOString()
                          },
                          error: null
                        });
                      })
                    }))
                  }))
                }))
              } as any;
            } else if (table === 'compliance_mappings') {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    order: vi.fn((policyId: string) => {
                      const policy = policies.find(p => p.id === policyId);
                      const mappings = Array.from({ length: policy?.mappingCount || 0 }, (_, i) => ({
                        id: `mapping-${i}`,
                        policy_id: policyId,
                        framework_id: frameworkId,
                        requirement_id: `req-${i}`,
                        notes: '',
                        created_at: new Date().toISOString()
                      }));
                      return Promise.resolve({ data: mappings, error: null });
                    })
                  }))
                }))
              } as any;
            } else if (table === 'analytics_events') {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    eq: vi.fn((policyId: string) => {
                      const policy = policies.find(p => p.id === policyId);
                      const successRate = policy?.successRate || 100;
                      const total = 100;
                      const successful = Math.round((successRate / 100) * total);
                      const events = Array.from({ length: total }, (_, i) => ({
                        metadata: { success: i < successful, policy_id: policyId }
                      }));
                      return Promise.resolve({ data: events, error: null });
                    })
                  }))
                }))
              } as any;
            } else if (table === 'policy_approvals') {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    order: vi.fn(() => ({
                      limit: vi.fn(() => ({
                        single: vi.fn().mockResolvedValue({
                          data: { status: 'approved' },
                          error: null
                        })
                      }))
                    }))
                  }))
                }))
              } as any;
            } else if (table === 'audit_log') {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    order: vi.fn().mockResolvedValue({ data: [], error: null })
                  }))
                }))
              } as any;
            }
            return {} as any;
          });

          const report = await service.generateReport({
            workspaceId: 'workspace-123',
            frameworkId,
            userId: 'user-123'
          });

          // Property: Total policies should match input
          expect(report.summary.totalPolicies).toBe(policies.length);

          // Property: Mapped policies count should match policies with mappings
          const policiesWithMappings = policies.filter(p => p.mappingCount > 0).length;
          expect(report.summary.mappedPolicies).toBe(policiesWithMappings);

          // Property: Coverage percentage should be correct
          const expectedCoverage = policies.length > 0
            ? Math.round((policiesWithMappings / policies.length) * 100)
            : 0;
          expect(report.summary.coveragePercentage).toBe(expectedCoverage);

          // Property: Average test coverage should match calculation
          const expectedAvgTestCoverage = policies.length > 0
            ? Math.round(policies.reduce((sum, p) => sum + p.testCoverage, 0) / policies.length)
            : 0;
          expect(report.summary.averageTestCoverage).toBe(expectedAvgTestCoverage);

          // Property: Average success rate should match calculation
          const expectedAvgSuccessRate = policies.length > 0
            ? Math.round(policies.reduce((sum, p) => sum + p.successRate, 0) / policies.length)
            : 0;
          expect(report.summary.averageSuccessRate).toBe(expectedAvgSuccessRate);

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});
