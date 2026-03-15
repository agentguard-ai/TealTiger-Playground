// Template Card Component
// Displays individual policy template with metadata

import React from 'react';
import type { PolicyTemplate } from '../../types/policy-template';

interface TemplateCardProps {
  template: PolicyTemplate;
  onSelect: () => void;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({ template, onSelect }) => {
  const difficultyColors = {
    beginner: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    intermediate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    advanced: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  const categoryColors = {
    security: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    cost: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    compliance: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    performance: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    routing: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    reliability: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  };

  return (
    <div
      onClick={onSelect}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 
                 p-6 hover:shadow-lg transition-shadow cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {template.name}
        </h3>
        <span
          className={`px-2 py-1 text-xs font-medium rounded ${
            difficultyColors[template.difficulty]
          }`}
        >
          {template.difficulty}
        </span>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
        {template.description}
      </p>

      {/* Category Badge */}
      <div className="mb-4">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${
            categoryColors[template.category]
          }`}
        >
          {template.category}
        </span>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mb-4">
        {template.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
          >
            {tag}
          </span>
        ))}
        {template.tags.length > 3 && (
          <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
            +{template.tags.length - 3} more
          </span>
        )}
      </div>

      {/* Compliance Frameworks */}
      {template.complianceFrameworks && template.complianceFrameworks.length > 0 && (
        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-4">
          <svg
            className="h-4 w-4 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          <span>{template.complianceFrameworks.slice(0, 2).join(', ')}</span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {template.parameters.length} parameters
        </span>
        <button
          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          Use Template →
        </button>
      </div>
    </div>
  );
};
