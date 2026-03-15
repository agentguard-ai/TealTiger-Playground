/**
 * BlockCard Component
 * 
 * Displays an individual block card in the library.
 * Supports drag-and-drop and shows block metadata.
 */

import React, { useState } from 'react';
import { Info, DollarSign, Shield } from 'lucide-react';
import type { BlockDefinition } from '../../types/visual-policy';

interface BlockCardProps {
  block: BlockDefinition;
  onDragStart?: (block: BlockDefinition) => void;
  onDragEnd?: () => void;
}

export const BlockCard: React.FC<BlockCardProps> = ({
  block,
  onDragStart,
  onDragEnd
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    // Set drag data for React Flow (use block definition ID)
    e.dataTransfer.setData('application/reactflow', block.id);
    e.dataTransfer.effectAllowed = 'move';
    
    // Call callback
    onDragStart?.(block);
  };

  const handleDragEnd = () => {
    onDragEnd?.();
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className="group relative bg-white border border-gray-200 rounded-lg p-3 cursor-move hover:border-blue-400 hover:shadow-md transition-all"
    >
      {/* Main Content */}
      <div className="flex items-start space-x-3">
        {/* Icon */}
        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gray-100 rounded text-lg group-hover:bg-blue-50 transition-colors">
          {block.icon}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <h3 className="text-sm font-medium text-gray-900 truncate">
              {block.name}
            </h3>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDetails(!showDetails);
              }}
              className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600"
              title="Show details"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
          
          <p className="mt-1 text-xs text-gray-600 line-clamp-2">
            {block.description}
          </p>

          {/* Metadata */}
          <div className="mt-2 flex items-center space-x-3 text-xs text-gray-500">
            {/* Cost indicator */}
            {block.estimatedCost > 0 && (
              <div className="flex items-center space-x-1" title="Estimated cost">
                <DollarSign className="w-3 h-3" />
                <span>${block.estimatedCost.toFixed(3)}</span>
              </div>
            )}

            {/* Compliance indicator */}
            {block.complianceFrameworks.length > 0 && (
              <div className="flex items-center space-x-1" title={`Compliance: ${block.complianceFrameworks.join(', ')}`}>
                <Shield className="w-3 h-3" />
                <span>{block.complianceFrameworks.length}</span>
              </div>
            )}

            {/* Parameter count */}
            <span className="text-gray-400">
              {block.parameters.length} param{block.parameters.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {showDetails && (
        <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
          {/* Parameters */}
          {block.parameters.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-700 mb-1">Parameters:</h4>
              <ul className="space-y-1">
                {block.parameters.map(param => (
                  <li key={param.name} className="text-xs text-gray-600 flex items-start">
                    <span className="font-mono text-blue-600 mr-2">{param.name}</span>
                    <span className="text-gray-500">({param.type})</span>
                    {param.required && (
                      <span className="ml-1 text-red-500">*</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Providers */}
          {block.providers.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-700 mb-1">Providers:</h4>
              <div className="flex flex-wrap gap-1">
                {block.providers.slice(0, 5).map(provider => (
                  <span
                    key={provider}
                    className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs"
                  >
                    {provider}
                  </span>
                ))}
                {block.providers.length > 5 && (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                    +{block.providers.length - 5} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Compliance Frameworks */}
          {block.complianceFrameworks.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-700 mb-1">Compliance:</h4>
              <div className="flex flex-wrap gap-1">
                {block.complianceFrameworks.map(framework => (
                  <span
                    key={framework}
                    className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs"
                  >
                    {framework}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {block.tags.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-700 mb-1">Tags:</h4>
              <div className="flex flex-wrap gap-1">
                {block.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-gray-50 text-gray-600 rounded text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Connections */}
          <div className="grid grid-cols-2 gap-2">
            {block.inputs.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-700 mb-1">Inputs:</h4>
                <ul className="space-y-0.5">
                  {block.inputs.map(input => (
                    <li key={input.id} className="text-xs text-gray-600">
                      • {input.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {block.outputs.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-700 mb-1">Outputs:</h4>
                <ul className="space-y-0.5">
                  {block.outputs.map(output => (
                    <li key={output.id} className="text-xs text-gray-600">
                      • {output.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Drag indicator */}
      <div className="absolute inset-0 border-2 border-blue-400 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity" />
    </div>
  );
};
