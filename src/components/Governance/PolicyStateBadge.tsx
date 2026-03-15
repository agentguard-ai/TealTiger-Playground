// PolicyStateBadge - Display policy state with color coding
// Requirements: 7.1, 7.9

import React from 'react';
import type { PolicyState } from '../../types/policy';

interface PolicyStateBadgeProps {
  state: PolicyState;
  className?: string;
}

const STATE_CONFIG = {
  draft: {
    label: 'Draft',
    color: 'bg-gray-100 text-gray-800 border-gray-300',
    icon: '📝'
  },
  review: {
    label: 'Review',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    icon: '👀'
  },
  approved: {
    label: 'Approved',
    color: 'bg-green-100 text-green-800 border-green-300',
    icon: '✅'
  },
  production: {
    label: 'Production',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: '🚀'
  }
};

export const PolicyStateBadge: React.FC<PolicyStateBadgeProps> = ({ state, className = '' }) => {
  const config = STATE_CONFIG[state];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${config.color} ${className}`}
      role="status"
      aria-label={`Policy state: ${config.label}`}
    >
      <span aria-hidden="true">{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
};
