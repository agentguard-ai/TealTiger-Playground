/**
 * VisualFlowCanvas Tests
 * 
 * Tests for the visual flow canvas component including:
 * - Block addition to canvas
 * - Block connection creation
 * - Connection validation
 * - Block selection and deletion
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useVisualPolicyStore } from '../../../stores/visualPolicyStore';
import { PolicyBlock, BlockConnection } from '../../../types/visual-policy';
import { validateConnection, wouldCreateCycle } from '../../../services/ConnectionValidator';

describe('VisualFlowCanvas - Block Addition', () => {
  beforeEach(() => {
    // Clear store before each test
    useVisualPolicyStore.getState().clearPolicy();
  });

  it('should add a block to the canvas', () => {
    const store = useVisualPolicyStore.getState();
    
    const newBlock: PolicyBlock = {
      id: 'block-1',
      definitionId: 'guard-pii-detection',
      position: { x: 100, y: 100 },
      parameters: {
        piiTypes: ['email', 'phone'],
        threshold: 0.8,
        redactEnabled: false,
      },
      selected: false,
      collapsed: false,
      errors: [],
      warnings: [],
    };

    store.addBlock(newBlock);

    const blocks = useVisualPolicyStore.getState().blocks;
    expect(blocks).toHaveLength(1);
    expect(blocks[0].id).toBe('block-1');
    expect(blocks[0].definitionId).toBe('guard-pii-detection');
    expect(blocks[0].position).toEqual({ x: 100, y: 100 });
  });

  it('should add block with correct default parameters', () => {
    const store = useVisualPolicyStore.getState();
    
    const newBlock: PolicyBlock = {
      id: 'block-2',
      definitionId: 'action-allow',
      position: { x: 200, y: 200 },
      parameters: {
        logDecision: true,
        metadata: '',
      },
      selected: false,
      collapsed: false,
      errors: [],
      warnings: [],
    };

    store.addBlock(newBlock);

    const blocks = useVisualPolicyStore.getState().blocks;
    expect(blocks[0].parameters.logDecision).toBe(true);
    expect(blocks[0].parameters.metadata).toBe('');
  });

  it('should add multiple blocks to the canvas', () => {
    const store = useVisualPolicyStore.getState();
    
    const block1: PolicyBlock = {
      id: 'block-1',
      definitionId: 'guard-pii-detection',
      position: { x: 100, y: 100 },
      parameters: {},
      selected: false,
      collapsed: false,
      errors: [],
      warnings: [],
    };

    const block2: PolicyBlock = {
      id: 'block-2',
      definitionId: 'action-allow',
      position: { x: 300, y: 100 },
      parameters: {},
      selected: false,
      collapsed: false,
      errors: [],
      warnings: [],
    };

    store.addBlock(block1);
    store.addBlock(block2);

    const blocks = useVisualPolicyStore.getState().blocks;
    expect(blocks).toHaveLength(2);
  });
});

describe('VisualFlowCanvas - Block Connections', () => {
  beforeEach(() => {
    useVisualPolicyStore.getState().clearPolicy();
  });

  it('should create a connection between two blocks', () => {
    const store = useVisualPolicyStore.getState();
    
    // Add two blocks
    const block1: PolicyBlock = {
      id: 'block-1',
      definitionId: 'guard-pii-detection',
      position: { x: 100, y: 100 },
      parameters: {},
      selected: false,
      collapsed: false,
      errors: [],
      warnings: [],
    };

    const block2: PolicyBlock = {
      id: 'block-2',
      definitionId: 'action-allow',
      position: { x: 300, y: 100 },
      parameters: {},
      selected: false,
      collapsed: false,
      errors: [],
      warnings: [],
    };

    store.addBlock(block1);
    store.addBlock(block2);

    // Create connection
    const connection: BlockConnection = {
      id: 'conn-1',
      sourceBlockId: 'block-1',
      sourceOutputId: 'out',
      targetBlockId: 'block-2',
      targetInputId: 'in',
      isValid: true,
    };

    store.addConnection(connection);

    const connections = useVisualPolicyStore.getState().connections;
    expect(connections).toHaveLength(1);
    expect(connections[0].sourceBlockId).toBe('block-1');
    expect(connections[0].targetBlockId).toBe('block-2');
  });

  it('should validate connection compatibility', () => {
    const sourceBlock: PolicyBlock = {
      id: 'block-1',
      definitionId: 'guard-pii-detection',
      position: { x: 100, y: 100 },
      parameters: {},
      selected: false,
      collapsed: false,
      errors: [],
      warnings: [],
    };

    const targetBlock: PolicyBlock = {
      id: 'block-2',
      definitionId: 'action-allow',
      position: { x: 300, y: 100 },
      parameters: {},
      selected: false,
      collapsed: false,
      errors: [],
      warnings: [],
    };

    const connection: BlockConnection = {
      id: 'conn-1',
      sourceBlockId: 'block-1',
      sourceOutputId: 'out',
      targetBlockId: 'block-2',
      targetInputId: 'in',
      isValid: true,
    };

    const result = validateConnection(connection, sourceBlock, targetBlock);
    expect(result.isValid).toBe(true);
  });

  it('should prevent self-connections', () => {
    const block: PolicyBlock = {
      id: 'block-1',
      definitionId: 'guard-pii-detection',
      position: { x: 100, y: 100 },
      parameters: {},
      selected: false,
      collapsed: false,
      errors: [],
      warnings: [],
    };

    const connection: BlockConnection = {
      id: 'conn-1',
      sourceBlockId: 'block-1',
      sourceOutputId: 'out',
      targetBlockId: 'block-1',
      targetInputId: 'in',
      isValid: true,
    };

    const result = validateConnection(connection, block, block);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Cannot connect block to itself');
  });

  it('should detect cycles in connections', () => {
    const connection1: BlockConnection = {
      id: 'conn-1',
      sourceBlockId: 'block-1',
      sourceOutputId: 'out',
      targetBlockId: 'block-2',
      targetInputId: 'in',
      isValid: true,
    };

    const connection2: BlockConnection = {
      id: 'conn-2',
      sourceBlockId: 'block-2',
      sourceOutputId: 'out',
      targetBlockId: 'block-3',
      targetInputId: 'in',
      isValid: true,
    };

    // This would create a cycle: block-3 -> block-1
    const connection3: BlockConnection = {
      id: 'conn-3',
      sourceBlockId: 'block-3',
      sourceOutputId: 'out',
      targetBlockId: 'block-1',
      targetInputId: 'in',
      isValid: true,
    };

    const hasCycle = wouldCreateCycle(connection3, [connection1, connection2]);
    expect(hasCycle).toBe(true);
  });

  it('should allow valid connection chains without cycles', () => {
    const connection1: BlockConnection = {
      id: 'conn-1',
      sourceBlockId: 'block-1',
      sourceOutputId: 'out',
      targetBlockId: 'block-2',
      targetInputId: 'in',
      isValid: true,
    };

    const connection2: BlockConnection = {
      id: 'conn-2',
      sourceBlockId: 'block-2',
      sourceOutputId: 'out',
      targetBlockId: 'block-3',
      targetInputId: 'in',
      isValid: true,
    };

    // This is valid: block-1 -> block-4
    const connection3: BlockConnection = {
      id: 'conn-3',
      sourceBlockId: 'block-1',
      sourceOutputId: 'out',
      targetBlockId: 'block-4',
      targetInputId: 'in',
      isValid: true,
    };

    const hasCycle = wouldCreateCycle(connection3, [connection1, connection2]);
    expect(hasCycle).toBe(false);
  });
});

describe('VisualFlowCanvas - Block Selection and Deletion', () => {
  beforeEach(() => {
    useVisualPolicyStore.getState().clearPolicy();
  });

  it('should select a block', () => {
    const store = useVisualPolicyStore.getState();
    
    const block: PolicyBlock = {
      id: 'block-1',
      definitionId: 'guard-pii-detection',
      position: { x: 100, y: 100 },
      parameters: {},
      selected: false,
      collapsed: false,
      errors: [],
      warnings: [],
    };

    store.addBlock(block);
    store.selectBlock('block-1');

    const state = useVisualPolicyStore.getState();
    expect(state.selectedBlockId).toBe('block-1');
    expect(state.blocks[0].selected).toBe(true);
  });

  it('should deselect a block', () => {
    const store = useVisualPolicyStore.getState();
    
    const block: PolicyBlock = {
      id: 'block-1',
      definitionId: 'guard-pii-detection',
      position: { x: 100, y: 100 },
      parameters: {},
      selected: false,
      collapsed: false,
      errors: [],
      warnings: [],
    };

    store.addBlock(block);
    store.selectBlock('block-1');
    store.selectBlock(null);

    const state = useVisualPolicyStore.getState();
    expect(state.selectedBlockId).toBe(null);
    expect(state.blocks[0].selected).toBe(false);
  });

  it('should delete a block', () => {
    const store = useVisualPolicyStore.getState();
    
    const block: PolicyBlock = {
      id: 'block-1',
      definitionId: 'guard-pii-detection',
      position: { x: 100, y: 100 },
      parameters: {},
      selected: false,
      collapsed: false,
      errors: [],
      warnings: [],
    };

    store.addBlock(block);
    expect(store.blocks).toHaveLength(1);

    store.removeBlock('block-1');
    expect(useVisualPolicyStore.getState().blocks).toHaveLength(0);
  });

  it('should delete block and its connections', () => {
    const store = useVisualPolicyStore.getState();
    
    // Add blocks
    const block1: PolicyBlock = {
      id: 'block-1',
      definitionId: 'guard-pii-detection',
      position: { x: 100, y: 100 },
      parameters: {},
      selected: false,
      collapsed: false,
      errors: [],
      warnings: [],
    };

    const block2: PolicyBlock = {
      id: 'block-2',
      definitionId: 'action-allow',
      position: { x: 300, y: 100 },
      parameters: {},
      selected: false,
      collapsed: false,
      errors: [],
      warnings: [],
    };

    store.addBlock(block1);
    store.addBlock(block2);

    // Add connection
    const connection: BlockConnection = {
      id: 'conn-1',
      sourceBlockId: 'block-1',
      sourceOutputId: 'out',
      targetBlockId: 'block-2',
      targetInputId: 'in',
      isValid: true,
    };

    store.addConnection(connection);
    expect(store.connections).toHaveLength(1);

    // Delete block-1
    store.removeBlock('block-1');

    const state = useVisualPolicyStore.getState();
    expect(state.blocks).toHaveLength(1);
    expect(state.connections).toHaveLength(0); // Connection should be removed
  });

  it('should deselect block when deleted', () => {
    const store = useVisualPolicyStore.getState();
    
    const block: PolicyBlock = {
      id: 'block-1',
      definitionId: 'guard-pii-detection',
      position: { x: 100, y: 100 },
      parameters: {},
      selected: false,
      collapsed: false,
      errors: [],
      warnings: [],
    };

    store.addBlock(block);
    store.selectBlock('block-1');
    expect(store.selectedBlockId).toBe('block-1');

    store.removeBlock('block-1');
    expect(useVisualPolicyStore.getState().selectedBlockId).toBe(null);
  });
});

describe('VisualFlowCanvas - Undo/Redo', () => {
  beforeEach(() => {
    useVisualPolicyStore.getState().clearPolicy();
  });

  it('should support undo for block addition', () => {
    const store = useVisualPolicyStore.getState();
    
    const block: PolicyBlock = {
      id: 'block-1',
      definitionId: 'guard-pii-detection',
      position: { x: 100, y: 100 },
      parameters: {},
      selected: false,
      collapsed: false,
      errors: [],
      warnings: [],
    };

    store.addBlock(block);
    expect(store.blocks).toHaveLength(1);

    // Wait for history to be saved
    setTimeout(() => {
      store.undo();
      expect(useVisualPolicyStore.getState().blocks).toHaveLength(0);
    }, 10);
  });

  it('should support redo after undo', () => {
    const store = useVisualPolicyStore.getState();
    
    const block: PolicyBlock = {
      id: 'block-1',
      definitionId: 'guard-pii-detection',
      position: { x: 100, y: 100 },
      parameters: {},
      selected: false,
      collapsed: false,
      errors: [],
      warnings: [],
    };

    store.addBlock(block);
    
    setTimeout(() => {
      store.undo();
      expect(useVisualPolicyStore.getState().blocks).toHaveLength(0);

      store.redo();
      expect(useVisualPolicyStore.getState().blocks).toHaveLength(1);
    }, 10);
  });
});
