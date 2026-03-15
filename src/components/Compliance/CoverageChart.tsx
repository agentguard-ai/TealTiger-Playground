import React from 'react';
import type { ComplianceCoverage } from '../../types/compliance';

interface CoverageChartProps {
  coverage: ComplianceCoverage;
}

export const CoverageChart: React.FC<CoverageChartProps> = ({ coverage }) => {
  const { coveragePercentage, mappedRequirements, totalRequirements } = coverage;

  // Determine color based on coverage percentage
  const getColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600 bg-green-100';
    if (percentage >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const colorClass = getColor(coveragePercentage);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Coverage Overview</h3>
      
      {/* Circular Progress */}
      <div className="flex items-center justify-center mb-6">
        <div className="relative w-32 h-32">
          <svg className="w-32 h-32 transform -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="56"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-gray-200"
            />
            <circle
              cx="64"
              cy="64"
              r="56"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 56}`}
              strokeDashoffset={`${2 * Math.PI * 56 * (1 - coveragePercentage / 100)}`}
              className={colorClass.split(' ')[0]}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl font-bold text-gray-900">{coveragePercentage}%</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{mappedRequirements}</div>
          <div className="text-sm text-gray-600">Mapped</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{totalRequirements}</div>
          <div className="text-sm text-gray-600">Total</div>
        </div>
      </div>
    </div>
  );
};
