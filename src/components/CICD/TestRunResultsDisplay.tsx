// TestRunResultsDisplay - Shows test run results with pass/fail breakdown
// Requirements: 15.5, 15.7

import React from 'react';
import type { TestRunResult } from '../../types/cicd';

interface TestRunResultsDisplayProps {
  result: TestRunResult;
}

export const TestRunResultsDisplay: React.FC<TestRunResultsDisplayProps> = ({ result }) => {
  const total = result.passed + result.failed + result.skipped;
  const passRate = total > 0 ? Math.round((result.passed / total) * 100) : 0;
  const status = result.failed > 0 ? 'failed' : 'passed';

  return (
    <div className="bg-gray-800 border border-gray-700 rounded p-4 space-y-3">
      {/* Status header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-2.5 h-2.5 rounded-full ${
              status === 'passed' ? 'bg-green-400' : 'bg-red-400'
            }`}
          />
          <span className="text-sm font-medium text-white">
            {status === 'passed' ? 'All Tests Passed' : 'Tests Failed'}
          </span>
        </div>
        <span className="text-xs text-gray-400">
          {result.duration}ms
        </span>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-4 gap-2">
        <MetricCard label="Passed" value={result.passed} color="text-green-400" />
        <MetricCard label="Failed" value={result.failed} color="text-red-400" />
        <MetricCard label="Skipped" value={result.skipped} color="text-yellow-400" />
        <MetricCard label="Pass Rate" value={`${passRate}%`} color="text-teal-400" />
      </div>

      {/* Coverage bar */}
      <div>
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Coverage</span>
          <span>{result.coverage}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all ${
              result.coverage >= 80 ? 'bg-green-500' : result.coverage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(result.coverage, 100)}%` }}
          />
        </div>
      </div>

      {/* Failures */}
      {result.failures.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs text-gray-400">Failed Tests</span>
          {result.failures.map((f, i) => (
            <details key={i} className="bg-gray-900 rounded p-2">
              <summary className="text-xs text-red-400 cursor-pointer">
                ❌ {f.testName}
              </summary>
              <pre className="text-xs text-gray-400 mt-1 overflow-auto">
                {f.error}
              </pre>
            </details>
          ))}
        </div>
      )}
    </div>
  );
};

const MetricCard: React.FC<{ label: string; value: string | number; color: string }> = ({
  label,
  value,
  color,
}) => (
  <div className="bg-gray-900 rounded p-2 text-center">
    <div className={`text-lg font-semibold ${color}`}>{value}</div>
    <div className="text-xs text-gray-500">{label}</div>
  </div>
);
