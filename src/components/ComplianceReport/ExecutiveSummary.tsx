// ExecutiveSummary - Coverage statistics and key metrics
// Requirements: 9.9

import React from 'react';
import type { ReportSummary } from '../../types/compliance-report';

interface ExecutiveSummaryProps {
  summary: ReportSummary;
  frameworkName: string;
}

export const ExecutiveSummary: React.FC<ExecutiveSummaryProps> = ({
  summary,
  frameworkName
}) => {
  const getCoverageColor = (percentage: number): string => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTestCoverageColor = (percentage: number): string => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSuccessRateColor = (percentage: number): string => {
    if (percentage >= 95) return 'text-green-600';
    if (percentage >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-sm border border-blue-200 p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Executive Summary
      </h2>
      <p className="text-sm text-gray-600 mb-6">
        Compliance coverage for {frameworkName}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Policies */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Total Policies</span>
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {summary.totalPolicies}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {summary.mappedPolicies} mapped to framework
          </div>
        </div>

        {/* Coverage Percentage */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Framework Coverage</span>
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className={`text-3xl font-bold ${getCoverageColor(summary.coveragePercentage)}`}>
            {summary.coveragePercentage}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Requirements mapped
          </div>
        </div>

        {/* Average Test Coverage */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Avg Test Coverage</span>
            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div className={`text-3xl font-bold ${getTestCoverageColor(summary.averageTestCoverage)}`}>
            {summary.averageTestCoverage}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Across all policies
          </div>
        </div>
      </div>

      {/* Additional Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* Average Success Rate */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Avg Success Rate</span>
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div className={`text-3xl font-bold ${getSuccessRateColor(summary.averageSuccessRate)}`}>
            {summary.averageSuccessRate}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Policy evaluation success
          </div>
        </div>

        {/* Coverage Status */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Coverage Status</span>
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-lg font-semibold text-gray-900">
            {summary.coveragePercentage >= 80 ? 'Excellent' :
             summary.coveragePercentage >= 50 ? 'Good' :
             summary.coveragePercentage >= 25 ? 'Fair' : 'Needs Improvement'}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Based on framework requirements
          </div>
        </div>
      </div>

      {/* Coverage Progress Bar */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Overall Compliance Progress</span>
          <span className="text-sm font-semibold text-gray-900">{summary.coveragePercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              summary.coveragePercentage >= 80 ? 'bg-green-500' :
              summary.coveragePercentage >= 50 ? 'bg-yellow-500' :
              'bg-red-500'
            }`}
            style={{ width: `${summary.coveragePercentage}%` }}
          />
        </div>
      </div>
    </div>
  );
};
