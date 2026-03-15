// MetadataChangeDisplay - Display metadata changes between versions
// Requirements: 4.8

import React from 'react';
import type { MetadataChange } from '../../types/policy';

interface MetadataChangeDisplayProps {
  changes: MetadataChange[];
}

export const MetadataChangeDisplay: React.FC<MetadataChangeDisplayProps> = ({ changes }) => {
  if (changes.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-sm text-gray-500 text-center">No metadata changes</p>
      </div>
    );
  }

  const formatValue = (value: any): string => {
    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(', ') : '(empty)';
    }
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2);
    }
    if (value === null || value === undefined || value === '') {
      return '(empty)';
    }
    return String(value);
  };

  const formatFieldName = (field: string): string => {
    // Convert camelCase to Title Case
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-700">
          Metadata Changes
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          {changes.length} field{changes.length !== 1 ? 's' : ''} modified
        </p>
      </div>

      {/* Changes List */}
      <div className="divide-y divide-gray-200">
        {changes.map((change, idx) => (
          <div key={idx} className="p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">
              {formatFieldName(change.field)}
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Old Value */}
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">
                  Old Value
                </div>
                <div className="bg-red-50 border border-red-200 rounded p-2">
                  <pre className="text-xs text-red-900 whitespace-pre-wrap break-all font-mono">
                    {formatValue(change.oldValue)}
                  </pre>
                </div>
              </div>

              {/* New Value */}
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">
                  New Value
                </div>
                <div className="bg-green-50 border border-green-200 rounded p-2">
                  <pre className="text-xs text-green-900 whitespace-pre-wrap break-all font-mono">
                    {formatValue(change.newValue)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
