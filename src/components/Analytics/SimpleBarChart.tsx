// SimpleBarChart - Lightweight SVG bar chart for time series data
// Requirements: 18.1-18.8

import React from 'react';
import type { TimeSeriesPoint } from '../../types/analytics';

interface SimpleBarChartProps {
  data: TimeSeriesPoint[];
  title: string;
  color?: string;
  height?: number;
  formatValue?: (v: number) => string;
}

export const SimpleBarChart: React.FC<SimpleBarChartProps> = ({
  data,
  title,
  color = '#14b8a6',
  height = 160,
  formatValue = (v) => String(v),
}) => {
  if (data.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded p-3">
        <span className="text-xs text-gray-400">{title}</span>
        <div className="flex items-center justify-center h-20 text-xs text-gray-500">
          No data available
        </div>
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const barWidth = Math.max(4, Math.floor(480 / data.length) - 2);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400">{title}</span>
        <span className="text-xs text-gray-500">
          Max: {formatValue(maxVal)}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${data.length * (barWidth + 2)} ${height}`}
        className="w-full"
        style={{ height }}
        role="img"
        aria-label={title}
      >
        {data.map((point, i) => {
          const barH = (point.value / maxVal) * (height - 20);
          const x = i * (barWidth + 2);
          const y = height - 16 - barH;
          return (
            <g key={point.date}>
              <rect
                x={x} y={y}
                width={barWidth} height={barH}
                fill={color} rx="1" opacity="0.85"
              >
                <title>{`${point.date}: ${formatValue(point.value)}`}</title>
              </rect>
            </g>
          );
        })}
        <line x1="0" y1={height - 16} x2={data.length * (barWidth + 2)} y2={height - 16} stroke="#374151" strokeWidth="1" />
      </svg>
    </div>
  );
};
