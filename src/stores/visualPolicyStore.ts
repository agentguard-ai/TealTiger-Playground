/**
 * Visual Policy Store
 * 
 * Zustand store for managing visual policy builder state including blocks,
 * connections, viewport, UI state, and undo/redo functionality.
 * 
 * @module stores/visualPolicyStore
 */

import { create } from 'zustand';
import type {
  PolicyBlock,
  BlockConnection,
  VisualPolicy,
} from '../types/visual-policy';

/**
 * Viewport state for the canvas
 */
export interface ViewportState {
  x: number;
  y: number;
  zoom: number;
}

/**
 * History entry for undo/redo
 */
interface HistoryEntry {
  blocks: PolicyBlock[];
  connections: BlockConnection[];
  viewport: ViewportState;
}

/**
 * Visual policy store state
 */
export interface VisualPolicyState {
  // Policy data
  blocks: PolicyBlock[];
  connections: BlockConnection[];
  viewport: ViewportState;
  
  // UI state
  selectedBlockId: string | null;
  configPanelOpen: boolean;
  
  // History for undo/redo
  history: HistoryEntry[];
  historyIndex: number;
  maxHistorySize: number;
  
  // Actions
  addBlock: (block: PolicyBlock) => void;
  removeBlock: (blockId: string) => void;
  updateBlock: (blockId: string, updates: Partial<PolicyBlock>) => void;
  addConnection: (connection: BlockConnection) => void;
  removeConnection: (connectionId: string) => void;
  updateConnection: (connectionId: string, updates: Partial<BlockConnection>) => void;
  
  // Selection
  selectBlock: (blockId: string | null) => void;
  
  // Configuration panel
  openConfigPanel: () => void;
  closeConfigPanel: () => void;
  toggleConfigPanel: () => void;
  
  // Viewport
  setViewport: (viewport: Partial<ViewportState>) => void;
  
  // Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // Bulk operations
  loadPolicy: (policy: VisualPolicy) => void;
  clearPolicy: () => void;
  
  // History management
  saveToHistory: () => void;
}

/**
 * Default viewport state
 */
const DEFAULT_VIEWPORT: ViewportState = {
  x: 0,
  y: 0,
  zoom: 1,
};

/**
 * Create a history entry from current state
 */
const createHistoryEntry = (
  blocks: PolicyBlock[],
  connections: BlockConnection[],
  viewport: ViewportState
): HistoryEntry => ({
  blocks: JSON.parse(JSON.stringify(blocks)),
  connections: JSON.parse(JSON.stringify(connections)),
  viewport: { ...viewport },
});

/**
 * Visual policy store
 * 
 * Manages all state for the visual policy builder including blocks, connections,
 * viewport, selection, and undo/redo history.
 */
export const useVisualPolicyStore = create<VisualPolicyState>((set, get) => ({
  // Initial state
  blocks: [],
  connections: [],
  viewport: DEFAULT_VIEWPORT,
  selectedBlockId: null,
  configPanelOpen: false,
  history: [],
  historyIndex: -1,
  maxHistorySize: 50,
  
  // Add a new block to the canvas
  addBlock: (block: PolicyBlock) => {
    set((state) => {
      const newBlocks = [...state.blocks, block];
      const newState = { blocks: newBlocks };
      
      // Save to history after state update
      setTimeout(() => get().saveToHistory(), 0);
      
      return newState;
    });
  },
  
  // Remove a block and its connections
  removeBlock: (blockId: string) => {
    set((state) => {
      const newBlocks = state.blocks.filter((b) => b.id !== blockId);
      const newConnections = state.connections.filter(
        (c) => c.sourceBlockId !== blockId && c.targetBlockId !== blockId
      );
      
      const newState = {
        blocks: newBlocks,
        connections: newConnections,
        selectedBlockId: state.selectedBlockId === blockId ? null : state.selectedBlockId,
      };
      
      // Save to history after state update
      setTimeout(() => get().saveToHistory(), 0);
      
      return newState;
    });
  },
  
  // Update a block's properties
  updateBlock: (blockId: string, updates: Partial<PolicyBlock>) => {
    set((state) => {
      const newBlocks = state.blocks.map((block) =>
        block.id === blockId ? { ...block, ...updates } : block
      );
      
      const newState = { blocks: newBlocks };
      
      // Save to history after state update (debounced for parameter changes)
      setTimeout(() => get().saveToHistory(), 0);
      
      return newState;
    });
  },
  
  // Add a new connection between blocks
  addConnection: (connection: BlockConnection) => {
    set((state) => {
      const newConnections = [...state.connections, connection];
      const newState = { connections: newConnections };
      
      // Save to history after state update
      setTimeout(() => get().saveToHistory(), 0);
      
      return newState;
    });
  },
  
  // Remove a connection
  removeConnection: (connectionId: string) => {
    set((state) => {
      const newConnections = state.connections.filter((c) => c.id !== connectionId);
      const newState = { connections: newConnections };
      
      // Save to history after state update
      setTimeout(() => get().saveToHistory(), 0);
      
      return newState;
    });
  },
  
  // Update a connection's properties
  updateConnection: (connectionId: string, updates: Partial<BlockConnection>) => {
    set((state) => {
      const newConnections = state.connections.map((conn) =>
        conn.id === connectionId ? { ...conn, ...updates } : conn
      );
      
      return { connections: newConnections };
    });
  },
  
  // Select a block (or deselect if null)
  selectBlock: (blockId: string | null) => {
    set((state) => {
      // Deselect all blocks first
      const newBlocks = state.blocks.map((block) => ({
        ...block,
        selected: block.id === blockId,
      }));
      
      return {
        blocks: newBlocks,
        selectedBlockId: blockId,
        configPanelOpen: blockId !== null,
      };
    });
  },
  
  // Open configuration panel
  openConfigPanel: () => {
    set({ configPanelOpen: true });
  },
  
  // Close configuration panel
  closeConfigPanel: () => {
    set({ configPanelOpen: false, selectedBlockId: null });
  },
  
  // Toggle configuration panel
  toggleConfigPanel: () => {
    set((state) => ({ configPanelOpen: !state.configPanelOpen }));
  },
  
  // Update viewport state
  setViewport: (viewport: Partial<ViewportState>) => {
    set((state) => ({
      viewport: { ...state.viewport, ...viewport },
    }));
  },
  
  // Undo last action
  undo: () => {
    const state = get();
    if (!state.canUndo()) return;
    
    const newIndex = state.historyIndex - 1;
    const entry = state.history[newIndex];
    
    set({
      blocks: JSON.parse(JSON.stringify(entry.blocks)),
      connections: JSON.parse(JSON.stringify(entry.connections)),
      viewport: { ...entry.viewport },
      historyIndex: newIndex,
    });
  },
  
  // Redo last undone action
  redo: () => {
    const state = get();
    if (!state.canRedo()) return;
    
    const newIndex = state.historyIndex + 1;
    const entry = state.history[newIndex];
    
    set({
      blocks: JSON.parse(JSON.stringify(entry.blocks)),
      connections: JSON.parse(JSON.stringify(entry.connections)),
      viewport: { ...entry.viewport },
      historyIndex: newIndex,
    });
  },
  
  // Check if undo is available
  canUndo: () => {
    const state = get();
    return state.historyIndex > 0;
  },
  
  // Check if redo is available
  canRedo: () => {
    const state = get();
    return state.historyIndex < state.history.length - 1;
  },
  
  // Load a complete policy
  loadPolicy: (policy: VisualPolicy) => {
    set({
      blocks: JSON.parse(JSON.stringify(policy.blocks)),
      connections: JSON.parse(JSON.stringify(policy.connections)),
      viewport: { ...policy.viewport },
      selectedBlockId: null,
      configPanelOpen: false,
      history: [],
      historyIndex: -1,
    });
    
    // Save initial state to history
    setTimeout(() => get().saveToHistory(), 0);
  },
  
  // Clear all policy data
  clearPolicy: () => {
    set({
      blocks: [],
      connections: [],
      viewport: DEFAULT_VIEWPORT,
      selectedBlockId: null,
      configPanelOpen: false,
      history: [],
      historyIndex: -1,
    });
  },
  
  // Save current state to history
  saveToHistory: () => {
    set((state) => {
      const entry = createHistoryEntry(state.blocks, state.connections, state.viewport);
      
      // If we're not at the end of history, truncate future entries
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      
      // Add new entry
      newHistory.push(entry);
      
      // Limit history size
      if (newHistory.length > state.maxHistorySize) {
        newHistory.shift();
      }
      
      return {
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
  },
}));
