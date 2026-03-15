import React, { useCallback, useState } from 'react';
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
import 'reactflow/dist/style.css';

const initialNodes = [
  {
    id: '1',
    type: 'default',
    position: { x: 100, y: 100 },
    data: { label: '🛡️ PII Detection Guard' },
    style: { background: '#1e293b', color: '#e2e8f0', border: '2px solid #0ea5e9', borderRadius: 8, padding: 12 },
  },
  {
    id: '2',
    type: 'default',
    position: { x: 400, y: 100 },
    data: { label: '⚡ Allow / Deny Action' },
    style: { background: '#1e293b', color: '#e2e8f0', border: '2px solid #10b981', borderRadius: 8, padding: 12 },
  },
  {
    id: '3',
    type: 'default',
    position: { x: 250, y: 250 },
    data: { label: '💰 Cost Budget Check' },
    style: { background: '#1e293b', color: '#e2e8f0', border: '2px solid #f59e0b', borderRadius: 8, padding: 12 },
  },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#0ea5e9' } },
  { id: 'e1-3', source: '1', target: '3', style: { stroke: '#0ea5e9' } },
];

const FlowCanvas: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: any) => setEdges((eds) => addEdge({ ...params, style: { stroke: '#0ea5e9' } }, eds)),
    [setEdges]
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      fitView
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
      {/* Sidebar placeholder */}
      <div style={{
        width: 280,
        flexShrink: 0,
        background: '#1e293b',
        borderRight: '1px solid #334155',
        padding: 16,
        overflowY: 'auto',
        color: '#e2e8f0',
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#f1f5f9' }}>
          Block Library
        </h2>
        <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>
          Drag blocks to the canvas to build your policy. Full block library coming soon.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {['🛡️ PII Detection', '🔒 Prompt Injection', '⚡ Allow/Deny', '💰 Budget Check', '🔀 Router', '📋 Compliance'].map((name) => (
            <div
              key={name}
              style={{
                padding: '10px 12px',
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: 8,
                fontSize: 13,
                cursor: 'grab',
              }}
            >
              {name}
            </div>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, height: '100%' }}>
        <ReactFlowProvider>
          <FlowCanvas />
        </ReactFlowProvider>
      </div>
    </div>
  );
};

export default VisualPolicyBuilder;
