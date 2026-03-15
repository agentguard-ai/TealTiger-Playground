// CostTrendChart - Line-style bar chart showing cost trends over time
// Requirements: 20.9

import React from 'react';
import type { CostTrendPoint } from '../../types/cost';

interface CostTrendChartProps {
  data: CostTrendPoint[];
  height?: number;
}

export const CostTrendChart: React.FC<CostTrendChartProps> = ({ data, height = 140 }) => {
  if (data.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded p-3">
        <span className="text-xs text-gray-400">Cost Trend</span>
        <div className="flex items-center justify-center h-16 text-xs text-gray-500">No data</div>
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.costUsd), 0.0001);
  const barW = Math.max(4, Math.floor(480 / data.length) - 2);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded p-3">
      <div className="flex justify-between text-xs mb-2">
        <span className="text-gray-400">Cost Trend</span>
        <span className="text-gray-500">Max: ${maxVal.toFixed(4)}</span>
      </div>
      <svg
        viewBox={`0 0 ${data.length * (barW + 2)} ${height}`}
        className="w-full"
        style={{ height }}
        role="img"
        aria-label="Cost trend chart"
      >
        {data.map((pt, i) => {
          const barH = (pt.costUsd / maxVal) * (height - 20);
          const x = i * (barW + 2);
          const y = height - 16 - barH;
          return (
            <rect key={pt.date} x={x} y={y} width={barW} height={barH} fill="#f59e0b" rx="1" opacity="0.8">
              <title>{`${pt.date}: $${pt.costUsd.toFixed(4)}`}</title>
            </rect>
          );
        })}
        <line x1="0" y1={height - 16} x2={data.length * (barW + 2)} y2={height - 16} stroke="#374151" strokeWidth="1" />
      </svg>
    </div>
  );
};
