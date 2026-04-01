import React, { useCallback } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
} from 'reactflow';
import type { Node, Edge, Connection } from 'reactflow';
import 'reactflow/dist/style.css';
import { BlockLibrary } from './BlockLibrary';
import { useVisualPolicyStore } from '../../stores/visualPolicyStore';
import { getBlockById } from '../../data/blockLibrary';
import type { PolicyBlock } from '../../types/visual-policy';

const CATEGORY_COLORS: Record<string, string> = {
  guards: '#a855f7',
  actions: '#10b981',
  routing: '#3b82f6',
  'cost-control': '#f59e0b',
  compliance: '#6366f1',
  conditional: '#f97316',
  utility: '#6b7280',
};

const FlowCanvas: React.FC = () => {
  const blocks = useVisualPolicyStore((s) => s.blocks);
  const connections = useVisualPolicyStore((s) => s.connections);
  const addBlock = useVisualPolicyStore((s) => s.addBlock);
  const addConnection = useVisualPolicyStore((s) => s.addConnection);
  const updateBlock = useVisualPolicyStore((s) => s.updateBlock);
  const selectBlock = useVisualPolicyStore((s) => s.selectBlock);
  const removeConnection = useVisualPolicyStore((s) => s.removeConnection);

  // Convert store blocks to React Flow nodes
  const nodes: Node[] = blocks.map((block: PolicyBlock) => {
    const def = getBlockById(block.definitionId);
    const borderColor = def ? (CATEGORY_COLORS[def.category] || '#6b7280') : '#ef4444';
    return {
      id: block.id,
      position: block.position,
      data: { label: `${def?.icon || '?'} ${def?.name || block.definitionId}` },
      style: {
        background: '#1e293b',
        color: '#e2e8f0',
        border: `2px solid ${borderColor}`,
        borderRadius: 8,
        padding: 12,
        fontSize: 13,
        minWidth: 160,
      },
    };
  });

  // Convert store connections to React Flow edges
  const edges: Edge[] = connections.map((conn) => ({
    id: conn.id,
    source: conn.sourceBlockId,
    target: conn.targetBlockId,
    animated: !conn.isValid,
    style: { stroke: conn.isValid ? '#0ea5e9' : '#ef4444', strokeWidth: 2 },
    label: conn.condition || undefined,
    labelStyle: { fill: '#94a3b8', fontSize: 11 },
    labelBgStyle: { fill: '#1e293b', fillOpacity: 0.9 },
  }));

  const [rfNodes, setNodes, onNodesChange] = useNodesState(nodes);
  const [rfEdges, setEdges, onEdgesChange] = useEdgesState(edges);

  // Sync React Flow node changes back to store
  const handleNodesChange = useCallback((changes: any) => {
    onNodesChange(changes);
    changes.forEach((change: any) => {
      if (change.type === 'position' && change.position) {
        updateBlock(change.id, { position: change.position });
      }
      if (change.type === 'select' && change.selected) {
        selectBlock(change.id);
      }
    });
  }, [onNodesChange, updateBlock, selectBlock]);

  const handleEdgesChange = useCallback((changes: any) => {
    onEdgesChange(changes);
    changes.forEach((change: any) => {
      if (change.type === 'remove') {
        removeConnection(change.id);
      }
    });
  }, [onEdgesChange, removeConnection]);

  const onConnect = useCallback((params: Connection) => {
    if (!params.source || !params.target) return;
    const newConn = {
      id: `conn-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      sourceBlockId: params.source,
      sourceOutputId: params.sourceHandle || 'out',
      targetBlockId: params.target,
      targetInputId: params.targetHandle || 'in',
      isValid: true,
    };
    addConnection(newConn);
    setEdges((eds) => addEdge({ ...params, style: { stroke: '#0ea5e9' } }, eds));
  }, [addConnection, setEdges]);

  // Handle drop from block library
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const blockDefId = e.dataTransfer.getData('application/reactflow');
    if (!blockDefId) return;
    const def = getBlockById(blockDefId);
    if (!def) return;

    const bounds = e.currentTarget.getBoundingClientRect();
    const position = {
      x: e.clientX - bounds.left - 80,
      y: e.clientY - bounds.top - 20,
    };

    const defaultParams: Record<string, any> = {};
    def.parameters.forEach((p) => {
      if (p.defaultValue !== undefined) defaultParams[p.name] = p.defaultValue;
    });

    const newBlock: PolicyBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      definitionId: def.id,
      position,
      parameters: defaultParams,
      selected: false,
      collapsed: false,
      errors: [],
      warnings: [],
    };
    addBlock(newBlock);

    // Also add to local React Flow state
    const borderColor = CATEGORY_COLORS[def.category] || '#6b7280';
    setNodes((nds) => [
      ...nds,
      {
        id: newBlock.id,
        position,
        data: { label: `${def.icon} ${def.name}` },
        style: {
          background: '#1e293b',
          color: '#e2e8f0',
          border: `2px solid ${borderColor}`,
          borderRadius: 8,
          padding: 12,
          fontSize: 13,
          minWidth: 160,
        },
      },
    ]);
  }, [addBlock, setNodes]);

  const onPaneClick = useCallback(() => selectBlock(null), [selectBlock]);

  return (
    <ReactFlow
      nodes={rfNodes}
      edges={rfEdges}
      onNodesChange={handleNodesChange}
      onEdgesChange={handleEdgesChange}
      onConnect={onConnect}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onPaneClick={onPaneClick}
      fitView
      snapToGrid
      snapGrid={[16, 16]}
      style={{ background: '#0f172a' }}
    >
      <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#334155" />
      <Controls style={{ background: '#1e293b', borderColor: '#475569' }} />
      <MiniMap
        style={{ background: '#1e293b', borderColor: '#475569' }}
        nodeColor="#0ea5e9"
        maskColor="rgba(0,0,0,0.6)"
      />
    </ReactFlow>
  );
};

const VisualPolicyBuilder: React.FC = () => {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', background: '#0f172a' }}>
      <div style={{
        width: 300,
        flexShrink: 0,
        borderRight: '1px solid #334155',
        overflowY: 'auto',
      }}>
        <BlockLibrary />
      </div>
      <div style={{ flex: 1, height: '100%' }}>
        <ReactFlowProvider>
          <FlowCanvas />
        </ReactFlowProvider>
      </div>
    </div>
  );
};

export default VisualPolicyBuilder;
