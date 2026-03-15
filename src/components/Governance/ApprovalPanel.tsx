// ApprovalPanel - Show approver list and approval status
// Requirements: 7.4, 7.5

import React, { useEffect, useState } from 'react';
import { governanceService } from '../../services/GovernanceService';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import type { GovernanceWorkflow, PolicyApproval } from '../../types/governance';

interface ApprovalPanelProps {
  policyId: string;
  currentUserId: string;
  onApprovalChange?: () => void;
}

interface ApprovalWithUser extends PolicyApproval {
  approverUsername: string;
  approverAvatar: string;
}

export const ApprovalPanel: React.FC<ApprovalPanelProps> = ({
  policyId,
  currentUserId,
  onApprovalChange
}) => {
  const [workflow, setWorkflow] = useState<GovernanceWorkflow | null>(null);
  const [approvalsWithUsers, setApprovalsWithUsers] = useState<ApprovalWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadApprovalStatus();
  }, [policyId]);

  const loadApprovalStatus = async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    try {
      const workflowData = await governanceService.getApprovalStatus(policyId);
      setWorkflow(workflowData);

      // Load user details for approvers
      if (workflowData.approvals.length > 0) {
        const approverIds = workflowData.approvals.map(a => a.approverId);
        const { data: users, error: usersError } = await supabase!
          .from('users')
          .select('id, username, avatar_url')
          .in('id', approverIds);

        if (usersError) throw usersError;

        const approvalsWithUserData = workflowData.approvals.map(approval => {
          const user = users.find(u => u.id === approval.approverId);
          return {
            ...approval,
            approverUsername: user?.username || 'Unknown',
            approverAvatar: user?.avatar_url || ''
          };
        });

        setApprovalsWithUsers(approvalsWithUserData);
      }
    } catch (err) {
      console.error('Failed to load approval status:', err);
      setError('Failed to load approval status');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
        {error}
      </div>
    );
  }

  if (!workflow || approvalsWithUsers.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg text-gray-600 text-sm">
        No approval requests yet
      </div>
    );
  }

  const approvedCount = approvalsWithUsers.filter(a => a.status === 'approved').length;
  const rejectedCount = approvalsWithUsers.filter(a => a.status === 'rejected').length;
  const pendingCount = approvalsWithUsers.filter(a => a.status === 'pending').length;

  return (
    <div className="space-y-4">
      {/* Status Summary */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-gray-900">Approval Status</h3>
          {workflow.canPromote ? (
            <span className="text-sm text-green-600 font-medium">✓ Ready to promote</span>
          ) : (
            <span className="text-sm text-gray-600">
              {approvedCount} / {workflow.requiredApprovals} required
            </span>
          )}
        </div>

        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            <span className="text-gray-600">{approvedCount} Approved</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span className="text-gray-600">{rejectedCount} Rejected</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
            <span className="text-gray-600">{pendingCount} Pending</span>
          </div>
        </div>
      </div>

      {/* Approvals List */}
      <div className="space-y-2">
        {approvalsWithUsers.map(approval => (
          <div
            key={approval.id}
            className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <img
                src={approval.approverAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(approval.approverUsername)}`}
                alt={approval.approverUsername}
                className="w-10 h-10 rounded-full"
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900">{approval.approverUsername}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      approval.status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : approval.status === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {approval.status}
                  </span>
                </div>

                {approval.comment && (
                  <p className="text-sm text-gray-600 mt-1">{approval.comment}</p>
                )}

                <div className="text-xs text-gray-500 mt-1">
                  {approval.decidedAt
                    ? `Decided ${new Date(approval.decidedAt).toLocaleDateString()}`
                    : `Requested ${new Date(approval.createdAt).toLocaleDateString()}`}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
