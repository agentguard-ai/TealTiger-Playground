/**
 * VisualFlowCanvas - React Flow canvas for visual policy building
 * 
 * This component provides the main canvas for drag-and-drop policy building
 * with custom node types, connection validation, and canvas controls.
 */

import { useCallback, useMemo, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  NodeTypes,
  EdgeTypes,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useVisualPolicyStore } from '../../stores/visualPolicyStore';
import { PolicyBlock, BlockConnection } from '../../types/visual-policy';
import { getBlockById } from '../../data/blockLibrary';
import { validateConnection, wouldCreateCycle, getConditionalLabel } from '../../services/ConnectionValidator';
import PolicyBlockNode from './PolicyBlockNode';
import BlockConnector from './BlockConnector';

/**
 * VisualFlowCanvas component
 * 
 * Main canvas for visual policy building with React Flow.
 * Integrates with Zustand store for state management.
 */
const VisualFlowCanvas: React.FC = () => {
  const reactFlowInstance = useReactFlow();
  
  // Get state and actions from Zustand store
  const blocks = useVisualPolicyStore((state) => state.blocks);
  const connections = useVisualPolicyStore((state) => state.connections);
  const viewport = useVisualPolicyStore((state) => state.viewport);
  const addConnection = useVisualPolicyStore((state) => state.addConnection);
  const updateBlock = useVisualPolicyStore((state) => state.updateBlock);
  const selectBlock = useVisualPolicyStore((state) => state.selectBlock);
  const setViewport = useVisualPolicyStore((state) => state.setViewport);

  // Convert PolicyBlock[] to React Flow Node[]
  const nodes: Node[] = useMemo(() => {
    return blocks.map((block: PolicyBlock) => ({
      id: block.id,
      type: 'policyBlock',
      position: block.position,
      data: {
        block,
      },
      selected: block.selected,
    }));
  }, [blocks]);

  // Convert BlockConnection[] to React Flow Edge[]
  const edges: Edge[] = useMemo(() => {
    return connections.map((conn: BlockConnection) => ({
      id: conn.id,
      source: conn.sourceBlockId,
      sourceHandle: conn.sourceOutputId,
      target: conn.targetBlockId,
      targetHandle: conn.targetInputId,
      type: 'blockConnector',
      data: {
        connection: conn,
      },
      animated: !conn.isValid,
      style: {
        stroke: conn.isValid ? '#0EA5E9' : '#EF4444',
        strokeWidth: 2,
      },
    }));
  }, [connections]);

  // Custom node types
  const nodeTypes: NodeTypes = useMemo(
    () => ({
      policyBlock: PolicyBlockNode,
    }),
    []
  );

  // Custom edge types
  const edgeTypes: EdgeTypes = useMemo(
    () => ({
      blockConnector: BlockConnector,
    }),
    []
  );

  // Handle node position changes
  const onNodesChange = useCallback(
    (changes: any[]) => {
      changes.forEach((change) => {
        if (change.type === 'position' && change.position) {
          updateBlock(change.id, { position: change.position });
        }
        if (change.type === 'select') {
          if (change.selected) {
            selectBlock(change.id);
          }
        }
      });
    },
    [updateBlock, selectBlock]
  );

  // Handle edge changes (deletions, etc.)
  const onEdgesChange = useCallback(
    (changes: any[]) => {
      // Handle edge deletions through store
      changes.forEach((change) => {
        if (change.type === 'remove') {
          const removeConnection = useVisualPolicyStore.getState().removeConnection;
          removeConnection(change.id);
        }
      });
    },
    []
  );

  // Handle new connections
  const onConnect = useCallback(
    (params: Connection | Edge) => {
      if (!params.source || !params.target) return;

      // Get source and target blocks
      const sourceBlock = blocks.find((b) => b.id === params.source);
      const targetBlock = blocks.find((b) => b.id === params.target);

      if (!sourceBlock || !targetBlock) return;

      // Create new connection
      const newConnection: BlockConnection = {
        id: `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        sourceBlockId: params.source,
        sourceOutputId: params.sourceHandle || 'out',
        targetBlockId: params.target,
        targetInputId: params.targetHandle || 'in',
        isValid: true,
      };

      // Check for cycles
      if (wouldCreateCycle(newConnection, connections)) {
        console.warn('Connection would create a cycle');
        return;
      }

      // Validate connection
      const validationResult = validateConnection(newConnection, sourceBlock, targetBlock);
      
      if (!validationResult.isValid) {
        newConnection.isValid = false;
        newConnection.error = validationResult.error;
      }

      // Add conditional label if applicable
      const conditionalLabel = getConditionalLabel(newConnection.sourceOutputId);
      if (conditionalLabel) {
        newConnection.condition = conditionalLabel;
      }

      addConnection(newConnection);
    },
    [addConnection, blocks, connections]
  );

  // Handle viewport changes
  const onMoveEnd = useCallback(
    (_event: any, viewport: any) => {
      setViewport({
        x: viewport.x,
        y: viewport.y,
        zoom: viewport.zoom,
      });
    },
    [setViewport]
  );

  // Handle canvas click (deselect blocks)
  const onPaneClick = useCallback(() => {
    selectBlock(null);
  }, [selectBlock]);

  // Fit view to all nodes
  const handleFitView = useCallback(() => {
    reactFlowInstance.fitView({ padding: 0.2, duration: 300 });
  }, [reactFlowInstance]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const selectedBlockId = useVisualPolicyStore.getState().selectedBlockId;
      const canUndo = useVisualPolicyStore.getState().canUndo;
      const canRedo = useVisualPolicyStore.getState().canRedo;
      const undo = useVisualPolicyStore.getState().undo;
      const redo = useVisualPolicyStore.getState().redo;

      // Ctrl/Cmd + Z: Undo
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        if (canUndo()) {
          undo();
        }
      }

      // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y: Redo
      if (
        ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'z') ||
        ((event.ctrlKey || event.metaKey) && event.key === 'y')
      ) {
        event.preventDefault();
        if (canRedo()) {
          redo();
        }
      }

      // Ctrl/Cmd + D: Duplicate selected block
      if ((event.ctrlKey || event.metaKey) && event.key === 'd' && selectedBlockId) {
        event.preventDefault();
        const block = blocks.find((b) => b.id === selectedBlockId);
        if (block) {
          const addBlock = useVisualPolicyStore.getState().addBlock;
          const newBlock: PolicyBlock = {
            ...block,
            id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            position: {
              x: block.position.x + 20,
              y: block.position.y + 20,
            },
            selected: false,
          };
          addBlock(newBlock);
        }
      }

      // Escape: Deselect
      if (event.key === 'Escape') {
        selectBlock(null);
      }

      // Ctrl/Cmd + A: Select all (fit view)
      if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
        event.preventDefault();
        handleFitView();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [blocks, selectBlock, handleFitView]);

  // Handle drag over (required for drop to work)
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drop from Block Library
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      // Get block definition ID from drag data
      const blockDefinitionId = event.dataTransfer.getData('application/reactflow');
      if (!blockDefinitionId) return;

      // Get block definition
      const definition = getBlockById(blockDefinitionId);
      if (!definition) return;

      // Calculate drop position in canvas coordinates
      const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      // Create new block with default parameters
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
      const addBlock = useVisualPolicyStore.getState().addBlock;
      addBlock(newBlock);
    },
    [reactFlowInstance]
  );

  return (
    <div style={{ width: '100%', height: '100%' }} className="bg-gray-900">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onMoveEnd={onMoveEnd}
        onPaneClick={onPaneClick}
        onDrop={onDrop}
        onDragOver={onDragOver}
        defaultViewport={viewport}
        fitView
        className="bg-gray-900"
        snapToGrid
        snapGrid={[16, 16]}
        deleteKeyCode="Delete"
        multiSelectionKeyCode="Shift"
      >
        {/* Background grid for visual alignment */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={16}
          size={1}
          color="#374151"
        />
        
        {/* Zoom and pan controls */}
        <Controls className="bg-gray-800 border-gray-700">
          <button
            onClick={handleFitView}
            className="react-flow__controls-button"
            title="Fit view"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          </button>
        </Controls>
        
        {/* Minimap for navigation */}
        <MiniMap
          className="bg-gray-800 border-gray-700"
          nodeColor="#0EA5E9"
          maskColor="rgba(0, 0, 0, 0.6)"
          pannable
          zoomable
        />
      </ReactFlow>
    </div>
  );
};

export default VisualFlowCanvas;
