// ImpactAnalysisPanel - Summary of impact analysis results
// Requirements: 17.6, 17.8

import React from 'react';
import type { ImpactAnalysis } from '../../types/impact';

interface ImpactAnalysisPanelProps {
  analysis: ImpactAnalysis;
  onClose?: () => void;
}

export const ImpactAnalysisPanel: React.FC<ImpactAnalysisPanelProps> = ({
  analysis,
  onClose
}) => {
  const { summary, recommendation } = analysis;

  const getRecommendationColor = () => {
    switch (recommendation) {
      case 'approve':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'review':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'reject':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getRecommendationIcon = () => {
    switch (recommendation) {
      case 'approve':
        return '✓';
      case 'review':
        return '⚠';
      case 'reject':
        return '✗';
      default:
        return '?';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Policy Impact Analysis
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Recommendation Badge */}
      <div className={`mb-6 p-4 rounded-lg border-2 ${getRecommendationColor()}`}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{getRecommendationIcon()}</span>
          <div>
            <div className="font-bold text-lg uppercase">
              {recommendation}
            </div>
            <div className="text-sm mt-1">
              {recommendation === 'approve' && 'Changes are safe to deploy'}
              {recommendation === 'review' && 'Changes require careful review'}
              {recommendation === 'reject' && 'Changes contain breaking modifications'}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Total Scenarios</div>
          <div className="text-2xl font-bold text-gray-900">
            {summary.totalScenarios}
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="text-sm text-blue-600 mb-1">Affected</div>
          <div className="text-2xl font-bold text-blue-900">
            {summary.affectedScenarios}
          </div>
        </div>

        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <div className="text-sm text-red-600 mb-1">Breaking</div>
          <div className="text-2xl font-bold text-red-900">
            {summary.breakingChanges}
          </div>
        </div>

        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <div className="text-sm text-yellow-600 mb-1">Warnings</div>
          <div className="text-2xl font-bold text-yellow-900">
            {summary.warnings}
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="text-sm text-green-600 mb-1">Info</div>
          <div className="text-2xl font-bold text-green-900">
            {summary.infoChanges}
          </div>
        </div>
      </div>

      {/* Analysis Timestamp */}
      <div className="text-sm text-gray-500 text-center">
        Analyzed at {analysis.analyzedAt.toLocaleString()}
      </div>
    </div>
  );
};
