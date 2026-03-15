import React, { useState, useEffect, useRef } from 'react';
import { WorkspaceRole } from '../../types/workspace';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (emailOrUsername: string, role: WorkspaceRole) => Promise<void>;
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [role, setRole] = useState<WorkspaceRole>(WorkspaceRole.Viewer);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
    if (isOpen) {
      setEmailOrUsername('');
      setRole(WorkspaceRole.Viewer);
      setError('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = emailOrUsername.trim();

    if (!trimmed) {
      setError('Email or GitHub username is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onSubmit(trimmed, role);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to invite member');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-member-title"
      >
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 id="invite-member-title" className="text-lg font-semibold text-gray-900">
            Invite Team Member
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Invite a user by their email address or GitHub username.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label
              htmlFor="email-or-username"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email or GitHub Username
            </label>
            <input
              ref={inputRef}
              id="email-or-username"
              type="text"
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              placeholder="user@example.com or github-username"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as WorkspaceRole)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              disabled={isSubmitting}
            >
              <option value={WorkspaceRole.Viewer}>Viewer - Read-only access</option>
              <option value={WorkspaceRole.Editor}>Editor - Can manage policies</option>
              <option value={WorkspaceRole.Owner}>Owner - Full control</option>
            </select>
          </div>

          {/* Role Descriptions */}
          <div className="bg-gray-50 rounded-md p-3 text-xs text-gray-600 space-y-2">
            <div className="flex items-start gap-2">
              <svg
                className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <p className="font-medium text-gray-700">Role Permissions:</p>
                <ul className="mt-1 space-y-1">
                  <li>
                    <strong>Owner:</strong> Manage members, settings, and all policies
                  </li>
                  <li>
                    <strong>Editor:</strong> Create, edit, and delete policies
                  </li>
                  <li>
                    <strong>Viewer:</strong> View policies and run evaluations
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm text-white bg-teal-600 rounded-md hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Inviting...' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
