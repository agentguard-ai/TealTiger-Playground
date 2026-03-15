// Property-based tests for policy diff
// Requirements: 3.8, 4.8, 4.9, 4.10
// Properties: 12, 13, 14

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { PolicyDiffService } from '../../services/PolicyDiffService';
import type { PolicyVersion, PolicyMetadata } from '../../types/policy';

// Mock PolicyRegistryService
vi.mock('../../services/PolicyRegistryService', () => ({
  policyRegistryService: {
    getVersion: vi.fn()
  }
}));

import { policyRegistryService } from '../../services/PolicyRegistryService';

describe('Policy Diff Property Tests', () => {
  let diffService: PolicyDiffService;

  beforeEach(() => {
    diffService = new PolicyDiffService();
    vi.clearAllMocks();
  });

  // Arbitraries for property-based testing
  const metadataArbitrary = fc.record({
    tags: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
    category: fc.constantFrom('general', 'security', 'cost-control', 'compliance'),
    providers: fc.array(
      fc.constantFrom('openai', 'anthropic', 'gemini', 'bedrock'),
      { maxLength: 4 }
    ),
    models: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { maxLength: 3 }),
    estimatedCost: fc.double({ min: 0, max: 100, noNaN: true }),
    testCoverage: fc.double({ min: 0, max: 100, noNaN: true })
  }) as fc.Arbitrary<PolicyMetadata>;

  const codeArbitrary = fc.array(
    fc.string({ minLength: 0, maxLength: 100 }),
    { minLength: 1, maxLength: 50 }
  ).map(lines => lines.join('\n'));

  const policyVersionArbitrary = fc.record({
    id: fc.uuid(),
    policyId: fc.uuid(),
    version: fc.constantFrom('1.0.0', '1.1.0', '2.0.0', '2.1.0'),
    code: codeArbitrary,
    metadata: metadataArbitrary,
    createdBy: fc.uuid(),
    createdAt: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') })
  }) as fc.Arbitrary<PolicyVersion>;

  /**
   * Property 12: Policy Diff Calculation
   * **Validates: Requirements 3.8, 4.1-4.9**
   * 
   * Test that diff identifies all added/removed/modified lines
   */
  describe('Property 12: Policy Diff Calculation', () => {
    it('should identify all added lines when new code has more lines', async () => {
      await fc.assert(
        fc.asyncProperty(
          policyVersionArbitrary,
          fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 10 }),
          async (baseVersion, additionalLines) => {
            const oldVersion = { ...baseVersion };
            const newVersion = {
              ...baseVersion,
              id: fc.sample(fc.uuid(), 1)[0],
              code: baseVersion.code + '\n' + additionalLines.join('\n')
            };

            vi.mocked(policyRegistryService.getVersion)
              .mockResolvedValueOnce(oldVersion)
              .mockResolvedValueOnce(newVersion);

            const diff = await diffService.calculateDiff(oldVersion.id, newVersion.id);

            // Should have added lines
            const addedCount = diff.changes.filter(c => c.type === 'added').length;
            expect(addedCount).toBeGreaterThan(0);
            expect(diff.summary.linesAdded).toBe(addedCount);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should identify all removed lines when new code has fewer lines', async () => {
      await fc.assert(
        fc.asyncProperty(
          policyVersionArbitrary,
          async (baseVersion) => {
            const lines = baseVersion.code.split('\n');
            if (lines.length < 2) return; // Skip if too few lines

            const oldVersion = { ...baseVersion };
            const newVersion = {
              ...baseVersion,
              id: fc.sample(fc.uuid(), 1)[0],
              code: lines.slice(0, Math.floor(lines.length / 2)).join('\n')
            };

            vi.mocked(policyRegistryService.getVersion)
              .mockResolvedValueOnce(oldVersion)
              .mockResolvedValueOnce(newVersion);

            const diff = await diffService.calculateDiff(oldVersion.id, newVersion.id);

            // Should have removed lines
            const removedCount = diff.changes.filter(c => c.type === 'removed').length;
            expect(removedCount).toBeGreaterThan(0);
            expect(diff.summary.linesRemoved).toBe(removedCount);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should identify modified lines when content changes', async () => {
      await fc.assert(
        fc.asyncProperty(
          policyVersionArbitrary,
          fc.string({ minLength: 1, maxLength: 50 }),
          async (baseVersion, replacement) => {
            const lines = baseVersion.code.split('\n');
            if (lines.length < 1) return; // Skip if no lines

            const oldVersion = { ...baseVersion };
            const modifiedLines = [...lines];
            modifiedLines[0] = replacement; // Modify first line
            const newVersion = {
              ...baseVersion,
              id: fc.sample(fc.uuid(), 1)[0],
              code: modifiedLines.join('\n')
            };

            vi.mocked(policyRegistryService.getVersion)
              .mockResolvedValueOnce(oldVersion)
              .mockResolvedValueOnce(newVersion);

            const diff = await diffService.calculateDiff(oldVersion.id, newVersion.id);

            // Should have at least one change
            expect(diff.changes.length).toBeGreaterThan(0);
            expect(diff.summary.linesAdded + diff.summary.linesRemoved + diff.summary.linesModified).toBeGreaterThan(0);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should have no changes when versions are identical', async () => {
      await fc.assert(
        fc.asyncProperty(
          policyVersionArbitrary,
          async (baseVersion) => {
            const oldVersion = { ...baseVersion };
            const newVersion = {
              ...baseVersion,
              id: fc.sample(fc.uuid(), 1)[0]
            };

            vi.mocked(policyRegistryService.getVersion)
              .mockResolvedValueOnce(oldVersion)
              .mockResolvedValueOnce(newVersion);

            const diff = await diffService.calculateDiff(oldVersion.id, newVersion.id);

            // Should have no changes
            expect(diff.changes.length).toBe(0);
            expect(diff.summary.linesAdded).toBe(0);
            expect(diff.summary.linesRemoved).toBe(0);
            expect(diff.summary.linesModified).toBe(0);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  /**
   * Property 13: Policy Diff Comparison Symmetry
   * **Validates: Requirements 4.9**
   * 
   * Test V1→V2 and V2→V1 produce inverse diffs
   */
  describe('Property 13: Policy Diff Comparison Symmetry', () => {
    it('should produce inverse diffs when comparing in opposite directions', async () => {
      await fc.assert(
        fc.asyncProperty(
          policyVersionArbitrary,
          policyVersionArbitrary,
          async (version1, version2) => {
            // Ensure versions are different
            if (version1.code === version2.code) return;

            // Forward diff: V1 → V2
            vi.mocked(policyRegistryService.getVersion)
              .mockResolvedValueOnce(version1)
              .mockResolvedValueOnce(version2);

            const forwardDiff = await diffService.calculateDiff(version1.id, version2.id);

            // Reverse diff: V2 → V1
            vi.mocked(policyRegistryService.getVersion)
              .mockResolvedValueOnce(version2)
              .mockResolvedValueOnce(version1);

            const reverseDiff = await diffService.calculateDiff(version2.id, version1.id);

            // Added in forward should equal removed in reverse
            expect(forwardDiff.summary.linesAdded).toBe(reverseDiff.summary.linesRemoved);
            
            // Removed in forward should equal added in reverse
            expect(forwardDiff.summary.linesRemoved).toBe(reverseDiff.summary.linesAdded);
            
            // Modified should be the same in both directions
            expect(forwardDiff.summary.linesModified).toBe(reverseDiff.summary.linesModified);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should have symmetric metadata changes', async () => {
      await fc.assert(
        fc.asyncProperty(
          policyVersionArbitrary,
          metadataArbitrary,
          async (baseVersion, newMetadata) => {
            const version1 = { ...baseVersion };
            const version2 = {
              ...baseVersion,
              id: fc.sample(fc.uuid(), 1)[0],
              metadata: newMetadata
            };

            // Forward diff: V1 → V2
            vi.mocked(policyRegistryService.getVersion)
              .mockResolvedValueOnce(version1)
              .mockResolvedValueOnce(version2);

            const forwardDiff = await diffService.calculateDiff(version1.id, version2.id);

            // Reverse diff: V2 → V1
            vi.mocked(policyRegistryService.getVersion)
              .mockResolvedValueOnce(version2)
              .mockResolvedValueOnce(version1);

            const reverseDiff = await diffService.calculateDiff(version2.id, version1.id);

            // Should have same number of metadata changes
            expect(forwardDiff.metadataChanges.length).toBe(reverseDiff.metadataChanges.length);

            // Each forward change should have a corresponding reverse change
            forwardDiff.metadataChanges.forEach(forwardChange => {
              const reverseChange = reverseDiff.metadataChanges.find(
                rc => rc.field === forwardChange.field
              );
              expect(reverseChange).toBeDefined();
              if (reverseChange) {
                // Old and new should be swapped
                expect(JSON.stringify(forwardChange.oldValue)).toBe(JSON.stringify(reverseChange.newValue));
                expect(JSON.stringify(forwardChange.newValue)).toBe(JSON.stringify(reverseChange.oldValue));
              }
            });
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  /**
   * Property 14: Policy Diff Export Round-Trip
   * **Validates: Requirements 4.10**
   * 
   * Test diff export preserves all change information
   */
  describe('Property 14: Policy Diff Export Round-Trip', () => {
    it('should preserve all change information in unified diff export', async () => {
      await fc.assert(
        fc.asyncProperty(
          policyVersionArbitrary,
          policyVersionArbitrary,
          async (version1, version2) => {
            vi.mocked(policyRegistryService.getVersion)
              .mockResolvedValueOnce(version1)
              .mockResolvedValueOnce(version2);

            const diff = await diffService.calculateDiff(version1.id, version2.id);
            const exported = await diffService.exportUnifiedDiff(diff);

            // Should contain version information
            expect(exported).toContain(version1.version);
            expect(exported).toContain(version2.version);

            // Should contain change indicators
            if (diff.summary.linesAdded > 0) {
              expect(exported).toMatch(/\+\d+:/);
            }
            if (diff.summary.linesRemoved > 0) {
              expect(exported).toMatch(/-\d+:/);
            }

            // Should contain metadata changes if present
            if (diff.metadataChanges.length > 0) {
              expect(exported).toContain('Metadata Changes:');
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should preserve all change information in HTML export', async () => {
      await fc.assert(
        fc.asyncProperty(
          policyVersionArbitrary,
          policyVersionArbitrary,
          async (version1, version2) => {
            vi.mocked(policyRegistryService.getVersion)
              .mockResolvedValueOnce(version1)
              .mockResolvedValueOnce(version2);

            const diff = await diffService.calculateDiff(version1.id, version2.id);
            const exported = await diffService.exportHtmlDiff(diff);

            // Should be valid HTML
            expect(exported).toContain('<!DOCTYPE html>');
            expect(exported).toContain('</html>');

            // Should contain version information
            expect(exported).toContain(version1.version);
            expect(exported).toContain(version2.version);

            // Should contain summary statistics
            expect(exported).toContain(`Lines Added: ${diff.summary.linesAdded}`);
            expect(exported).toContain(`Lines Removed: ${diff.summary.linesRemoved}`);
            expect(exported).toContain(`Lines Modified: ${diff.summary.linesModified}`);

            // Should contain change styling
            if (diff.summary.linesAdded > 0) {
              expect(exported).toContain('class="line added"');
            }
            if (diff.summary.linesRemoved > 0) {
              expect(exported).toContain('class="line removed"');
            }
            if (diff.summary.linesModified > 0) {
              expect(exported).toContain('class="line modified"');
            }

            // Should escape HTML in code content
            expect(exported).not.toMatch(/<script>/i);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should include all metadata changes in exports', async () => {
      await fc.assert(
        fc.asyncProperty(
          policyVersionArbitrary,
          metadataArbitrary,
          async (baseVersion, newMetadata) => {
            const version1 = { ...baseVersion };
            const version2 = {
              ...baseVersion,
              id: fc.sample(fc.uuid(), 1)[0],
              metadata: newMetadata
            };

            vi.mocked(policyRegistryService.getVersion)
              .mockResolvedValueOnce(version1)
              .mockResolvedValueOnce(version2);

            const diff = await diffService.calculateDiff(version1.id, version2.id);

            if (diff.metadataChanges.length > 0) {
              const unifiedExport = await diffService.exportUnifiedDiff(diff);
              const htmlExport = await diffService.exportHtmlDiff(diff);

              // Both exports should contain metadata changes
              diff.metadataChanges.forEach(change => {
                expect(unifiedExport).toContain(change.field);
                expect(htmlExport).toContain(change.field);
              });
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  /**
   * Additional test: Metadata comparison correctness
   */
  describe('Metadata Comparison', () => {
    it('should correctly identify all metadata field changes', () => {
      fc.assert(
        fc.property(
          metadataArbitrary,
          metadataArbitrary,
          (metadata1, metadata2) => {
            const changes = diffService.compareMetadata(metadata1, metadata2);

            // Verify each change is legitimate
            changes.forEach(change => {
              const oldValue = metadata1[change.field as keyof PolicyMetadata];
              const newValue = metadata2[change.field as keyof PolicyMetadata];
              
              // Values should actually be different
              expect(JSON.stringify(oldValue)).not.toBe(JSON.stringify(newValue));
              expect(change.oldValue).toEqual(oldValue);
              expect(change.newValue).toEqual(newValue);
            });

            // Verify no changes are missed
            const fields: (keyof PolicyMetadata)[] = [
              'tags', 'category', 'providers', 'models', 'estimatedCost', 'testCoverage'
            ];
            
            fields.forEach(field => {
              const oldValue = metadata1[field];
              const newValue = metadata2[field];
              const isDifferent = JSON.stringify(oldValue) !== JSON.stringify(newValue);
              const hasChange = changes.some(c => c.field === field);
              
              expect(isDifferent).toBe(hasChange);
            });
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
