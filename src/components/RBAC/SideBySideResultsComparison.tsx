/**
 * Side-by-Side Results Comparison Component
 * Requirements: 13.5, 13.8
 */

import React from 'react';
import type { SimulationResult } from '../../types/rbac';

interface SideBySideResultsComparisonProps {
  results: SimulationResult[];
}

export const SideBySideResultsComparison: React.FC<SideBySideResultsComparisonProps> = ({
  results,
}) => {
  if (results.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No results to compare. Run a simulation first.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800">
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700">
              Role
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700">
              Decision
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700">
              Reason
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700">
              Execution Time
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700">
              Permissions
            </th>
          </tr>
        </thead>
        <tbody>
          {results.map((result, index) => (
            <tr
              key={index}
              className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                {result.role.name}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                    result.decision.allowed
                      ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                      : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                  }`}
                >
                  {result.decision.allowed ? 'ALLOW' : 'DENY'}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                {result.decision.reason}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                {result.executionTime.toFixed(2)}ms
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {result.role.permissions.slice(0, 3).map((perm) => (
                    <span
                      key={perm}
                      className="inline-flex px-2 py-0.5 bg-blue-100 dark:bg-blue-900 
                               text-blue-800 dark:text-blue-200 rounded text-xs"
                    >
                      {perm}
                    </span>
                  ))}
                  {result.role.permissions.length > 3 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      +{result.role.permissions.length - 3} more
                    </span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
