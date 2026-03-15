import React, { useState } from 'react';
import type { Policy, PolicyVersion } from '../../types/policy';
import type { EnvironmentName } from '../../types/environment';
import { ENVIRONMENT_LABELS } from '../../types/environment';

interface PolicyPromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  policy: Policy;
  version: PolicyVersion;
  targetEnvironment: EnvironmentName;
  onPromote: (policyId: string, versionId: string, targetEnvironment: EnvironmentName) => Promise<void>;
}

export const PolicyPromotionModal: React.FC<PolicyPromotionModalProps> = ({
  isOpen,
  onClose,
  policy,
  version,
  targetEnvironment,
  onPromote,
}) => {
  const [isPromoting, setIsPromoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  if (!isOpen) return null;

  const handlePromote = async () => {
    if (!confirmed && targetEnvironment === 'production') {
      return;
    }

    setIsPromoting(true);
    setError(null);

    try {
      await onPromote(policy.id, version.id, targetEnvironment);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to promote policy');
    } finally {
      setIsPromoting(false);
    }
  };

  const getEnvironmentColor = (name: EnvironmentName) => {
    const colorMap = {
      development: 'text-blue-700',
      staging: 'text-yellow-700',
      production: 'text-red-700',
    };
    return colorMap[name];
  };

  const isProduction = targetEnvironment === 'production';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Promote Policy</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-6 py-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">You are about to promote:</p>
              <div className="bg-gray-50 rounded-md p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">Policy:</span>
                  <span className="text-sm text-gray-900">{policy.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">Version:</span>
                  <span className="text-sm text-gray-900">{version.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">Target:</span>
                  <span className={`text-sm font-semibold ${getEnvironmentColor(targetEnvironment)}`}>
                    {ENVIRONMENT_LABELS[targetEnvironment]}
                  </span>
                </div>
              </div>
            </div>

            {isProduction && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex gap-3">
                  <svg
                    className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <div>
                    <h4 className="text-sm font-semibold text-red-900 mb-1">
                      Production Deployment Warning
                    </h4>
                    <p className="text-sm text-red-700 mb-3">
                      This will deploy the policy to production. This action will affect live traffic
                      and cannot be undone automatically.
                    </p>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={confirmed}
                        onChange={(e) => setConfirmed(e.target.checked)}
                        className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                      />
                      <span className="text-sm text-red-900">
                        I understand and want to proceed with production deployment
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <div className="flex gap-2">
                <svg
                  className="w-5 h-5 text-blue-600 flex-shrink-0"
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
                <p className="text-sm text-blue-700">
                  The current active version in this environment will be deactivated. You can
                  rollback to it if needed.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isPromoting}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handlePromote}
            disabled={isPromoting || (isProduction && !confirmed)}
            className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPromoting ? 'Promoting...' : 'Promote to ' + ENVIRONMENT_LABELS[targetEnvironment]}
          </button>
        </div>
      </div>
    </div>
  );
};
