/**
 * BlockLibrary Component
 * 
 * Displays the library of pre-built policy blocks organized by category.
 * Supports search, filtering, and drag-and-drop to canvas.
 */

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Search, X } from 'lucide-react';
import type { BlockDefinition, BlockCategory } from '../../types/visual-policy';
import { 
  BLOCK_LIBRARY, 
  getBlocksByCategory, 
  searchBlocks,
  filterBlocksByProvider,
  filterBlocksByCompliance 
} from '../../data/blockLibrary';
import { BlockCard } from './BlockCard';

interface BlockLibraryProps {
  onBlockDragStart?: (block: BlockDefinition) => void;
  onBlockDragEnd?: () => void;
}

const CATEGORY_LABELS: Record<BlockCategory, string> = {
  'guards': 'Guards',
  'actions': 'Actions',
  'routing': 'Routing',
  'cost-control': 'Cost Control',
  'compliance': 'Compliance',
  'conditional': 'Conditional',
  'utility': 'Utility'
};

const CATEGORY_DESCRIPTIONS: Record<BlockCategory, string> = {
  'guards': 'Security and content detection blocks',
  'actions': 'Policy decisions and modifications',
  'routing': 'Provider and model selection',
  'cost-control': 'Budget and rate limiting',
  'compliance': 'Regulatory requirements',
  'conditional': 'Logic and branching',
  'utility': 'Helper functions'
};

export const BlockLibrary: React.FC<BlockLibraryProps> = ({
  onBlockDragStart,
  onBlockDragEnd
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<BlockCategory>>(
    new Set(['guards', 'actions'])
  );
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [selectedCompliance, setSelectedCompliance] = useState<string>('');

  // Get unique providers and compliance frameworks
  const providers = useMemo(() => {
    const providerSet = new Set<string>();
    BLOCK_LIBRARY.forEach(block => {
      block.providers.forEach(p => providerSet.add(p));
    });
    return Array.from(providerSet).sort();
  }, []);

  const complianceFrameworks = useMemo(() => {
    const frameworkSet = new Set<string>();
    BLOCK_LIBRARY.forEach(block => {
      block.complianceFrameworks.forEach(f => frameworkSet.add(f));
    });
    return Array.from(frameworkSet).sort();
  }, []);

  // Filter blocks based on search and filters
  const filteredBlocks = useMemo(() => {
    let blocks = BLOCK_LIBRARY;

    // Apply search
    if (searchQuery.trim()) {
      blocks = searchBlocks(searchQuery);
    }

    // Apply provider filter
    if (selectedProvider) {
      blocks = blocks.filter(block => block.providers.includes(selectedProvider));
    }

    // Apply compliance filter
    if (selectedCompliance) {
      blocks = blocks.filter(block => 
        block.complianceFrameworks.includes(selectedCompliance)
      );
    }

    return blocks;
  }, [searchQuery, selectedProvider, selectedCompliance]);

  // Group filtered blocks by category
  const blocksByCategory = useMemo(() => {
    const categories: BlockCategory[] = [
      'guards', 'actions', 'routing', 'cost-control', 
      'compliance', 'conditional', 'utility'
    ];
    
    return categories.map(category => ({
      category,
      blocks: filteredBlocks.filter(block => block.category === category)
    })).filter(group => group.blocks.length > 0);
  }, [filteredBlocks]);

  const toggleCategory = (category: BlockCategory) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedProvider('');
    setSelectedCompliance('');
  };

  const hasActiveFilters = searchQuery || selectedProvider || selectedCompliance;

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Block Library</h2>
        
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search blocks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="space-y-2">
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Providers</option>
            {providers.map(provider => (
              <option key={provider} value={provider}>
                {provider.charAt(0).toUpperCase() + provider.slice(1)}
              </option>
            ))}
          </select>

          <select
            value={selectedCompliance}
            onChange={(e) => setSelectedCompliance(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Frameworks</option>
            {complianceFrameworks.map(framework => (
              <option key={framework} value={framework}>
                {framework}
              </option>
            ))}
          </select>
        </div>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="mt-2 text-sm text-blue-600 hover:text-blue-700"
          >
            Clear filters
          </button>
        )}

        {/* Results count */}
        <div className="mt-2 text-xs text-gray-500">
          {filteredBlocks.length} block{filteredBlocks.length !== 1 ? 's' : ''} available
        </div>
      </div>

      {/* Block Categories */}
      <div className="flex-1 overflow-y-auto">
        {blocksByCategory.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No blocks found matching your criteria
          </div>
        ) : (
          blocksByCategory.map(({ category, blocks }) => (
            <div key={category} className="border-b border-gray-200">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  {expandedCategories.has(category) ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                  <span className="font-medium text-gray-900">
                    {CATEGORY_LABELS[category]}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({blocks.length})
                  </span>
                </div>
              </button>

              {/* Category Description */}
              {expandedCategories.has(category) && (
                <div className="px-4 pb-2">
                  <p className="text-xs text-gray-600">
                    {CATEGORY_DESCRIPTIONS[category]}
                  </p>
                </div>
              )}

              {/* Blocks */}
              {expandedCategories.has(category) && (
                <div className="px-2 pb-2 space-y-2">
                  {blocks.map(block => (
                    <BlockCard
                      key={block.id}
                      block={block}
                      onDragStart={onBlockDragStart}
                      onDragEnd={onBlockDragEnd}
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-600 text-center">
          Drag blocks to the canvas to build your policy
        </p>
      </div>
    </div>
  );
};
