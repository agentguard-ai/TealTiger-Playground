import React from 'react';
import type { WorkspaceMember, WorkspaceRole } from '../../types/workspace';

interface MemberWithUser extends WorkspaceMember {
  user?: {
    username: string;
    email: string;
    avatarUrl?: string;
  };
}

interface MemberListProps {
  members: MemberWithUser[];
  currentUserId: string;
  workspaceOwnerId: string;
  onRemoveMember: (memberId: string) => Promise<void>;
  onUpdateRole: (memberId: string, newRole: WorkspaceRole) => Promise<void>;
  onTransferOwnership: (newOwnerId: string) => Promise<void>;
}

export const MemberList: React.FC<MemberListProps> = ({
  members,
  currentUserId,
  workspaceOwnerId,
  onRemoveMember,
  onUpdateRole,
  onTransferOwnership,
}) => {
  const isCurrentUserOwner = members.find(
    (m) => m.userId === currentUserId && m.role === 'owner'
  );

  const getRoleBadgeColor = (role: WorkspaceRole) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-700';
      case 'editor':
        return 'bg-blue-100 text-blue-700';
      case 'viewer':
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getRoleIcon = (role: WorkspaceRole) => {
    switch (role) {
      case 'owner':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
            />
          </svg>
        );
      case 'editor':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        );
      case 'viewer':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
        );
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">
          Team Members ({members.length})
        </h3>
      </div>

      <div className="divide-y divide-gray-200">
        {members.map((member) => (
          <div key={member.id} className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                {member.user?.avatarUrl ? (
                  <img
                    src={member.user.avatarUrl}
                    alt={member.user.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <svg
                    className="w-6 h-6 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                )}
              </div>

              {/* User Info */}
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900">
                    {member.user?.username || 'Unknown User'}
                  </p>
                  {member.userId === currentUserId && (
                    <span className="text-xs text-gray-500">(You)</span>
                  )}
                </div>
                <p className="text-xs text-gray-500">{member.user?.email}</p>
              </div>
            </div>

            {/* Role Badge and Actions */}
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(
                  member.role
                )}`}
              >
                {getRoleIcon(member.role)}
                {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
              </span>

              {/* Actions (only for owners) */}
              {isCurrentUserOwner && member.userId !== currentUserId && (
                <div className="flex items-center gap-1">
                  {member.role !== 'owner' && (
                    <>
                      <button
                        onClick={() => onUpdateRole(member.id, 'owner')}
                        className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                        title="Make owner"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => onRemoveMember(member.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Remove member"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
