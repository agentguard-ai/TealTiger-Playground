// PolicyPopularityBadge - Shows stars, forks, views for a shared policy
// Requirements: 21.7

import React from 'react';

interface PolicyPopularityBadgeProps {
  stars: number;
  forks: number;
  views: number;
}

export const PolicyPopularityBadge: React.FC<PolicyPopularityBadgeProps> = ({ stars, forks, views }) => (
  <div className="flex items-center gap-3 text-xs text-gray-400">
    <span title="Stars">⭐ {stars}</span>
    <span title="Forks">🔀 {forks}</span>
    <span title="Views">👁️ {views}</span>
  </div>
);
