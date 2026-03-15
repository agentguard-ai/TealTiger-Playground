// ActiveUsersList - Display active users in workspace
// Requirements: 27.5, 29.6

import React from 'react';
import type { PresenceState } from '../../services/RealtimeCollaborationService';

interface ActiveUsersListProps {
  users: PresenceState[];
  currentUserId?: string;
  maxDisplay?: number;
}

export const ActiveUsersList: React.FC<ActiveUsersListProps> = ({
  users,
  currentUserId,
  maxDisplay = 5,
}) => {
  const displayUsers = users.slice(0, maxDisplay);
  const remainingCount = users.length - maxDisplay;

  if (users.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600 dark:text-gray-400">
        Active:
      </span>
      
      <div className="flex -space-x-2">
        {displayUsers.map((user) => (
          <div
            key={user.userId}
            className="relative group"
            title={`${user.username}${user.userId === currentUserId ? ' (You)' : ''}`}
          >
            <img
              src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=random`}
              alt={user.username}
              className={`w-8 h-8 rounded-full border-2 ${
                user.userId === currentUserId
                  ? 'border-blue-500'
                  : 'border-white dark:border-gray-800'
              } hover:scale-110 transition-transform`}
            />
            
            {/* Online indicator */}
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
            
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
              {user.username}
              {user.userId === currentUserId && ' (You)'}
            </div>
          </div>
        ))}
        
        {remainingCount > 0 && (
          <div
            className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-800 bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300"
            title={`${remainingCount} more user${remainingCount > 1 ? 's' : ''}`}
          >
            +{remainingCount}
          </div>
        )}
      </div>
      
      <span className="text-xs text-gray-500 dark:text-gray-500">
        {users.length} online
      </span>
    </div>
  );
};
