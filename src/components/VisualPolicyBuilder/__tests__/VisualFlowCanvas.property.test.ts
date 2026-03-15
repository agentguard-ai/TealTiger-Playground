/**
 * Property-Based Tests for VisualFlowCanvas
 * 
 * Property 12: Block Drag-and-Drop Adds to Canvas
 * Validates: Requirements 1.3
 * 
 * Tests that dragging and dropping blocks from the library to the canvas
 * correctly adds them with proper position and default parameters.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { useVisualPolicyStore } from '../../../stores/visualPolicyStore';
import { PolicyBlock } from '../../../types/visual-policy';
import { BLOCK_LIBRARY, getBlockById } from '../../../data/blockLibrary';

describe('Property 12: Block Drag-and-Drop Adds to Canvas', () => {
  beforeEach(() => {
    useVisualPolicyStore.getState().clearPolicy();
  });

  it('should add any block from library to canvas with correct position', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary block definition ID from library
        fc.constantFrom(...BLOCK_LIBRARY.map((b) => b.id)),
        // Generate arbitrary position
        fc.record({
          x: fc.integer({ min: 0, max: 2000 }),
          y: fc.integer({ min: 0, max: 2000 }),
        }),
        (blockDefinitionId, position) => {
          // Clear store for each test
          useVisualPolicyStore.getState().clearPolicy();

          const definition = getBlockById(blockDefinitionId);
          expect(definition).toBeDefined();

          if (!definition) return;

          // Simulate drag-and-drop: create block with default parameters
          const defaultParameters: Record<string, any> = {};
          definition.parameters.forEach((param) => {
            if (param.defaultValue !== undefined) {
              defaultParameters[param.name] = param.defaultValue;
            }
          });

          const newBlock: PolicyBlock = {
            id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            definitionId: definition.id,
            position,
            parameters: defaultParameters,
            selected: false,
            collapsed: false,
            errors: [],
            warnings: [],
          };

          // Add block to store
          const store = useVisualPolicyStore.getState();
          store.addBlock(newBlock);

          // Verify block was added
          const blocks = useVisualPolicyStore.getState().blocks;
          expect(blocks.length).toBeGreaterThan(0);

          const addedBlock = blocks[blocks.length - 1];

          // Verify block properties
          expect(addedBlock.definitionId).toBe(blockDefinitionId);
          expect(addedBlock.position).toEqual(position);
          expect(addedBlock.selected).toBe(false);
          expect(addedBlock.collapsed).toBe(false);
          expect(addedBlock.errors).toEqual([]);
          expect(addedBlock.warnings).toEqual([]);

          // Verify default parameters were set correctly
          definition.parameters.forEach((param) => {
            if (param.defaultValue !== undefined) {
              expect(addedBlock.parameters[param.name]).toEqual(param.defaultValue);
            }
          });
        }
      ),
      { numRuns: 50 } // Test with 50 random combinations
    );
  });

  it('should handle multiple blocks being added to canvas', () => {
    fc.assert(
      fc.property(
        // Generate array of 1-5 blocks
        fc.array(
          fc.record({
            blockId: fc.constantFrom(...BLOCK_LIBRARY.map((b) => b.id)),
            position: fc.record({
              x: fc.integer({ min: 0, max: 2000 }),
              y: fc.integer({ min: 0, max: 2000 }),
            }),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (blocksToAdd) => {
          // Clear store
          useVisualPolicyStore.getState().clearPolicy();

          const store = useVisualPolicyStore.getState();

          // Add all blocks
          blocksToAdd.forEach(({ blockId, position }) => {
            const definition = getBlockById(blockId);
            if (!definition) return;

            const defaultParameters: Record<string, any> = {};
            definition.parameters.forEach((param) => {
              if (param.defaultValue !== undefined) {
                defaultParameters[param.name] = param.defaultValue;
              }
            });

            const newBlock: PolicyBlock = {
              id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              definitionId: definition.id,
              position,
              parameters: defaultParameters,
              selected: false,
              collapsed: false,
              errors: [],
              warnings: [],
            };

            store.addBlock(newBlock);
          });

          // Verify all blocks were added
          const blocks = useVisualPolicyStore.getState().blocks;
          expect(blocks.length).toBe(blocksToAdd.length);

          // Verify each block has correct properties
          blocks.forEach((block, index) => {
            const expectedBlockId = blocksToAdd[index].blockId;
            const expectedPosition = blocksToAdd[index].position;

            expect(block.definitionId).toBe(expectedBlockId);
            expect(block.position).toEqual(expectedPosition);
          });
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should preserve block uniqueness when adding multiple blocks', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.constantFrom(...BLOCK_LIBRARY.map((b) => b.id)),
          { minLength: 2, maxLength: 10 }
        ),
        (blockIds) => {
          // Clear store
          useVisualPolicyStore.getState().clearPolicy();

          const store = useVisualPolicyStore.getState();

          // Add all blocks
          blockIds.forEach((blockId) => {
            const definition = getBlockById(blockId);
            if (!definition) return;

            const defaultParameters: Record<string, any> = {};
            definition.parameters.forEach((param) => {
              if (param.defaultValue !== undefined) {
                defaultParameters[param.name] = param.defaultValue;
              }
            });

            const newBlock: PolicyBlock = {
              id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              definitionId: definition.id,
              position: { x: 0, y: 0 },
              parameters: defaultParameters,
              selected: false,
              collapsed: false,
              errors: [],
              warnings: [],
            };

            store.addBlock(newBlock);
          });

          // Verify all blocks have unique IDs
          const blocks = useVisualPolicyStore.getState().blocks;
          const blockIdSet = new Set(blocks.map((b) => b.id));
          expect(blockIdSet.size).toBe(blocks.length);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should handle blocks with different parameter types', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...BLOCK_LIBRARY.map((b) => b.id)),
        (blockDefinitionId) => {
          // Clear store
          useVisualPolicyStore.getState().clearPolicy();

          const definition = getBlockById(blockDefinitionId);
          if (!definition) return;

          // Create block with default parameters
          const defaultParameters: Record<string, any> = {};
          definition.parameters.forEach((param) => {
            if (param.defaultValue !== undefined) {
              defaultParameters[param.name] = param.defaultValue;
            }
          });

          const newBlock: PolicyBlock = {
            id: `block-test`,
            definitionId: definition.id,
            position: { x: 100, y: 100 },
            parameters: defaultParameters,
            selected: false,
            collapsed: false,
            errors: [],
            warnings: [],
          };

          const store = useVisualPolicyStore.getState();
          store.addBlock(newBlock);

          const blocks = useVisualPolicyStore.getState().blocks;
          const addedBlock = blocks[0];

          // Verify parameter types match definition
          definition.parameters.forEach((param) => {
            if (param.defaultValue !== undefined) {
              const value = addedBlock.parameters[param.name];
              const expectedType = typeof param.defaultValue;

              // Check type matches
              if (Array.isArray(param.defaultValue)) {
                expect(Array.isArray(value)).toBe(true);
              } else {
                expect(typeof value).toBe(expectedType);
              }
            }
          });
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should maintain block position precision', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...BLOCK_LIBRARY.map((b) => b.id)),
        fc.record({
          x: fc.float({ min: 0, max: 2000, noNaN: true }),
          y: fc.float({ min: 0, max: 2000, noNaN: true }),
        }),
        (blockDefinitionId, position) => {
          // Clear store
          useVisualPolicyStore.getState().clearPolicy();

          const definition = getBlockById(blockDefinitionId);
          if (!definition) return;

          const newBlock: PolicyBlock = {
            id: `block-test`,
            definitionId: definition.id,
            position,
            parameters: {},
            selected: false,
            collapsed: false,
            errors: [],
            warnings: [],
          };

          const store = useVisualPolicyStore.getState();
          store.addBlock(newBlock);

          const blocks = useVisualPolicyStore.getState().blocks;
          const addedBlock = blocks[0];

          // Verify position is preserved with precision
          expect(addedBlock.position.x).toBeCloseTo(position.x, 5);
          expect(addedBlock.position.y).toBeCloseTo(position.y, 5);
        }
      ),
      { numRuns: 30 }
    );
  });
});
