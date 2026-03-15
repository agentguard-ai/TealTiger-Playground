// SuccessRateGauge - Circular gauge showing success rate percentage
// Requirements: 18.2

import React from 'react';

interface SuccessRateGaugeProps {
  rate: number; // 0-100
}

export const SuccessRateGauge: React.FC<SuccessRateGaugeProps> = ({ rate }) => {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (rate / 100) * circumference;
  const color = rate >= 90 ? 'stroke-green-400' : rate >= 70 ? 'stroke-yellow-400' : 'stroke-red-400';
  const textColor = rate >= 90 ? 'text-green-400' : rate >= 70 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="bg-gray-800 border border-gray-700 rounded p-3 flex flex-col items-center">
      <span className="text-xs text-gray-400 mb-2">Success Rate</span>
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r={radius} fill="none" stroke="#374151" strokeWidth="8" />
          <circle
            cx="48" cy="48" r={radius}
            fill="none" className={color}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-lg font-bold ${textColor}`}>{rate}%</span>
        </div>
      </div>
    </div>
  );
};
