// TopPoliciesTable - Shows top 10 most-used policies
// Requirements: 18.5

import React from 'react';
import type { PolicyUsageMetric } from '../../types/analytics';

interface TopPoliciesTableProps {
  policies: PolicyUsageMetric[];
}

export const TopPoliciesTable: React.FC<TopPoliciesTableProps> = ({ policies }) => {
  if (policies.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded p-3">
        <span className="text-xs text-gray-400">Top Policies</span>
        <div className="flex items-center justify-center h-16 text-xs text-gray-500">
          No policy data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded p-3">
      <span className="text-xs text-gray-400">Top Policies</span>
      <div className="mt-2 overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 border-b border-gray-700">
              <th className="text-left py-1 pr-2">#</th>
              <th className="text-left py-1 pr-2">Policy</th>
              <th className="text-right py-1 pr-2">Evals</th>
              <th className="text-right py-1 pr-2">Success</th>
              <th className="text-right py-1 pr-2">Latency</th>
              <th className="text-right py-1">Cost</th>
            </tr>
          </thead>
          <tbody>
            {policies.map((p, i) => (
              <tr key={p.policyId} className="border-b border-gray-700/50 text-gray-300">
                <td className="py-1.5 pr-2 text-gray-500">{i + 1}</td>
                <td className="py-1.5 pr-2 truncate max-w-[140px]" title={p.policyName}>
                  {p.policyName}
                </td>
                <td className="py-1.5 pr-2 text-right">{p.evaluations}</td>
                <td className="py-1.5 pr-2 text-right">
                  <span className={p.successRate >= 90 ? 'text-green-400' : p.successRate >= 70 ? 'text-yellow-400' : 'text-red-400'}>
                    {p.successRate}%
                  </span>
                </td>
                <td className="py-1.5 pr-2 text-right">{p.averageLatencyMs}ms</td>
                <td className="py-1.5 text-right">${p.totalCostUsd.toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
