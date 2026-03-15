// CostBreakdownTable - Tabular cost breakdown by category
// Requirements: 20.1-20.5

import React, { useState } from 'react';
import type { CostAllocationReport } from '../../types/cost';

interface CostBreakdownTableProps {
  report: CostAllocationReport;
}

type ViewMode = 'policy' | 'provider' | 'member' | 'project';

const VIEW_LABELS: Record<ViewMode, string> = {
  policy: 'By Policy',
  provider: 'By Provider',
  member: 'By Member',
  project: 'By Project',
};

export const CostBreakdownTable: React.FC<CostBreakdownTableProps> = ({ report }) => {
  const [view, setView] = useState<ViewMode>('policy');

  const data = {
    policy: report.byPolicy,
    provider: report.byProvider,
    member: report.byMember,
    project: report.byProject,
  }[view];

  return (
    <div className="bg-gray-800 border border-gray-700 rounded p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-white">Cost Breakdown</span>
        <span className="text-xs text-teal-400 font-medium">
          Total: ${report.totalCostUsd.toFixed(4)}
        </span>
      </div>

      <div className="flex gap-1 mb-3">
        {(Object.keys(VIEW_LABELS) as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setView(mode)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              view === mode ? 'bg-teal-600 text-white' : 'text-gray-400 hover:text-white bg-gray-700'
            }`}
          >
            {VIEW_LABELS[mode]}
          </button>
        ))}
      </div>

      {data.length === 0 ? (
        <div className="text-xs text-gray-500 text-center py-4">No data</div>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 border-b border-gray-700">
              <th className="text-left py-1">Name</th>
              <th className="text-right py-1">Cost</th>
              <th className="text-right py-1">%</th>
              <th className="text-right py-1">Count</th>
            </tr>
          </thead>
          <tbody>
            {data.map((cat) => (
              <tr key={cat.name} className="border-b border-gray-700/50 text-gray-300">
                <td className="py-1.5 truncate max-w-[160px]" title={cat.name}>{cat.name}</td>
                <td className="py-1.5 text-right">${cat.costUsd.toFixed(4)}</td>
                <td className="py-1.5 text-right text-gray-400">{cat.percentage}%</td>
                <td className="py-1.5 text-right text-gray-400">{cat.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
