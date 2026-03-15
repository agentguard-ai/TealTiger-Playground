import React, { useState } from 'react';
import type { EvaluationResult } from '../../types';

interface ResultCardProps {
  result: EvaluationResult;
  scenarioName: string;
  index: number;
}

export const ResultCard: React.FC<ResultCardProps> = ({ result, scenarioName, index }) => {
  const [isErrorExpanded, setIsErrorExpanded] = useState(false);

  const { decision, executionTime, error, metadata } = result;

  // Color coding based on decision action
  const actionColors = {
    ALLOW: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: 'text-green-600',
    },
    DENY: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: 'text-red-600',
    },
    MONITOR: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: 'text-yellow-600',
    },
  };

  const colors = actionColors[decision.action];

  // Icons for each action
  const ActionIcon = () => {
    switch (decision.action) {
      case 'ALLOW':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case 'DENY':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case 'MONITOR':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
        );
    }
  };

  const formatCost = (cost: number) => {
    if (cost < 0.01) {
      return `$${(cost * 1000).toFixed(4)}k`;
    }
    return `$${cost.toFixed(4)}`;
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) {
      return `${ms.toFixed(0)}ms`;
    }
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className={`border rounded-lg p-4 ${colors.bg} ${colors.border}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={colors.icon}>
            <ActionIcon />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">
              Scenario {index + 1}: {scenarioName}
            </h3>
            <p className={`text-sm font-semibold ${colors.text}`}>{decision.action}</p>
          </div>
        </div>
      </div>

      {/* Decision Reason */}
      <div className="mb-3">
        <p className="text-sm text-gray-700">{decision.reason}</p>
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div>
          <span className="text-gray-500">Execution Time</span>
          <p className="font-medium text-gray-900">{formatTime(executionTime)}</p>
        </div>
        <div>
          <span className="text-gray-500">Cost</span>
          <p className="font-medium text-gray-900">{formatCost(metadata.estimatedCost)}</p>
        </div>
        <div>
          <span className="text-gray-500">Tokens</span>
          <p className="font-medium text-gray-900">{metadata.tokensUsed.toLocaleString()}</p>
        </div>
        <div>
          <span className="text-gray-500">Provider</span>
          <p className="font-medium text-gray-900">
            {metadata.provider} / {metadata.model}
          </p>
        </div>
      </div>

      {/* Additional Metadata */}
      {Object.keys(decision.metadata).length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <details className="text-sm">
            <summary className="cursor-pointer text-gray-600 hover:text-gray-900 font-medium">
              Additional Details
            </summary>
            <div className="mt-2 space-y-1">
              {Object.entries(decision.metadata).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-gray-500">{key}:</span>
                  <span className="text-gray-900 font-mono text-xs">
                    {JSON.stringify(value)}
                  </span>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      {/* Error Details */}
      {error && (
        <div className="mt-3 pt-3 border-t border-red-200">
          <div className="flex items-start gap-2">
            <svg
              className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-red-800">{error.name}</p>
              <p className="text-sm text-red-700 mt-1">{error.message}</p>

              {error.stack && (
                <div className="mt-2">
                  <button
                    onClick={() => setIsErrorExpanded(!isErrorExpanded)}
                    className="text-xs text-red-600 hover:text-red-700 underline"
                  >
                    {isErrorExpanded ? 'Hide' : 'Show'} Stack Trace
                  </button>
                  {isErrorExpanded && (
                    <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-x-auto">
                      {error.stack}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
