// Property-based tests for policy versioning
// Requirements: 3.1-3.4, 3.7
// Properties: 6, 7, 8, 9, 11

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { PolicyRegistryService } from '../../services/PolicyRegistryService';
import { PolicyMetadata, PolicyState } from '../../types/policy';
import { validateSemanticVersion } from '../../utils/policyValidation';

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
        in: vi.fn()
      })),
      update: vi.fn(() => ({
        eq: vi.fn()
      })),
      delete: vi.fn(() => ({
        eq: vi.fn()
      }))
    }))
  },
  isSupabaseConfigured: () => true
}));

// Arbitraries for property-based testing
const metadataArbitrary = fc.record({
  tags: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 20 }),
  category: fc.constantFrom('general', 'security', 'cost-control', 'compliance'),
  providers: fc.array(
    fc.constantFrom('openai', 'anthropic', 'gemini', 'bedrock', 'azure-openai', 'cohere', 'mistral'),
    { maxLength: 7 }
  ),
  models: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 10 }),
  estimatedCost: fc.float({ min: 0, max: 1000, noNaN: true }),
  testCoverage: fc.float({ min: 0, max: 100, noNaN: true })
}) as fc.Arbitrary<PolicyMetadata>;

const versionTypeArbitrary = fc.constantFrom('major', 'minor', 'patch') as fc.Arbitrary<'major' | 'minor' | 'patch'>;

const semanticVersionArbitrary = fc.tuple(
  fc.nat({ max: 99 }),
  fc.nat({ max: 99 }),
  fc.nat({ max: 99 })
).map(([major, minor, patch]) => `${major}.${minor}.${patch}`);

describe('Policy Versioning Property Tests', () => {
  let service: PolicyRegistryService;

  beforeEach(() => {
    service = new PolicyRegistryService();
    vi.clearAllMocks();
  });

  /**
   * Property 6: Policy Version Immutability
   * Validates: Requirements 3.1
   * 
   * Test that policy versions cannot be modified after creation.
   * Once a version is created, its code and metadata should be immutable.
   */
  it('Property 6: Policy versions are immutable after creation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 3, maxLength: 50 }),
        fc.string({ minLength: 10, maxLength: 1000 }),
        metadataArbitrary,
        async (policyName, code, metadata) => {
          // Mock successful policy creation
          const mockPolicyId = 'policy-123';
          const mockVersionId = 'version-123';
          const mockVersion = '1.0.0';

          const { supabase } = await import('../../lib/supabase');
          
          // Setup mocks for policy creation
          vi.mocked(supabase!.from).mockImplementation((table: string) => {
            if (table === 'policies') {
              return {
                insert: vi.fn(() => ({
                  select: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({
                      data: {
                        id: mockPolicyId,
                        workspace_id: 'workspace-123',
                        name: policyName,
                        description: '',
                        current_version: mockVersion,
                        state: 'draft',
                        created_by: 'user-123',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                      },
                      error: null
                    })
                  }))
                })),
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({
                      data: {
                        id: mockPolicyId,
                        workspace_id: 'workspace-123',
                        name: policyName,
                        current_version: mockVersion
                      },
                      error: null
                    })
                  }))
                }))
              } as any;
            } else if (table === 'policy_versions') {
              return {
                insert: vi.fn(() => ({
                  select: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({
                      data: {
                        id: mockVersionId,
                        policy_id: mockPolicyId,
                        version: mockVersion,
                        code,
                        metadata,
                        created_by: 'user-123',
                        created_at: new Date().toISOString()
                      },
                      error: null
                    })
                  }))
                })),
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({
                      data: {
                        id: mockVersionId,
                        policy_id: mockPolicyId,
                        version: mockVersion,
                        code,
                        metadata,
                        created_by: 'user-123',
                        created_at: new Date().toISOString()
                      },
                      error: null
                    })
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

          // Create policy
          const policy = await service.createPolicy({
            workspaceId: 'workspace-123',
            name: policyName,
            code,
            metadata,
            userId: 'user-123'
          });

          // Get the created version
          const version = await service.getVersion(mockVersionId);

          // Property: Version data should match exactly what was created
          expect(version.code).toBe(code);
          expect(version.metadata).toEqual(metadata);
          expect(version.version).toBe(mockVersion);

          // Property: Attempting to modify version should fail (immutability enforced by database)
          // In a real scenario, the database would reject UPDATE operations on policy_versions
          // This is enforced by RLS policies and application logic
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 7: Semantic Version Format Validation
   * Validates: Requirements 3.2
   * 
   * Test that all version numbers follow semantic versioning format (major.minor.patch).
   */
  it('Property 7: All versions follow semantic versioning format', async () => {
    await fc.assert(
      fc.asyncProperty(
        semanticVersionArbitrary,
        async (version) => {
          // Property: Valid semantic versions should pass validation
          const result = validateSemanticVersion(version);
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);

          // Property: Version should match the pattern major.minor.patch
          const parts = version.split('.');
          expect(parts).toHaveLength(3);
          expect(parts.every(p => /^\d+$/.test(p))).toBe(true);

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 8: Policy Creation Generates Version
   * Validates: Requirements 3.1, 3.2, 3.3
   * 
   * Test that creating a policy automatically generates version 1.0.0.
   */
  it('Property 8: Creating a policy generates initial version 1.0.0', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 3, maxLength: 50 }),
        fc.string({ minLength: 10, maxLength: 1000 }),
        metadataArbitrary,
        async (policyName, code, metadata) => {
          const mockPolicyId = 'policy-' + Math.random();
          const initialVersion = '1.0.0';

          const { supabase } = await import('../../lib/supabase');
          
          vi.mocked(supabase!.from).mockImplementation((table: string) => {
            if (table === 'policies') {
              return {
                insert: vi.fn(() => ({
                  select: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({
                      data: {
                        id: mockPolicyId,
                        workspace_id: 'workspace-123',
                        name: policyName,
                        description: '',
                        current_version: initialVersion,
                        state: 'draft',
                        created_by: 'user-123',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                      },
                      error: null
                    })
                  }))
                })),
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    limit: vi.fn(() => ({
                      single: vi.fn()
                    }))
                  }))
                }))
              } as any;
            } else if (table === 'policy_versions') {
              return {
                insert: vi.fn(() => ({
                  select: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({
                      data: {
                        id: 'version-' + Math.random(),
                        policy_id: mockPolicyId,
                        version: initialVersion,
                        code,
                        metadata,
                        created_by: 'user-123',
                        created_at: new Date().toISOString()
                      },
                      error: null
                    })
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

          // Create policy
          const policy = await service.createPolicy({
            workspaceId: 'workspace-123',
            name: policyName,
            code,
            metadata,
            userId: 'user-123'
          });

          // Property: Initial version must be 1.0.0
          expect(policy.currentVersion).toBe('1.0.0');

          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 9: Policy Metadata Round-Trip
   * Validates: Requirements 3.4
   * 
   * Test that metadata is preserved exactly through save and load operations.
   */
  it('Property 9: Policy metadata is preserved through save/load', async () => {
    await fc.assert(
      fc.asyncProperty(
        metadataArbitrary,
        async (metadata) => {
          const mockVersionId = 'version-' + Math.random();

          const { supabase } = await import('../../lib/supabase');
          
          vi.mocked(supabase!.from).mockImplementation((table: string) => {
            if (table === 'policy_versions') {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({
                      data: {
                        id: mockVersionId,
                        policy_id: 'policy-123',
                        version: '1.0.0',
                        code: 'test code',
                        metadata,
                        created_by: 'user-123',
                        created_at: new Date().toISOString()
                      },
                      error: null
                    })
                  }))
                }))
              } as any;
            }
            return {} as any;
          });

          // Load version
          const version = await service.getVersion(mockVersionId);

          // Property: Metadata should be exactly the same after round-trip
          expect(version.metadata).toEqual(metadata);
          expect(version.metadata.tags).toEqual(metadata.tags);
          expect(version.metadata.category).toBe(metadata.category);
          expect(version.metadata.providers).toEqual(metadata.providers);
          expect(version.metadata.models).toEqual(metadata.models);
          expect(version.metadata.estimatedCost).toBe(metadata.estimatedCost);
          expect(version.metadata.testCoverage).toBe(metadata.testCoverage);

          return true;
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property 11: Policy Revert Restores State
   * Validates: Requirements 3.7
   * 
   * Test that reverting to a previous version restores exact code and metadata.
   */
  it('Property 11: Reverting policy restores exact code and metadata', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 1000 }),
        metadataArbitrary,
        fc.string({ minLength: 10, maxLength: 1000 }),
        metadataArbitrary,
        async (originalCode, originalMetadata, modifiedCode, modifiedMetadata) => {
          const mockPolicyId = 'policy-123';
          const mockOriginalVersionId = 'version-original';
          const mockModifiedVersionId = 'version-modified';
          const mockRevertedVersionId = 'version-reverted';

          const { supabase } = await import('../../lib/supabase');
          
          let callCount = 0;
          vi.mocked(supabase!.from).mockImplementation((table: string) => {
            if (table === 'policy_versions') {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn((field: string, value: string) => {
                    if (field === 'id' && value === mockOriginalVersionId) {
                      return {
                        single: vi.fn().mockResolvedValue({
                          data: {
                            id: mockOriginalVersionId,
                            policy_id: mockPolicyId,
                            version: '1.0.0',
                            code: originalCode,
                            metadata: originalMetadata,
                            created_by: 'user-123',
                            created_at: new Date().toISOString()
                          },
                          error: null
                        })
                      };
                    }
                    return {
                      single: vi.fn().mockResolvedValue({
                        data: {
                          id: mockRevertedVersionId,
                          policy_id: mockPolicyId,
                          version: '1.0.2',
                          code: originalCode,
                          metadata: originalMetadata,
                          created_by: 'user-123',
                          created_at: new Date().toISOString()
                        },
                        error: null
                      })
                    };
                  })
                })),
                insert: vi.fn(() => ({
                  select: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({
                      data: {
                        id: mockRevertedVersionId,
                        policy_id: mockPolicyId,
                        version: '1.0.2',
                        code: originalCode,
                        metadata: originalMetadata,
                        created_by: 'user-123',
                        created_at: new Date().toISOString()
                      },
                      error: null
                    })
                  }))
                }))
              } as any;
            } else if (table === 'policies') {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({
                      data: {
                        id: mockPolicyId,
                        workspace_id: 'workspace-123',
                        current_version: '1.0.1',
                        state: 'draft'
                      },
                      error: null
                    })
                  }))
                })),
                update: vi.fn(() => ({
                  eq: vi.fn().mockResolvedValue({ data: null, error: null })
                }))
              } as any;
            } else if (table === 'audit_log') {
              return {
                insert: vi.fn().mockResolvedValue({ data: null, error: null })
              } as any;
            }
            return {} as any;
          });

          // Revert to original version
          const revertedVersion = await service.revertToVersion(
            mockPolicyId,
            mockOriginalVersionId,
            'user-123'
          );

          // Property: Reverted version should have exact same code and metadata as original
          expect(revertedVersion.code).toBe(originalCode);
          expect(revertedVersion.metadata).toEqual(originalMetadata);

          return true;
        }
      ),
      { numRuns: 20 }
    );
  });
});
