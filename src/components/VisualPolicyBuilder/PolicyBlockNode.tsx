/**
 * PolicyBlockNode - Custom React Flow node for policy blocks
 * 
 * Displays a policy block with icon, name, parameter summary, and connection handles.
 * Supports visual states (selected, error, warning) and block actions menu.
 */

import { memo, useMemo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { PolicyBlock, BlockDefinition } from '../../types/visual-policy';
import { getBlockById } from '../../data/blockLibrary';
import { useVisualPolicyStore } from '../../stores/visualPolicyStore';

interface PolicyBlockNodeData {
  block: PolicyBlock;
}

/**
 * PolicyBlockNode component
 * 
 * Custom node component for displaying policy blocks on the canvas.
 * Shows block icon, name, configured parameters, and connection handles.
 */
const PolicyBlockNode: React.FC<NodeProps<PolicyBlockNodeData>> = ({ data, selected }) => {
  const { block } = data;
  const removeBlock = useVisualPolicyStore((state) => state.removeBlock);
  const selectBlock = useVisualPolicyStore((state) => state.selectBlock);
  const updateBlock = useVisualPolicyStore((state) => state.updateBlock);

  // Get block definition from library
  const definition: BlockDefinition | undefined = useMemo(
    () => getBlockById(block.definitionId),
    [block.definitionId]
  );

  if (!definition) {
    return (
      <div className="px-4 py-2 bg-red-900 border-2 border-red-500 rounded-lg">
        <div className="text-red-200 text-sm">Unknown block: {block.definitionId}</div>
      </div>
    );
  }

  // Determine border color based on state
  const borderColor = useMemo(() => {
    if (block.errors.length > 0) return 'border-red-500';
    if (block.warnings.length > 0) return 'border-yellow-500';
    if (selected) return 'border-sky-500';
    return 'border-gray-600';
  }, [block.errors.length, block.warnings.length, selected]);

  // Determine background color based on category
  const bgColor = useMemo(() => {
    const categoryColors: Record<string, string> = {
      guards: 'bg-purple-900/50',
      actions: 'bg-green-900/50',
      routing: 'bg-blue-900/50',
      'cost-control': 'bg-yellow-900/50',
      compliance: 'bg-indigo-900/50',
      conditional: 'bg-orange-900/50',
      utility: 'bg-gray-800/50',
    };
    return categoryColors[definition.category] || 'bg-gray-800/50';
  }, [definition.category]);

  // Get parameter summary (show configured non-default values)
  const parameterSummary = useMemo(() => {
    const configured = definition.parameters
      .filter((param) => {
        const value = block.parameters[param.name];
        return value !== undefined && value !== param.defaultValue;
      })
      .slice(0, 2); // Show max 2 parameters

    if (configured.length === 0) return null;

    return configured.map((param) => {
      const value = block.parameters[param.name];
      let displayValue = value;

      // Format value for display
      if (Array.isArray(value)) {
        displayValue = value.length > 0 ? `[${value.length}]` : '[]';
      } else if (typeof value === 'string' && value.length > 20) {
        displayValue = value.substring(0, 20) + '...';
      } else if (typeof value === 'boolean') {
        displayValue = value ? '✓' : '✗';
      }

      return (
        <div key={param.name} className="text-xs text-gray-400 truncate">
          {param.label}: <span className="text-gray-300">{String(displayValue)}</span>
        </div>
      );
    });
  }, [definition.parameters, block.parameters]);

  // Handle block click
  const handleClick = () => {
    selectBlock(block.id);
  };

  // Handle delete
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeBlock(block.id);
  };

  // Handle duplicate
  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
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
  };

  // Handle collapse toggle
  const handleToggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateBlock(block.id, { collapsed: !block.collapsed });
  };

  return (
    <div
      onClick={handleClick}
      className={`relative min-w-[200px] max-w-[280px] ${bgColor} border-2 ${borderColor} rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl cursor-pointer`}
    >
      {/* Input Handles */}
      {definition.inputs.map((input) => (
        <Handle
          key={input.id}
          type="target"
          position={Position.Left}
          id={input.id}
          className="w-3 h-3 bg-sky-500 border-2 border-gray-900"
          style={{ top: '50%' }}
        />
      ))}

      {/* Output Handles */}
      {definition.outputs.map((output, index) => {
        const totalOutputs = definition.outputs.length;
        const topPercent = totalOutputs === 1 ? 50 : (100 / (totalOutputs + 1)) * (index + 1);
        
        return (
          <Handle
            key={output.id}
            type="source"
            position={Position.Right}
            id={output.id}
            className="w-3 h-3 bg-sky-500 border-2 border-gray-900"
            style={{ top: `${topPercent}%` }}
          />
        );
      })}

      {/* Block Header */}
      <div className="px-3 py-2 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-2xl flex-shrink-0">{definition.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-100 truncate">
                {definition.name}
              </div>
              <div className="text-xs text-gray-400 truncate">
                {definition.category}
              </div>
            </div>
          </div>

          {/* Actions Menu */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={handleToggleCollapse}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
              title={block.collapsed ? 'Expand' : 'Collapse'}
            >
              <svg
                className="w-3 h-3 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {block.collapsed ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                )}
              </svg>
            </button>
            <button
              onClick={handleDuplicate}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
              title="Duplicate"
            >
              <svg
                className="w-3 h-3 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </button>
            <button
              onClick={handleDelete}
              className="p-1 hover:bg-red-700 rounded transition-colors"
              title="Delete"
            >
              <svg
                className="w-3 h-3 text-gray-400 hover:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Block Body (collapsible) */}
      {!block.collapsed && (
        <div className="px-3 py-2">
          {/* Parameter Summary */}
          {parameterSummary && parameterSummary.length > 0 && (
            <div className="space-y-1 mb-2">{parameterSummary}</div>
          )}

          {/* Description */}
          <div className="text-xs text-gray-500 line-clamp-2">
            {definition.description}
          </div>

          {/* Validation Errors */}
          {block.errors.length > 0 && (
            <div className="mt-2 p-2 bg-red-900/30 border border-red-700 rounded">
              <div className="flex items-start gap-1">
                <svg
                  className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="text-xs text-red-300">
                  {block.errors[0].message}
                </div>
              </div>
            </div>
          )}

          {/* Validation Warnings */}
          {block.warnings.length > 0 && block.errors.length === 0 && (
            <div className="mt-2 p-2 bg-yellow-900/30 border border-yellow-700 rounded">
              <div className="flex items-start gap-1">
                <svg
                  className="w-3 h-3 text-yellow-400 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="text-xs text-yellow-300">
                  {block.warnings[0].message}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Collapsed indicator */}
      {block.collapsed && (
        <div className="px-3 py-1 text-xs text-gray-500 text-center">
          •••
        </div>
      )}
    </div>
  );
};

export default memo(PolicyBlockNode);
