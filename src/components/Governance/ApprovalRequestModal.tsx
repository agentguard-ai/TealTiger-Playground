// ApprovalRequestModal - Request approval from team members
// Requirements: 7.2, 7.3, 7.6

import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { governanceService } from '../../services/GovernanceService';

interface ApprovalRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  policyId: string;
  versionId: string;
  workspaceId: string;
  userId: string;
}

interface WorkspaceMember {
  id: string;
  userId: string;
  username: string;
  email: string;
  avatarUrl: string;
  role: string;
}

export const ApprovalRequestModal: React.FC<ApprovalRequestModalProps> = ({
  isOpen,
  onClose,
  policyId,
  versionId,
  workspaceId,
  userId
}) => {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [selectedApprovers, setSelectedApprovers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && isSupabaseConfigured()) {
      loadWorkspaceMembers();
    }
  }, [isOpen, workspaceId]);

  const loadWorkspaceMembers = async () => {
    try {
      const { data, error } = await supabase!
        .from('workspace_members')
        .select(`
          id,
          user_id,
          role,
          users (
            id,
            username,
            email,
            avatar_url
          )
        `)
        .eq('workspace_id', workspaceId)
        .neq('user_id', userId); // Exclude current user

      if (error) throw error;

      const mappedMembers = data.map((m: any) => ({
        id: m.id,
        userId: m.user_id,
        username: m.users.username,
        email: m.users.email,
        avatarUrl: m.users.avatar_url,
        role: m.role
      }));

      setMembers(mappedMembers);
    } catch (err) {
      console.error('Failed to load workspace members:', err);
      setError('Failed to load team members');
    }
  };

  const handleToggleApprover = (userId: string) => {
    setSelectedApprovers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleRequestApproval = async () => {
    if (selectedApprovers.length === 0) {
      setError('Please select at least one approver');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await governanceService.requestApproval({
        policyId,
        versionId,
        approverIds: selectedApprovers,
        userId
      });

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request approval');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Request Approval</h2>
          <p className="mt-1 text-sm text-gray-600">
            Select team members to review and approve this policy
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[50vh]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
              {error}
            </div>
          )}

          {members.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No team members available for approval
            </div>
          ) : (
            <div className="space-y-2">
              {members.map(member => (
                <label
                  key={member.userId}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedApprovers.includes(member.userId)}
                    onChange={() => handleToggleApprover(member.userId)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  
                  <img
                    src={member.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.username)}`}
                    alt={member.username}
                    className="w-10 h-10 rounded-full"
                  />
                  
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{member.username}</div>
                    <div className="text-sm text-gray-500">{member.email}</div>
                  </div>
                  
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                    {member.role}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {selectedApprovers.length} approver{selectedApprovers.length !== 1 ? 's' : ''} selected
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleRequestApproval}
              disabled={loading || selectedApprovers.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Requesting...' : 'Request Approval'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
