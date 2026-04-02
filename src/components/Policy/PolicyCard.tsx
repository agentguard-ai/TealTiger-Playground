// PolicyCard - Display policy metadata
// Requirements: 3.4, 3.5, 3.6

import React from 'react';
import type { Policy } from '../../types/policy';
import { PolicyState } from '../../types/policy';

interface PolicyCardProps {
  policy: Policy;
  onClick?: () => void;
}

const stateColors: Record<PolicyState, { bg: string; text: string; border: string }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' },
  review: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
  approved: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
  production: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' }
};

export const PolicyCard: React.FC<PolicyCardProps> = ({ policy, onClick }) => {
  const stateStyle = stateColors[policy.state];

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {policy.name}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            v{policy.currentVersion}
          </p>
        </div>
        <span
          className={`ml-2 px-2 py-1 text-xs font-medium rounded-full border ${stateStyle.bg} ${stateStyle.text} ${stateStyle.border}`}
        >
          {policy.state.charAt(0).toUpperCase() + policy.state.slice(1)}
        </span>
      </div>

      {/* Description */}
      {policy.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {policy.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
        <span>Updated {formatDate(policy.updatedAt)}</span>
        <svg
          className="h-4 w-4 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>
    </div>
  );
};
