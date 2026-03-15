/**
 * Role Difference Highlighter Component
 * Requirements: 13.8
 */

import React from 'react';
import type { RoleComparison, SimulationResult } from '../../types/rbac';
import { rbacSimulatorService } from '../../services/RBACSimulatorService';

interface RoleDifferenceHighlighterProps {
  results: SimulationResult[];
}

export const RoleDifferenceHighlighter: React.FC<RoleDifferenceHighlighterProps> = ({
  results,
}) => {
  if (results.length < 2) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Need at least 2 roles to compare differences.
      </div>
    );
  }

  const comparison: RoleComparison = rbacSimulatorService.compareRoleResults(results);

  return (
    <div className="space-y-4">
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
          Comparison Summary
        </h4>
        <p className="text-sm text-blue-800 dark:text-blue-300">{comparison.summary}</p>
      </div>

      {comparison.differences.length > 0 ? (
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-900 dark:text-white">
            Differences Found ({comparison.differences.length})
          </h4>
          {comparison.differences.map((diff, index) => (
            <div
              key={index}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    diff.field === 'decision'
                      ? 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300'
                      : diff.field === 'reason'
                      ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-300'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {diff.field === 'decision' ? '!' : diff.field === 'reason' ? '?' : 'i'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {diff.role1}
                    </span>
                    <span className="text-gray-400">vs</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {diff.role2}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium capitalize">{diff.field}:</span> {diff.difference}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-800 dark:text-green-300">
            ✓ All roles produced identical results
          </p>
        </div>
      )}
    </div>
  );
};
