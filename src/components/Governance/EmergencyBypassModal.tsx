// EmergencyBypassModal - Emergency promotion with reason field
// Requirements: 7.8

import React, { useState } from 'react';
import { governanceService } from '../../services/GovernanceService';
import type { PolicyState } from '../../types/policy';

interface EmergencyBypassModalProps {
  isOpen: boolean;
  onClose: () => void;
  policyId: string;
  currentState: PolicyState;
  targetState: PolicyState;
  userId: string;
  onSuccess: () => void;
}

export const EmergencyBypassModal: React.FC<EmergencyBypassModalProps> = ({
  isOpen,
  onClose,
  policyId,
  currentState,
  targetState,
  userId,
  onSuccess
}) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBypass = async () => {
    if (!reason.trim()) {
      setError('Please provide a reason for emergency bypass');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await governanceService.emergencyBypass({
        policyId,
        userId,
        reason: reason.trim(),
        targetState
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to bypass approval');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-red-600">⚠️ Emergency Bypass</h2>
          <p className="mt-1 text-sm text-gray-600">
            This action will bypass approval requirements and will be logged in the audit trail
          </p>
        </div>

        <div className="px-6 py-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
              {error}
            </div>
          )}

          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              <strong>State transition:</strong> {currentState} → {targetState}
            </p>
          </div>

          <div>
            <label htmlFor="bypass-reason" className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Emergency Bypass <span className="text-red-500">*</span>
            </label>
            <textarea
              id="bypass-reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Explain why this emergency bypass is necessary..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
              disabled={loading}
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleBypass}
            disabled={loading || !reason.trim()}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Processing...' : 'Confirm Emergency Bypass'}
          </button>
        </div>
      </div>
    </div>
  );
};
