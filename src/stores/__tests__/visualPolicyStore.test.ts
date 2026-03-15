/**
 * Visual Policy Store Tests
 * 
 * Unit tests for the Zustand visual policy store
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useVisualPolicyStore } from '../visualPolicyStore';
import type { PolicyBlock, BlockConnection, VisualPolicy } from '../../types/visual-policy';

describe('visualPolicyStore', () => {
  // Reset store before each test
  beforeEach(() => {
    useVisualPolicyStore.getState().clearPolicy();
  });

  describe('Initial State', () => {
    it('should have empty blocks array', () => {
      const { blocks } = useVisualPolicyStore.getState();
      expect(blocks).toEqual([]);
    });

    it('should have empty connections array', () => {
      const { connections } = useVisualPolicyStore.getState();
      expect(connections).toEqual([]);
    });

    it('should have default viewport', () => {
      const { viewport } = useVisualPolicyStore.getState();
      expect(viewport).toEqual({ x: 0, y: 0, zoom: 1 });
    });

    it('should have no selected block', () => {
      const { selectedBlockId } = useVisualPolicyStore.getState();
      expect(selectedBlockId).toBeNull();
    });

    it('should have config panel closed', () => {
      const { configPanelOpen } = useVisualPolicyStore.getState();
      expect(configPanelOpen).toBe(false);
    });

    it('should have empty history', () => {
      const { history, historyIndex } = useVisualPolicyStore.getState();
      expect(history).toEqual([]);
      expect(historyIndex).toBe(-1);
    });
  });

  describe('Block Management', () => {
    const mockBlock: PolicyBlock = {
      id: 'block-1',
      definitionId: 'pii-detection',
      position: { x: 100, y: 100 },
      parameters: { threshold: 0.8 },
      selected: false,
      collapsed: false,
      errors: [],
      warnings: [],
    };

    it('should add a block', () => {
      const { addBlock } = useVisualPolicyStore.getState();
      addBlock(mockBlock);
      
      const state = useVisualPolicyStore.getState();
      expect(state.blocks).toHaveLength(1);
      expect(state.blocks[0]).toEqual(mockBlock);
    });

    it('should add multiple blocks', () => {
      const { addBlock } = useVisualPolicyStore.getState();
      const block2 = { ...mockBlock, id: 'block-2', position: { x: 200, y: 200 } };
      
      addBlock(mockBlock);
      addBlock(block2);
      
      const state = useVisualPolicyStore.getState();
      expect(state.blocks).toHaveLength(2);
    });

    it('should remove a block', () => {
      const { addBlock, removeBlock } = useVisualPolicyStore.getState();
      addBlock(mockBlock);
      removeBlock('block-1');
      
      const state = useVisualPolicyStore.getState();
      expect(state.blocks).toHaveLength(0);
    });

    it('should remove block connections when removing block', () => {
      const { addBlock, addConnection, removeBlock } = useVisualPolicyStore.getState();
      const block2 = { ...mockBlock, id: 'block-2' };
      const connection: BlockConnection = {
        id: 'conn-1',
        sourceBlockId: 'block-1',
        sourceOutputId: 'out-1',
        targetBlockId: 'block-2',
        targetInputId: 'in-1',
        isValid: true,
      };
      
      addBlock(mockBlock);
      addBlock(block2);
      addConnection(connection);
      removeBlock('block-1');
      
      const state = useVisualPolicyStore.getState();
      expect(state.connections).toHaveLength(0);
    });

    it('should update block properties', () => {
      const { addBlock, updateBlock } = useVisualPolicyStore.getState();
      addBlock(mockBlock);
      updateBlock('block-1', { position: { x: 300, y: 300 } });
      
      const state = useVisualPolicyStore.getState();
      expect(state.blocks[0].position).toEqual({ x: 300, y: 300 });
    });

    it('should update block parameters', () => {
      const { addBlock, updateBlock } = useVisualPolicyStore.getState();
      addBlock(mockBlock);
      updateBlock('block-1', { parameters: { threshold: 0.9 } });
      
      const state = useVisualPolicyStore.getState();
      expect(state.blocks[0].parameters.threshold).toBe(0.9);
    });
  });

  describe('Connection Management', () => {
    const mockConnection: BlockConnection = {
      id: 'conn-1',
      sourceBlockId: 'block-1',
      sourceOutputId: 'out-1',
      targetBlockId: 'block-2',
      targetInputId: 'in-1',
      isValid: true,
    };

    it('should add a connection', () => {
      const { addConnection } = useVisualPolicyStore.getState();
      addConnection(mockConnection);
      
      const state = useVisualPolicyStore.getState();
      expect(state.connections).toHaveLength(1);
      expect(state.connections[0]).toEqual(mockConnection);
    });

    it('should remove a connection', () => {
      const { addConnection, removeConnection } = useVisualPolicyStore.getState();
      addConnection(mockConnection);
      removeConnection('conn-1');
      
      const state = useVisualPolicyStore.getState();
      expect(state.connections).toHaveLength(0);
    });

    it('should update connection properties', () => {
      const { addConnection, updateConnection } = useVisualPolicyStore.getState();
      addConnection(mockConnection);
      updateConnection('conn-1', { isValid: false, error: 'Invalid connection' });
      
      const state = useVisualPolicyStore.getState();
      expect(state.connections[0].isValid).toBe(false);
      expect(state.connections[0].error).toBe('Invalid connection');
    });
  });

  describe('Block Selection', () => {
    const mockBlock: PolicyBlock = {
      id: 'block-1',
      definitionId: 'pii-detection',
      position: { x: 100, y: 100 },
      parameters: {},
      selected: false,
      collapsed: false,
      errors: [],
      warnings: [],
    };

    it('should select a block', () => {
      const { addBlock, selectBlock } = useVisualPolicyStore.getState();
      addBlock(mockBlock);
      selectBlock('block-1');
      
      const state = useVisualPolicyStore.getState();
      expect(state.selectedBlockId).toBe('block-1');
      expect(state.blocks[0].selected).toBe(true);
    });

    it('should deselect all blocks when selecting null', () => {
      const { addBlock, selectBlock } = useVisualPolicyStore.getState();
      addBlock(mockBlock);
      selectBlock('block-1');
      selectBlock(null);
      
      const state = useVisualPolicyStore.getState();
      expect(state.selectedBlockId).toBeNull();
      expect(state.blocks[0].selected).toBe(false);
    });

    it('should open config panel when selecting a block', () => {
      const { addBlock, selectBlock } = useVisualPolicyStore.getState();
      addBlock(mockBlock);
      selectBlock('block-1');
      
      const state = useVisualPolicyStore.getState();
      expect(state.configPanelOpen).toBe(true);
    });

    it('should deselect previous block when selecting new block', () => {
      const { addBlock, selectBlock } = useVisualPolicyStore.getState();
      const block2 = { ...mockBlock, id: 'block-2' };
      
      addBlock(mockBlock);
      addBlock(block2);
      selectBlock('block-1');
      selectBlock('block-2');
      
      const state = useVisualPolicyStore.getState();
      expect(state.blocks[0].selected).toBe(false);
      expect(state.blocks[1].selected).toBe(true);
    });
  });

  describe('Configuration Panel', () => {
    it('should open config panel', () => {
      const { openConfigPanel } = useVisualPolicyStore.getState();
      openConfigPanel();
      
      const state = useVisualPolicyStore.getState();
      expect(state.configPanelOpen).toBe(true);
    });

    it('should close config panel', () => {
      const { openConfigPanel, closeConfigPanel } = useVisualPolicyStore.getState();
      openConfigPanel();
      closeConfigPanel();
      
      const state = useVisualPolicyStore.getState();
      expect(state.configPanelOpen).toBe(false);
    });

    it('should deselect block when closing config panel', () => {
      const { openConfigPanel, closeConfigPanel } = useVisualPolicyStore.getState();
      useVisualPolicyStore.setState({ selectedBlockId: 'block-1' });
      openConfigPanel();
      closeConfigPanel();
      
      const state = useVisualPolicyStore.getState();
      expect(state.selectedBlockId).toBeNull();
    });

    it('should toggle config panel', () => {
      const { toggleConfigPanel } = useVisualPolicyStore.getState();
      
      toggleConfigPanel();
      let state = useVisualPolicyStore.getState();
      expect(state.configPanelOpen).toBe(true);
      
      toggleConfigPanel();
      state = useVisualPolicyStore.getState();
      expect(state.configPanelOpen).toBe(false);
    });
  });

  describe('Viewport Management', () => {
    it('should update viewport position', () => {
      const { setViewport } = useVisualPolicyStore.getState();
      setViewport({ x: 100, y: 200 });
      
      const state = useVisualPolicyStore.getState();
      expect(state.viewport.x).toBe(100);
      expect(state.viewport.y).toBe(200);
      expect(state.viewport.zoom).toBe(1); // Should preserve zoom
    });

    it('should update viewport zoom', () => {
      const { setViewport } = useVisualPolicyStore.getState();
      setViewport({ zoom: 1.5 });
      
      const state = useVisualPolicyStore.getState();
      expect(state.viewport.zoom).toBe(1.5);
      expect(state.viewport.x).toBe(0); // Should preserve position
      expect(state.viewport.y).toBe(0);
    });

    it('should update multiple viewport properties', () => {
      const { setViewport } = useVisualPolicyStore.getState();
      setViewport({ x: 50, y: 75, zoom: 0.8 });
      
      const state = useVisualPolicyStore.getState();
      expect(state.viewport).toEqual({ x: 50, y: 75, zoom: 0.8 });
    });
  });

  describe('Undo/Redo', () => {
    const mockBlock: PolicyBlock = {
      id: 'block-1',
      definitionId: 'pii-detection',
      position: { x: 100, y: 100 },
      parameters: {},
      selected: false,
      collapsed: false,
      errors: [],
      warnings: [],
    };

    it('should not be able to undo initially', () => {
      const { canUndo } = useVisualPolicyStore.getState();
      expect(canUndo()).toBe(false);
    });

    it('should not be able to redo initially', () => {
      const { canRedo } = useVisualPolicyStore.getState();
      expect(canRedo()).toBe(false);
    });

    it('should save to history after adding block', async () => {
      const { addBlock, history } = useVisualPolicyStore.getState();
      addBlock(mockBlock);
      
      // Wait for async history save
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const state = useVisualPolicyStore.getState();
      expect(state.history.length).toBeGreaterThan(0);
    });

    it('should undo block addition', async () => {
      const { addBlock, undo, blocks } = useVisualPolicyStore.getState();
      
      // Save initial state
      useVisualPolicyStore.getState().saveToHistory();
      
      addBlock(mockBlock);
      await new Promise(resolve => setTimeout(resolve, 10));
      
      undo();
      
      const state = useVisualPolicyStore.getState();
      expect(state.blocks).toHaveLength(0);
    });

    it('should redo block addition', async () => {
      const { addBlock, undo, redo, blocks } = useVisualPolicyStore.getState();
      
      // Save initial state
      useVisualPolicyStore.getState().saveToHistory();
      
      addBlock(mockBlock);
      await new Promise(resolve => setTimeout(resolve, 10));
      
      undo();
      redo();
      
      const state = useVisualPolicyStore.getState();
      expect(state.blocks).toHaveLength(1);
      expect(state.blocks[0].id).toBe('block-1');
    });

    it('should limit history to max size', async () => {
      const { addBlock, history, maxHistorySize } = useVisualPolicyStore.getState();
      
      // Add more blocks than max history size
      for (let i = 0; i < maxHistorySize + 10; i++) {
        addBlock({ ...mockBlock, id: `block-${i}` });
        await new Promise(resolve => setTimeout(resolve, 5));
      }
      
      const state = useVisualPolicyStore.getState();
      expect(state.history.length).toBeLessThanOrEqual(maxHistorySize);
    });

    it('should truncate future history when making changes after undo', async () => {
      const { addBlock, undo, saveToHistory } = useVisualPolicyStore.getState();
      
      // Save initial state
      saveToHistory();
      
      // Add first block
      addBlock(mockBlock);
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Add second block
      addBlock({ ...mockBlock, id: 'block-2' });
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Undo once
      undo();
      
      // Add different block
      addBlock({ ...mockBlock, id: 'block-3' });
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const state = useVisualPolicyStore.getState();
      // Should not be able to redo to block-2
      expect(state.canRedo()).toBe(false);
    });
  });

  describe('Policy Loading and Clearing', () => {
    const mockPolicy: VisualPolicy = {
      id: 'policy-1',
      workspaceId: 'workspace-1',
      name: 'Test Policy',
      description: 'A test policy',
      blocks: [
        {
          id: 'block-1',
          definitionId: 'pii-detection',
          position: { x: 100, y: 100 },
          parameters: { threshold: 0.8 },
          selected: false,
          collapsed: false,
          errors: [],
          warnings: [],
        },
        {
          id: 'block-2',
          definitionId: 'deny-request',
          position: { x: 300, y: 100 },
          parameters: {},
          selected: false,
          collapsed: false,
          errors: [],
          warnings: [],
        },
      ],
      connections: [
        {
          id: 'conn-1',
          sourceBlockId: 'block-1',
          sourceOutputId: 'out-1',
          targetBlockId: 'block-2',
          targetInputId: 'in-1',
          isValid: true,
        },
      ],
      viewport: { x: 50, y: 50, zoom: 1.2 },
      metadata: {
        tags: [],
        category: 'security',
        providers: ['openai'],
        models: ['gpt-4'],
        estimatedCost: 0,
        testCoverage: 0,
        isVisual: true,
      },
      version: '1.0.0',
      createdBy: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should load a complete policy', () => {
      const { loadPolicy } = useVisualPolicyStore.getState();
      loadPolicy(mockPolicy);
      
      const state = useVisualPolicyStore.getState();
      expect(state.blocks).toHaveLength(2);
      expect(state.connections).toHaveLength(1);
      expect(state.viewport).toEqual({ x: 50, y: 50, zoom: 1.2 });
    });

    it('should reset selection when loading policy', () => {
      const { loadPolicy } = useVisualPolicyStore.getState();
      
      // Set some selection state
      useVisualPolicyStore.setState({ selectedBlockId: 'block-1', configPanelOpen: true });
      
      loadPolicy(mockPolicy);
      
      const state = useVisualPolicyStore.getState();
      expect(state.selectedBlockId).toBeNull();
      expect(state.configPanelOpen).toBe(false);
    });

    it('should reset history when loading policy', () => {
      const { loadPolicy } = useVisualPolicyStore.getState();
      
      // Add some history
      useVisualPolicyStore.getState().saveToHistory();
      useVisualPolicyStore.getState().saveToHistory();
      
      loadPolicy(mockPolicy);
      
      const state = useVisualPolicyStore.getState();
      expect(state.history).toHaveLength(0);
      expect(state.historyIndex).toBe(-1);
    });

    it('should clear all policy data', () => {
      const { loadPolicy, clearPolicy } = useVisualPolicyStore.getState();
      
      loadPolicy(mockPolicy);
      clearPolicy();
      
      const state = useVisualPolicyStore.getState();
      expect(state.blocks).toHaveLength(0);
      expect(state.connections).toHaveLength(0);
      expect(state.viewport).toEqual({ x: 0, y: 0, zoom: 1 });
      expect(state.selectedBlockId).toBeNull();
      expect(state.configPanelOpen).toBe(false);
      expect(state.history).toHaveLength(0);
      expect(state.historyIndex).toBe(-1);
    });

    it('should deep clone policy data when loading', () => {
      const { loadPolicy } = useVisualPolicyStore.getState();
      loadPolicy(mockPolicy);
      
      const state = useVisualPolicyStore.getState();
      // Modify loaded block
      state.blocks[0].position.x = 999;
      
      // Original policy should not be affected
      expect(mockPolicy.blocks[0].position.x).toBe(100);
    });
  });

  describe('History Management', () => {
    it('should save current state to history', () => {
      const { saveToHistory } = useVisualPolicyStore.getState();
      
      saveToHistory();
      
      const state = useVisualPolicyStore.getState();
      expect(state.history).toHaveLength(1);
      expect(state.historyIndex).toBe(0);
    });

    it('should preserve blocks in history', () => {
      const mockBlock: PolicyBlock = {
        id: 'block-1',
        definitionId: 'pii-detection',
        position: { x: 100, y: 100 },
        parameters: {},
        selected: false,
        collapsed: false,
        errors: [],
        warnings: [],
      };
      
      const { addBlock, saveToHistory } = useVisualPolicyStore.getState();
      
      addBlock(mockBlock);
      saveToHistory();
      
      const state = useVisualPolicyStore.getState();
      expect(state.history[state.historyIndex].blocks).toHaveLength(1);
    });

    it('should preserve viewport in history', () => {
      const { setViewport, saveToHistory } = useVisualPolicyStore.getState();
      
      setViewport({ x: 100, y: 200, zoom: 1.5 });
      saveToHistory();
      
      const state = useVisualPolicyStore.getState();
      expect(state.history[state.historyIndex].viewport).toEqual({ x: 100, y: 200, zoom: 1.5 });
    });
  });
});
