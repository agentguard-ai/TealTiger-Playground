// ScenarioChangeDetail - Before/after comparison for each scenario
// Requirements: 17.7

import React from 'react';
import type { AffectedScenario } from '../../types/impact';

interface ScenarioChangeDetailProps {
  scenario: AffectedScenario;
  onClose?: () => void;
}

export const ScenarioChangeDetail: React.FC<ScenarioChangeDetailProps> = ({
  scenario,
  onClose
}) => {
  const getFieldIcon = (field: string) => {
    switch (field) {
      case 'decision':
        return '⚖️';
      case 'cost':
        return '💰';
      case 'latency':
        return '⏱️';
      case 'metadata':
        return '📋';
      default:
        return '📝';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatValue = (value: any, field: string) => {
    if (field === 'cost') {
      return typeof value === 'number' ? `$${value.toFixed(4)}` : value;
    }
    if (field === 'latency') {
      return typeof value === 'number' ? `${value.toFixed(2)}ms` : value;
    }
    return String(value);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900">
            {scenario.scenarioName}
          </h3>
          <div className="mt-1">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              scenario.impactType === 'breaking' ? 'bg-red-100 text-red-800' :
              scenario.impactType === 'warning' ? 'bg-yellow-100 text-yellow-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {scenario.impactType.toUpperCase()}
            </span>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Changes List */}
      <div className="space-y-4">
        {scenario.changes.map((change, idx) => (
          <div
            key={idx}
            className={`border-2 rounded-lg p-4 ${getSeverityColor(change.severity)}`}
          >
            {/* Change Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getFieldIcon(change.field)}</span>
                <span className="font-semibold text-lg capitalize">
                  {change.field}
                </span>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                change.severity === 'high' ? 'bg-red-200 text-red-900' :
                change.severity === 'medium' ? 'bg-yellow-200 text-yellow-900' :
                'bg-green-200 text-green-900'
              }`}>
                {change.severity}
              </span>
            </div>

            {/* Description */}
            <p className="text-sm mb-4 font-medium">
              {change.description}
            </p>

            {/* Before/After Comparison */}
            <div className="grid grid-cols-2 gap-4">
              {/* Before */}
              <div className="bg-white rounded-lg p-3 border border-gray-300">
                <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                  Before
                </div>
                <div className="text-lg font-mono font-bold text-gray-900">
                  {formatValue(change.oldValue, change.field)}
                </div>
              </div>

              {/* After */}
              <div className="bg-white rounded-lg p-3 border border-gray-300">
                <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                  After
                </div>
                <div className="text-lg font-mono font-bold text-gray-900">
                  {formatValue(change.newValue, change.field)}
                </div>
              </div>
            </div>

            {/* Percentage Change */}
            {change.percentageChange !== undefined && (
              <div className="mt-3 text-center">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                  change.percentageChange > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                }`}>
                  {change.percentageChange > 0 ? '↑' : '↓'} {Math.abs(change.percentageChange).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
