import React from 'react';
import { ResultCard } from './ResultCard';
import type { EvaluationResult, TestScenario } from '../../types';

interface ResultDisplayProps {
  results: Array<{
    scenario: TestScenario;
    result: EvaluationResult;
  }>;
  isEvaluating?: boolean;
  totalExecutionTime?: number;
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({
  results,
  isEvaluating = false,
  totalExecutionTime,
}) => {
  // Empty state
  if (results.length === 0 && !isEvaluating) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <svg
          className="w-16 h-16 text-gray-300 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No results yet</h3>
        <p className="text-gray-500 max-w-sm">
          Add test scenarios and click "Run Evaluation" to see policy decisions here.
        </p>
      </div>
    );
  }

  // Loading state
  if (isEvaluating) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mb-4"></div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Evaluating policies...</h3>
        <p className="text-gray-500">Running {results.length || 'test'} scenarios</p>
      </div>
    );
  }

  // Calculate summary statistics
  const summary = {
    total: results.length,
    allowed: results.filter((r) => r.result.decision.action === 'ALLOW').length,
    denied: results.filter((r) => r.result.decision.action === 'DENY').length,
    monitored: results.filter((r) => r.result.decision.action === 'MONITOR').length,
    errors: results.filter((r) => r.result.error).length,
    totalCost: results.reduce((sum, r) => sum + r.result.metadata.estimatedCost, 0),
    totalTokens: results.reduce((sum, r) => sum + r.result.metadata.tokensUsed, 0),
  };

  return (
    <div className="h-full flex flex-col">
      {/* Summary Header */}
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Evaluation Results</h2>
          {totalExecutionTime && (
            <span className="text-sm text-gray-500">
              Total time: {(totalExecutionTime / 1000).toFixed(2)}s
            </span>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
          <div className="bg-gray-50 rounded p-2">
            <span className="text-gray-500">Total</span>
            <p className="font-semibold text-gray-900">{summary.total}</p>
          </div>
          <div className="bg-green-50 rounded p-2">
            <span className="text-green-600">Allowed</span>
            <p className="font-semibold text-green-900">{summary.allowed}</p>
          </div>
          <div className="bg-red-50 rounded p-2">
            <span className="text-red-600">Denied</span>
            <p className="font-semibold text-red-900">{summary.denied}</p>
          </div>
          <div className="bg-yellow-50 rounded p-2">
            <span className="text-yellow-600">Monitored</span>
            <p className="font-semibold text-yellow-900">{summary.monitored}</p>
          </div>
          <div className="bg-gray-50 rounded p-2">
            <span className="text-gray-500">Total Cost</span>
            <p className="font-semibold text-gray-900">
              ${summary.totalCost.toFixed(4)}
            </p>
          </div>
        </div>

        {summary.errors > 0 && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
            <p className="text-sm text-red-800">
              ⚠️ {summary.errors} scenario{summary.errors > 1 ? 's' : ''} encountered errors
            </p>
          </div>
        )}
      </div>

      {/* Results List */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-4"
        role="region"
        aria-live="polite"
        aria-label="Evaluation results"
      >
        {results.map(({ scenario, result }, index) => (
          <ResultCard
            key={scenario.id}
            result={result}
            scenarioName={scenario.name}
            index={index}
          />
        ))}
      </div>
    </div>
  );
};
