// CostBreakdownChart - Horizontal bar chart for cost by category
// Requirements: 18.4

import React from 'react';
import type { CategoryMetric } from '../../types/analytics';

interface CostBreakdownChartProps {
  data: CategoryMetric[];
  title: string;
}

const COLORS = ['#14b8a6', '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444', '#22c55e', '#ec4899', '#6366f1'];

export const CostBreakdownChart: React.FC<CostBreakdownChartProps> = ({ data, title }) => {
  if (data.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded p-3">
        <span className="text-xs text-gray-400">{title}</span>
        <div className="flex items-center justify-center h-16 text-xs text-gray-500">
          No data available
        </div>
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.value), 0.0001);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded p-3">
      <span className="text-xs text-gray-400">{title}</span>
      <div className="mt-2 space-y-2">
        {data.slice(0, 8).map((item, i) => (
          <div key={item.name}>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-gray-300 truncate max-w-[140px]" title={item.name}>
                {item.name}
              </span>
              <span className="text-gray-400">
                ${item.value.toFixed(4)} ({item.percentage}%)
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: `${(item.value / maxVal) * 100}%`,
                  backgroundColor: COLORS[i % COLORS.length],
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
