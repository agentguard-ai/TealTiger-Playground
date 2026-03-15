// DeploymentStatusBadge - Shows deployment status with environment info
// Requirements: 15.7

import React from 'react';
import type { DeploymentResult } from '../../types/cicd';

interface DeploymentStatusBadgeProps {
  deployment: DeploymentResult;
}

const STATUS_STYLES: Record<DeploymentResult['status'], { bg: string; text: string; icon: string }> = {
  success: { bg: 'bg-green-900/30', text: 'text-green-400', icon: '✅' },
  failed: { bg: 'bg-red-900/30', text: 'text-red-400', icon: '❌' },
};

export const DeploymentStatusBadge: React.FC<DeploymentStatusBadgeProps> = ({ deployment }) => {
  const style = STATUS_STYLES[deployment.status];
  const timeAgo = formatTimeAgo(deployment.deployedAt);

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded ${style.bg}`}>
      <span>{style.icon}</span>
      <div>
        <div className={`text-xs font-medium ${style.text}`}>
          {deployment.environment}
        </div>
        <div className="text-xs text-gray-500">
          {deployment.status === 'success' ? `Deployed ${timeAgo}` : deployment.message}
        </div>
      </div>
    </div>
  );
};

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}
