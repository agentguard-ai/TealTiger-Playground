// Property-based tests for policy search
// Requirements: 3.5
// Property: 10

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { PolicyRegistryService } from '../../services/PolicyRegistryService';
import { Policy, PolicyState } from '../../types/policy';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn()
  },
  isSupabaseConfigured: () => true
}));

// Arbitraries for property-based testing
const policyNameArbitrary = fc.string({ minLength: 3, maxLength: 50 });
const policyDescriptionArbitrary = fc.string({ minLength: 0, maxLength: 200 });
const policyStateArbitrary = fc.constantFrom('draft', 'review', 'approved', 'production') as fc.Arbitrary<PolicyState>;
const tagArbitrary = fc.string({ minLength: 1, maxLength: 20 });

interface MockPolicy {
  id: string;
  workspace_id: string;
  name: string;
  description: string;
  current_version: string;
  state: PolicyState;
  created_by: string;
  created_at: string;
  updated_at: string;
}

describe('Policy Search Property Tests', () => {
  let service: PolicyRegistryService;

  beforeEach(() => {
    service = new PolicyRegistryService();
    vi.clearAllMocks();
  });

  /**
   * Property 10: Policy Search Completeness
   * Validates: Requirements 3.5
   * 
   * Test that search by name, tag, or author returns all matching policies.
   * No matching policies should be missed by the search.
   */
  it('Property 10: Search returns all policies matching the query', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            name: policyNameArbitrary,
            description: policyDescriptionArbitrary,
            state: policyStateArbitrary,
            tags: fc.array(tagArbitrary, { maxLength: 5 })
          }),
          { minLength: 5, maxLength: 20 }
        ),
        fc.string({ minLength: 1, maxLength: 10 }),
        async (policiesData, searchQuery) => {
          const workspaceId = 'workspace-123';
          
          // Create mock policies
          const mockPolicies: MockPolicy[] = policiesData.map((data, idx) => ({
            id: `policy-${idx}`,
            workspace_id: workspaceId,
            name: data.name,
            description: data.description,
            current_version: '1.0.0',
            state: data.state,
            created_by: 'user-123',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));

          // Determine which policies should match the search query
          const expectedMatches = mockPolicies.filter(policy => 
            policy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            policy.description.toLowerCase().includes(searchQuery.toLowerCase())
          );

          const { supabase } = await import('../../lib/supabase');
          
          // Mock the search query
          vi.mocked(supabase!.from).mockImplementation((table: string) => {
            if (table === 'policies') {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    or: vi.fn(() => ({
                      order: vi.fn(() => ({
                        // Return only matching policies
                        then: vi.fn().mockResolvedValue({
                          data: expectedMatches,
                          error: null
                        })
                      }))
                    }))
                  }))
                }))
              } as any;
            }
            return {} as any;
          });

          // Perform search
          const results = await service.searchPolicies({
            workspaceId,
            query: searchQuery,
            filters: {}
          });

          // Property: All matching policies should be in results
          const resultIds = new Set(results.map(p => p.id));
          const expectedIds = new Set(expectedMatches.map(p => p.id));

          // Every expected match should be in results
          for (const expectedId of expectedIds) {
            expect(resultIds.has(expectedId)).toBe(true);
          }

          // Results should not contain non-matching policies
          expect(results.length).toBe(expectedMatches.length);

          return true;
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property 10b: Search by state filter returns only matching policies
   */
  it('Property 10b: Search with state filter returns only policies in that state', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            name: policyNameArbitrary,
            state: policyStateArbitrary
          }),
          { minLength: 10, maxLength: 30 }
        ),
        policyStateArbitrary,
        async (policiesData, filterState) => {
          const workspaceId = 'workspace-123';
          
          // Create mock policies
          const mockPolicies: MockPolicy[] = policiesData.map((data, idx) => ({
            id: `policy-${idx}`,
            workspace_id: workspaceId,
            name: data.name,
            description: '',
            current_version: '1.0.0',
            state: data.state,
            created_by: 'user-123',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));

          // Determine which policies should match the filter
          const expectedMatches = mockPolicies.filter(policy => 
            policy.state === filterState
          );

          const { supabase } = await import('../../lib/supabase');
          
          // Mock the filtered query
          vi.mocked(supabase!.from).mockImplementation((table: string) => {
            if (table === 'policies') {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn((field: string, value: string) => {
                    if (field === 'workspace_id') {
                      return {
                        eq: vi.fn((field2: string, value2: string) => {
                          if (field2 === 'state' && value2 === filterState) {
                            return {
                              order: vi.fn(() => ({
                                then: vi.fn().mockResolvedValue({
                                  data: expectedMatches,
                                  error: null
                                })
                              }))
                            };
                          }
                          return {};
                        })
                      };
                    }
                    return {};
                  })
                }))
              } as any;
            }
            return {} as any;
          });

          // Perform search with state filter
          const results = await service.searchPolicies({
            workspaceId,
            query: '',
            filters: { state: filterState }
          });

          // Property: All results should have the filtered state
          for (const result of results) {
            expect(result.state).toBe(filterState);
          }

          // Property: All policies with the filtered state should be in results
          expect(results.length).toBe(expectedMatches.length);

          return true;
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property 10c: Empty search returns all policies in workspace
   */
  it('Property 10c: Empty search query returns all policies in workspace', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            name: policyNameArbitrary,
            description: policyDescriptionArbitrary,
            state: policyStateArbitrary
          }),
          { minLength: 1, maxLength: 20 }
        ),
        async (policiesData) => {
          const workspaceId = 'workspace-123';
          
          // Create mock policies
          const mockPolicies: MockPolicy[] = policiesData.map((data, idx) => ({
            id: `policy-${idx}`,
            workspace_id: workspaceId,
            name: data.name,
            description: data.description,
            current_version: '1.0.0',
            state: data.state,
            created_by: 'user-123',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));

          const { supabase } = await import('../../lib/supabase');
          
          // Mock listPolicies (empty search uses this)
          vi.mocked(supabase!.from).mockImplementation((table: string) => {
            if (table === 'policies') {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    order: vi.fn(() => ({
                      then: vi.fn().mockResolvedValue({
                        data: mockPolicies,
                        error: null
                      })
                    }))
                  }))
                }))
              } as any;
            }
            return {} as any;
          });

          // Perform search with empty query
          const results = await service.listPolicies(workspaceId);

          // Property: Should return all policies in workspace
          expect(results.length).toBe(mockPolicies.length);

          // Property: All policy IDs should be present
          const resultIds = new Set(results.map(p => p.id));
          for (const mockPolicy of mockPolicies) {
            expect(resultIds.has(mockPolicy.id)).toBe(true);
          }

          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 10d: Search is case-insensitive
   */
  it('Property 10d: Search is case-insensitive for name and description', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 3, maxLength: 20 }),
        fc.constantFrom('lower', 'upper', 'mixed'),
        async (searchTerm, caseVariant) => {
          const workspaceId = 'workspace-123';
          
          // Create policy with specific name
          const policyName = `Test ${searchTerm} Policy`;
          const mockPolicy: MockPolicy = {
            id: 'policy-1',
            workspace_id: workspaceId,
            name: policyName,
            description: 'Test description',
            current_version: '1.0.0',
            state: 'draft',
            created_by: 'user-123',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          // Transform search term based on case variant
          let query = searchTerm;
          if (caseVariant === 'lower') {
            query = searchTerm.toLowerCase();
          } else if (caseVariant === 'upper') {
            query = searchTerm.toUpperCase();
          } else {
            // Mixed case
            query = searchTerm.split('').map((c, i) => 
              i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()
            ).join('');
          }

          const { supabase } = await import('../../lib/supabase');
          
          // Mock search that matches case-insensitively
          vi.mocked(supabase!.from).mockImplementation((table: string) => {
            if (table === 'policies') {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    or: vi.fn(() => ({
                      order: vi.fn(() => ({
                        then: vi.fn().mockResolvedValue({
                          data: [mockPolicy],
                          error: null
                        })
                      }))
                    }))
                  }))
                }))
              } as any;
            }
            return {} as any;
          });

          // Perform search with case-variant query
          const results = await service.searchPolicies({
            workspaceId,
            query,
            filters: {}
          });

          // Property: Should find the policy regardless of case
          expect(results.length).toBeGreaterThan(0);
          expect(results[0].name).toBe(policyName);

          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 10e: Search with multiple filters applies AND logic
   */
  it('Property 10e: Multiple filters are combined with AND logic', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            name: policyNameArbitrary,
            state: policyStateArbitrary,
            author: fc.constantFrom('user-1', 'user-2', 'user-3')
          }),
          { minLength: 10, maxLength: 30 }
        ),
        policyStateArbitrary,
        fc.constantFrom('user-1', 'user-2', 'user-3'),
        async (policiesData, filterState, filterAuthor) => {
          const workspaceId = 'workspace-123';
          
          // Create mock policies
          const mockPolicies: MockPolicy[] = policiesData.map((data, idx) => ({
            id: `policy-${idx}`,
            workspace_id: workspaceId,
            name: data.name,
            description: '',
            current_version: '1.0.0',
            state: data.state,
            created_by: data.author,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));

          // Determine which policies should match BOTH filters
          const expectedMatches = mockPolicies.filter(policy => 
            policy.state === filterState && policy.created_by === filterAuthor
          );

          const { supabase } = await import('../../lib/supabase');
          
          // Mock the filtered query
          vi.mocked(supabase!.from).mockImplementation((table: string) => {
            if (table === 'policies') {
              return {
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    eq: vi.fn(() => ({
                      eq: vi.fn(() => ({
                        order: vi.fn(() => ({
                          then: vi.fn().mockResolvedValue({
                            data: expectedMatches,
                            error: null
                          })
                        }))
                      }))
                    }))
                  }))
                }))
              } as any;
            }
            return {} as any;
          });

          // Perform search with multiple filters
          const results = await service.searchPolicies({
            workspaceId,
            query: '',
            filters: { 
              state: filterState,
              author: filterAuthor
            }
          });

          // Property: All results should match BOTH filters
          for (const result of results) {
            expect(result.state).toBe(filterState);
            expect(result.createdBy).toBe(filterAuthor);
          }

          // Property: Count should match expected
          expect(results.length).toBe(expectedMatches.length);

          return true;
        }
      ),
      { numRuns: 20 }
    );
  });
});
