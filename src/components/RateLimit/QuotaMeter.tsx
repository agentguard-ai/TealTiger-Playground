// QuotaMeter - Visual meter showing quota usage percentage
// Requirements: 19.3

import React from 'react';

interface QuotaMeterProps {
  label: string;
  used: number;
  max: number;
  unit?: string;
}

export const QuotaMeter: React.FC<QuotaMeterProps> = ({ label, used, max, unit = 'req' }) => {
  const pct = max > 0 ? Math.round((used / max) * 100) : 0;
  const color = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-yellow-500' : 'bg-teal-500';
  const textColor = pct >= 100 ? 'text-red-400' : pct >= 80 ? 'text-yellow-400' : 'text-teal-400';

  return (
    <div className="bg-gray-800 border border-gray-700 rounded p-3">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span className={textColor}>
          {used.toLocaleString()} / {max.toLocaleString()} {unit}
        </span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${color}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <div className="text-right text-xs text-gray-500 mt-0.5">{pct}%</div>
    </div>
  );
};
