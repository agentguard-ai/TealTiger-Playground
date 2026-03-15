// ReportPolicyModal - Report inappropriate policy content
// Requirements: 21.6

import React, { useState, useCallback } from 'react';
import { PolicySharingService } from '../../services/PolicySharingService';

interface ReportPolicyModalProps {
  policyId: string;
  reporterId: string;
  onClose: () => void;
  onSubmitted?: () => void;
}

const REASONS = [
  { value: 'inappropriate' as const, label: 'Inappropriate content' },
  { value: 'malicious' as const, label: 'Malicious policy' },
  { value: 'copyright' as const, label: 'Copyright violation' },
  { value: 'spam' as const, label: 'Spam' },
  { value: 'other' as const, label: 'Other' },
];

export const ReportPolicyModal: React.FC<ReportPolicyModalProps> = ({
  policyId,
  reporterId,
  onClose,
  onSubmitted,
}) => {
  const [reason, setReason] = useState<typeof REASONS[number]['value']>('inappropriate');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    setSubmitting(true);
    try {
      const service = new PolicySharingService();
      await service.reportPolicy({ policyId, reporterId, reason, description: description.trim() });
      onSubmitted?.();
      onClose();
    } catch {
      console.warn('Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  }, [policyId, reporterId, reason, description, onClose, onSubmitted]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-gray-800 border border-gray-700 rounded-lg p-4 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Report policy"
      >
        <h3 className="text-sm font-medium text-white mb-3">Report Policy</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="report-reason" className="block text-xs text-gray-400 mb-1">Reason</label>
            <select
              id="report-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value as any)}
              className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-xs text-white focus:border-teal-500 focus:outline-none"
            >
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="report-description" className="block text-xs text-gray-400 mb-1">Description</label>
            <textarea
              id="report-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue..."
              rows={3}
              className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-xs text-white placeholder-gray-500 focus:border-teal-500 focus:outline-none resize-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !description.trim()}
              className="px-3 py-1.5 text-xs bg-red-700 hover:bg-red-600 text-white rounded transition-colors disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
