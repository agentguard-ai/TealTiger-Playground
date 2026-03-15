import React, { useState } from 'react';
import type { DeployedPolicy } from '../../types/environment';

interface RollbackButtonProps {
  policyId: string;
  policyName: string;
  deploymentHistory: DeployedPolicy[];
  onRollback: (policyId: string) => Promise<void>;
}

export const RollbackButton: React.FC<RollbackButtonProps> = ({
  policyId,
  policyName,
  deploymentHistory,
  onRollback,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get previous versions (inactive ones, sorted by deployment date)
  const previousVersions = deploymentHistory
    .filter((p) => p.policyId === policyId && p.status === 'inactive')
    .sort((a, b) => b.deployedAt.getTime() - a.deployedAt.getTime());

  const currentVersion = deploymentHistory.find(
    (p) => p.policyId === policyId && p.status === 'active'
  );

  if (previousVersions.length === 0) {
    return null; // No previous versions to rollback to
  }

  const handleRollback = async () => {
    setIsRollingBack(true);
    setError(null);

    try {
      await onRollback(policyId);
      setIsOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to rollback policy');
    } finally {
      setIsRollingBack(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
          />
        </svg>
        Rollback
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Rollback Policy</h2>
                <button
                  onClick={() => setIsOpen(false)}
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
                  <p className="text-sm text-gray-600 mb-2">
                    Rollback <span className="font-medium text-gray-900">{policyName}</span> to the
                    previous version?
                  </p>
                </div>

                <div className="bg-gray-50 rounded-md p-3 space-y-3">
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1">Current Version</p>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full" />
                      <span className="text-sm text-gray-900">
                        {currentVersion?.versionId.substring(0, 8)}...
                      </span>
                      <span className="text-xs text-gray-500">
                        (deployed {currentVersion && formatDate(currentVersion.deployedAt)})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 14l-7 7m0 0l-7-7m7 7V3"
                      />
                    </svg>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1">Previous Version</p>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-gray-400 rounded-full" />
                      <span className="text-sm text-gray-900">
                        {previousVersions[0].versionId.substring(0, 8)}...
                      </span>
                      <span className="text-xs text-gray-500">
                        (deployed {formatDate(previousVersions[0].deployedAt)})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <div className="flex gap-2">
                    <svg
                      className="w-5 h-5 text-yellow-600 flex-shrink-0"
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
                    <p className="text-sm text-yellow-700">
                      This will reactivate the previous version and deactivate the current one. You
                      can rollback again if needed.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg flex gap-3 justify-end">
              <button
                onClick={() => setIsOpen(false)}
                disabled={isRollingBack}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleRollback}
                disabled={isRollingBack}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRollingBack ? 'Rolling Back...' : 'Rollback'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
