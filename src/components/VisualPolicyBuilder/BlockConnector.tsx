/**
 * BlockConnector - Custom React Flow edge for block connections
 * 
 * Displays connections between policy blocks with conditional branch labels
 * and validation states (valid/invalid).
 */

import { memo } from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer } from 'reactflow';
import { BlockConnection } from '../../types/visual-policy';

interface BlockConnectorData {
  connection: BlockConnection;
}

/**
 * BlockConnector component
 * 
 * Custom edge component for displaying connections between policy blocks.
 * Shows conditional branch labels (True/False) and validation states.
 */
const BlockConnector: React.FC<EdgeProps<BlockConnectorData>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}) => {
  const connection = data?.connection;

  // Calculate bezier path
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Determine edge color based on validation state
  const strokeColor = connection?.isValid ? '#0EA5E9' : '#EF4444';
  const labelBgColor = connection?.isValid ? 'bg-sky-900' : 'bg-red-900';
  const labelTextColor = connection?.isValid ? 'text-sky-200' : 'text-red-200';
  const labelBorderColor = connection?.isValid ? 'border-sky-700' : 'border-red-700';

  // Get label text (for conditional branches)
  const labelText = connection?.condition || null;

  return (
    <>
      {/* Edge path */}
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        strokeWidth={2}
        stroke={strokeColor}
        fill="none"
        markerEnd={markerEnd}
      />

      {/* Conditional branch label */}
      {labelText && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <div
              className={`px-2 py-1 ${labelBgColor} ${labelTextColor} border ${labelBorderColor} rounded text-xs font-medium shadow-lg`}
            >
              {labelText}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}

      {/* Error indicator for invalid connections */}
      {connection && !connection.isValid && connection.error && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY + 20}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <div className="px-2 py-1 bg-red-900 text-red-200 border border-red-700 rounded text-xs shadow-lg max-w-[200px]">
              <div className="flex items-start gap-1">
                <svg
                  className="w-3 h-3 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-xs">{connection.error}</span>
              </div>
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default memo(BlockConnector);
