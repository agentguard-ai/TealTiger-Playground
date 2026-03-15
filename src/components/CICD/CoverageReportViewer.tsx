// CoverageReportViewer - Displays code coverage report with line-level detail
// Requirements: 15.5

import React from 'react';
import type { CoverageReport } from '../../types/cicd';

interface CoverageReportViewerProps {
  report: CoverageReport;
}

export const CoverageReportViewer: React.FC<CoverageReportViewerProps> = ({ report }) => {
  const uncoveredCount = report.uncoveredLines.length;
  const coverageColor =
    report.coveragePercentage >= 80
      ? 'text-green-400'
      : report.coveragePercentage >= 50
        ? 'text-yellow-400'
        : 'text-red-400';

  const ringColor =
    report.coveragePercentage >= 80
      ? 'stroke-green-400'
      : report.coveragePercentage >= 50
        ? 'stroke-yellow-400'
        : 'stroke-red-400';

  // SVG ring parameters
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (report.coveragePercentage / 100) * circumference;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded p-4 space-y-4">
      <div className="flex items-center gap-4">
        {/* Coverage ring */}
        <div className="relative w-20 h-20 flex-shrink-0">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle
              cx="40" cy="40" r={radius}
              fill="none" stroke="#374151" strokeWidth="6"
            />
            <circle
              cx="40" cy="40" r={radius}
              fill="none"
              className={ringColor}
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-sm font-bold ${coverageColor}`}>
              {report.coveragePercentage}%
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-1">
          <div className="text-sm text-white">Code Coverage</div>
          <div className="text-xs text-gray-400">
            {report.coveredLines} / {report.totalLines} lines covered
          </div>
          {uncoveredCount > 0 && (
            <div className="text-xs text-yellow-400">
              {uncoveredCount} uncovered line{uncoveredCount !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Uncovered lines detail */}
      {uncoveredCount > 0 && uncoveredCount <= 20 && (
        <div>
          <span className="text-xs text-gray-400">Uncovered Lines</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {report.uncoveredLines.map((line) => (
              <span
                key={line}
                className="px-1.5 py-0.5 text-xs bg-red-900/30 text-red-400 rounded font-mono"
              >
                L{line}
              </span>
            ))}
          </div>
        </div>
      )}
      {uncoveredCount > 20 && (
        <div className="text-xs text-gray-400">
          {uncoveredCount} uncovered lines (lines {report.uncoveredLines[0]}–
          {report.uncoveredLines[uncoveredCount - 1]})
        </div>
      )}
    </div>
  );
};
