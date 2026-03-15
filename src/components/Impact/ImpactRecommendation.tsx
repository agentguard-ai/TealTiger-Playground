// ImpactRecommendation - Approve/review/reject recommendation
// Requirements: 17.8

import React from 'react';
import type { ImpactAnalysis } from '../../types/impact';

interface ImpactRecommendationProps {
  analysis: ImpactAnalysis;
  onApprove?: () => void;
  onReject?: () => void;
  onRequestReview?: () => void;
}

export const ImpactRecommendation: React.FC<ImpactRecommendationProps> = ({
  analysis,
  onApprove,
  onReject,
  onRequestReview
}) => {
  const { recommendation, summary } = analysis;

  const getRecommendationDetails = () => {
    switch (recommendation) {
      case 'approve':
        return {
          title: 'Safe to Deploy',
          description: 'No breaking changes detected. The policy modifications are safe to deploy to production.',
          icon: '✓',
          color: 'green',
          action: onApprove,
          actionLabel: 'Approve & Deploy'
        };
      case 'review':
        return {
          title: 'Review Required',
          description: `${summary.warnings} warning${summary.warnings !== 1 ? 's' : ''} detected. Please review the changes carefully before deployment.`,
          icon: '⚠',
          color: 'yellow',
          action: onRequestReview,
          actionLabel: 'Request Review'
        };
      case 'reject':
        return {
          title: 'Breaking Changes Detected',
          description: `${summary.breakingChanges} breaking change${summary.breakingChanges !== 1 ? 's' : ''} detected. These changes will alter policy behavior and may cause issues.`,
          icon: '✗',
          color: 'red',
          action: onReject,
          actionLabel: 'Reject Changes'
        };
      default:
        return {
          title: 'Unknown',
          description: 'Unable to determine recommendation',
          icon: '?',
          color: 'gray',
          action: undefined,
          actionLabel: 'Close'
        };
    }
  };

  const details = getRecommendationDetails();

  const colorClasses = {
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-900',
      button: 'bg-green-600 hover:bg-green-700 text-white'
    },
    yellow: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-900',
      button: 'bg-yellow-600 hover:bg-yellow-700 text-white'
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-900',
      button: 'bg-red-600 hover:bg-red-700 text-white'
    },
    gray: {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      text: 'text-gray-900',
      button: 'bg-gray-600 hover:bg-gray-700 text-white'
    }
  };

  const colors = colorClasses[details.color as keyof typeof colorClasses];

  return (
    <div className={`rounded-lg border-2 p-6 ${colors.bg} ${colors.border}`}>
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <div className="text-4xl">{details.icon}</div>
        <div className="flex-1">
          <h3 className={`text-xl font-bold mb-2 ${colors.text}`}>
            {details.title}
          </h3>
          <p className={`text-sm ${colors.text}`}>
            {details.description}
          </p>
        </div>
      </div>

      {/* Impact Summary */}
      <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
        <h4 className="font-semibold text-gray-900 mb-3">Impact Summary</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-600">Total Scenarios</div>
            <div className="text-lg font-bold text-gray-900">{summary.totalScenarios}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Affected</div>
            <div className="text-lg font-bold text-blue-600">{summary.affectedScenarios}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Breaking Changes</div>
            <div className="text-lg font-bold text-red-600">{summary.breakingChanges}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Warnings</div>
            <div className="text-lg font-bold text-yellow-600">{summary.warnings}</div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        {details.action && (
          <button
            onClick={details.action}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors ${colors.button}`}
          >
            {details.actionLabel}
          </button>
        )}
        
        {recommendation === 'approve' && onReject && (
          <button
            onClick={onReject}
            className="px-6 py-3 rounded-lg font-semibold bg-gray-200 hover:bg-gray-300 text-gray-800 transition-colors"
          >
            Cancel
          </button>
        )}
        
        {recommendation === 'review' && (
          <>
            {onApprove && (
              <button
                onClick={onApprove}
                className="px-6 py-3 rounded-lg font-semibold bg-green-600 hover:bg-green-700 text-white transition-colors"
              >
                Approve Anyway
              </button>
            )}
            {onReject && (
              <button
                onClick={onReject}
                className="px-6 py-3 rounded-lg font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors"
              >
                Reject
              </button>
            )}
          </>
        )}
        
        {recommendation === 'reject' && onApprove && (
          <button
            onClick={onApprove}
            className="px-6 py-3 rounded-lg font-semibold bg-gray-200 hover:bg-gray-300 text-gray-800 transition-colors"
          >
            Override & Approve
          </button>
        )}
      </div>

      {/* Warning for Override */}
      {recommendation === 'reject' && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Warning:</strong> Overriding this recommendation may cause unexpected behavior in production. 
            This action will be logged in the audit trail.
          </p>
        </div>
      )}
    </div>
  );
};
