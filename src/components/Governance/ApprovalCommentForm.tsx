// ApprovalCommentForm - Add comments when approving/rejecting
// Requirements: 7.4

import React, { useState } from 'react';
import { governanceService } from '../../services/GovernanceService';

interface ApprovalCommentFormProps {
  policyId: string;
  versionId: string;
  approverId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const ApprovalCommentForm: React.FC<ApprovalCommentFormProps> = ({
  policyId,
  versionId,
  approverId,
  onSuccess,
  onCancel
}) => {
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async () => {
    if (!comment.trim()) {
      setError('Please provide a comment');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await governanceService.approvePolicy({
        policyId,
        versionId,
        approverId,
        comment: comment.trim()
      });

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve policy');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!comment.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await governanceService.rejectPolicy({
        policyId,
        versionId,
        approverId,
        reason: comment.trim()
      });

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject policy');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="approval-comment" className="block text-sm font-medium text-gray-700 mb-2">
          Comment <span className="text-red-500">*</span>
        </label>
        <textarea
          id="approval-comment"
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Provide your feedback or reason for decision..."
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          disabled={loading}
        />
        <p className="mt-1 text-xs text-gray-500">
          Your comment will be visible to all team members
        </p>
      </div>

      <div className="flex gap-3 justify-end">
        <button
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleReject}
          disabled={loading || !comment.trim()}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Rejecting...' : 'Reject'}
        </button>
        <button
          onClick={handleApprove}
          disabled={loading || !comment.trim()}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Approving...' : 'Approve'}
        </button>
      </div>
    </div>
  );
};
