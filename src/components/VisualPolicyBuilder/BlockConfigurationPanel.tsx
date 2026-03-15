/**
 * Block Configuration Panel
 * 
 * Sidebar panel that displays when a block is selected, allowing users to configure
 * block parameters without writing code. Includes parameter forms, validation,
 * and block actions (delete, duplicate, reset).
 * 
 * @module components/VisualPolicyBuilder/BlockConfigurationPanel
 */

import React from 'react';
import { X, Trash2, Copy, RotateCcw } from 'lucide-react';
import { useVisualPolicyStore } from '../../stores/visualPolicyStore';
import { getBlockById } from '../../data/blockLibrary';
import type { PolicyBlock, BlockDefinition } from '../../types/visual-policy';
import { ParameterForm } from './ParameterForm';

/**
 * BlockConfigurationPanel Component
 * 
 * Displays configuration UI for the currently selected block.
 * Shows block info, parameter form, and action buttons.
 */
export const BlockConfigurationPanel: React.FC = () => {
  const { selectedBlockId, blocks, closeConfigPanel, removeBlock, updateBlock, addBlock } = useVisualPolicyStore();
  
  // Find the selected block
  const selectedBlock = blocks.find(b => b.id === selectedBlockId);
  
  // If no block selected, don't render
  if (!selectedBlock || !selectedBlockId) {
    return null;
  }
  
  // Get block definition from library
  const blockDefinition = getBlockById(selectedBlock.definitionId);
  
  if (!blockDefinition) {
    return null;
  }
  
  /**
   * Handle closing the configuration panel
   */
  const handleClose = () => {
    closeConfigPanel();
  };
  
  /**
   * Handle deleting the block
   */
  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${blockDefinition.name}"?`)) {
      removeBlock(selectedBlockId);
    }
  };
  
  /**
   * Handle duplicating the block
   */
  const handleDuplicate = () => {
    const newBlock: PolicyBlock = {
      ...selectedBlock,
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      position: {
        x: selectedBlock.position.x + 50,
        y: selectedBlock.position.y + 50
      },
      selected: false
    };
    
    addBlock(newBlock);
  };
  
  /**
   * Handle resetting parameters to defaults
   */
  const handleReset = () => {
    if (confirm('Reset all parameters to default values?')) {
      const defaultParameters: Record<string, any> = {};
      
      blockDefinition.parameters.forEach(param => {
        if (param.defaultValue !== undefined) {
          defaultParameters[param.name] = param.defaultValue;
        }
      });
      
      updateBlock(selectedBlockId, { parameters: defaultParameters });
    }
  };
  
  /**
   * Handle parameter value changes
   */
  const handleParameterChange = (paramName: string, value: any) => {
    updateBlock(selectedBlockId, {
      parameters: {
        ...selectedBlock.parameters,
        [paramName]: value
      }
    });
  };
  
  return (
    <div className="w-96 bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{blockDefinition.icon}</span>
          <div>
            <h3 className="font-semibold text-gray-900">{blockDefinition.name}</h3>
            <p className="text-xs text-gray-500">{blockDefinition.category}</p>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          aria-label="Close configuration panel"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>
      
      {/* Description */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <p className="text-sm text-gray-700">{blockDefinition.description}</p>
      </div>
      
      {/* Parameter Form */}
      <div className="flex-1 overflow-y-auto p-4">
        <ParameterForm
          blockDefinition={blockDefinition}
          parameters={selectedBlock.parameters}
          onChange={handleParameterChange}
          errors={selectedBlock.errors}
          warnings={selectedBlock.warnings}
        />
      </div>
      
      {/* Actions */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex flex-col gap-2">
          <button
            onClick={handleReset}
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </button>
          
          <button
            onClick={handleDuplicate}
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <Copy className="w-4 h-4" />
            Duplicate Block
          </button>
          
          <button
            onClick={handleDelete}
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete Block
          </button>
        </div>
      </div>
    </div>
  );
};
