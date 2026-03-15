// UnresolvedCommentBadge - Display unresolved comment count
// Requirements: 6.8

import React from 'react';

interface UnresolvedCommentBadgeProps {
  count: number;
  onClick?: () => void;
}

export const UnresolvedCommentBadge: React.FC<UnresolvedCommentBadgeProps> = ({
  count,
  onClick,
}) => {
  if (count === 0) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full hover:bg-yellow-200"
      title={`${count} unresolved comment${count !== 1 ? 's' : ''}`}
    >
      <svg
        className="w-3 h-3 mr-1"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
          clipRule="evenodd"
        />
      </svg>
      {count}
    </button>
  );
};
