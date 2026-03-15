// PresenceCursor - Display other users' cursor positions
// Requirements: 27.5, 29.6

import React from 'react';
import type { PresenceState } from '../../services/RealtimeCollaborationService';

interface PresenceCursorProps {
  presence: PresenceState;
  isCurrentUser?: boolean;
}

export const PresenceCursor: React.FC<PresenceCursorProps> = ({
  presence,
  isCurrentUser = false,
}) => {
  if (isCurrentUser) {
    return null; // Don't show cursor for current user
  }

  // Generate a consistent color based on userId
  const getUserColor = (userId: string): string => {
    const colors = [
      '#3B82F6', // blue
      '#10B981', // green
      '#F59E0B', // amber
      '#EF4444', // red
      '#8B5CF6', // purple
      '#EC4899', // pink
      '#14B8A6', // teal
      '#F97316', // orange
    ];
    
    const hash = userId.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  };

  const color = getUserColor(presence.userId);

  return (
    <div
      className="absolute pointer-events-none z-50 transition-all duration-100"
      style={{
        top: `${presence.cursorPosition.line * 19}px`, // Approximate line height
        left: `${presence.cursorPosition.column * 7.2}px`, // Approximate char width
      }}
    >
      {/* Cursor */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M2 2L18 10L10 12L8 18L2 2Z"
          fill={color}
          stroke="white"
          strokeWidth="1"
        />
      </svg>
      
      {/* Username label */}
      <div
        className="absolute top-5 left-5 px-2 py-1 rounded text-xs font-medium text-white whitespace-nowrap shadow-lg"
        style={{ backgroundColor: color }}
      >
        {presence.username}
      </div>
    </div>
  );
};

interface PresenceCursorsProps {
  presences: PresenceState[];
  currentUserId?: string;
}

export const PresenceCursors: React.FC<PresenceCursorsProps> = ({
  presences,
  currentUserId,
}) => {
  return (
    <div className="relative">
      {presences.map((presence) => (
        <PresenceCursor
          key={presence.userId}
          presence={presence}
          isCurrentUser={presence.userId === currentUserId}
        />
      ))}
    </div>
  );
};
