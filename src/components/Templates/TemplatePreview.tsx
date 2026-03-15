// Template Preview Component
// Displays template details with syntax-highlighted code

import React from 'react';
import type { PolicyTemplate } from '../../types/policy-template';

interface TemplatePreviewProps {
  template: PolicyTemplate;
  customizedCode?: string;
  onCustomize: () => void;
  onClose: () => void;
}

export const TemplatePreview: React.FC<TemplatePreviewProps> = ({
  template,
  customizedCode,
  onCustomize,
  onClose,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {template.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {template.longDescription}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap gap-2 mt-4">
          <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
            {template.category}
          </span>
          <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
            {template.difficulty}
          </span>
          {template.complianceFrameworks?.map((framework) => (
            <span
              key={framework}
              className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded"
            >
              {framework}
            </span>
          ))}
        </div>
      </div>

      {/* Code Preview */}
      <div className="p-6">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Policy Code
        </h4>
        <pre className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 overflow-x-auto text-sm">
          <code className="text-gray-800 dark:text-gray-200">
            {customizedCode || template.code}
          </code>
        </pre>
      </div>

      {/* Documentation */}
      <div className="p-6 border-t border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Documentation
        </h4>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <pre className="whitespace-pre-wrap text-gray-600 dark:text-gray-400">
            {template.documentation}
          </pre>
        </div>
      </div>

      {/* Examples */}
      {template.examples.length > 0 && (
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Examples
          </h4>
          <div className="space-y-4">
            {template.examples.map((example, index) => (
              <div
                key={index}
                className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4"
              >
                <h5 className="font-medium text-gray-900 dark:text-white mb-1">
                  {example.title}
                </h5>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {example.description}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Expected: {example.expectedBehavior}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <button
          onClick={onCustomize}
          className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg 
                   hover:bg-blue-700 transition-colors"
        >
          Customize Template
        </button>
      </div>
    </div>
  );
};
