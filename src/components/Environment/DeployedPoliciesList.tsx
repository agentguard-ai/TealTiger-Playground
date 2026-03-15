import React from 'react';
import type { DeployedPolicy } from '../../types/environment';
import type { Policy } from '../../types/policy';

interface DeployedPoliciesListProps {
  deployedPolicies: DeployedPolicy[];
  policies: Policy[];
  onViewPolicy: (policyId: string) => void;
  onRollback?: (policyId: string) => void;
}

export const DeployedPoliciesList: React.FC<DeployedPoliciesListProps> = ({
  deployedPolicies,
  policies,
  onViewPolicy,
  onRollback,
}) => {
  const getPolicyName = (policyId: string) => {
    const policy = policies.find((p) => p.id === policyId);
    return policy?.name || 'Unknown Policy';
  };

  const activePolicies = deployedPolicies.filter((p) => p.status === 'active');
  const inactivePolicies = deployedPolicies.filter((p) => p.status === 'inactive');

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Deployed Policies</h3>
        <p className="text-sm text-gray-600 mt-1">
          {activePolicies.length} active, {inactivePolicies.length} inactive
        </p>
      </div>

      <div className="divide-y divide-gray-200">
        {deployedPolicies.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <svg
              className="w-12 h-12 text-gray-400 mx-auto mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-sm text-gray-600">No policies deployed to this environment</p>
          </div>
        ) : (
          <>
            {/* Active Policies */}
            {activePolicies.length > 0 && (
              <div>
                <div className="px-6 py-3 bg-gray-50">
                  <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Active
                  </h4>
                </div>
                {activePolicies.map((deployed) => (
                  <div key={deployed.versionId} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-2 h-2 bg-green-500 rounded-full" />
                          <h4 className="font-medium text-gray-900">
                            {getPolicyName(deployed.policyId)}
                          </h4>
                          <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
                            Active
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>Version: {deployed.versionId.substring(0, 8)}...</p>
                          <p>Deployed: {formatDate(deployed.deployedAt)}</p>
                          <p>By: {deployed.deployedBy}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => onViewPolicy(deployed.policyId)}
                          className="px-3 py-1.5 text-sm text-teal-600 hover:text-teal-700 border border-teal-300 rounded-md hover:bg-teal-50 transition-colors"
                        >
                          View
                        </button>
                        {onRollback && inactivePolicies.length > 0 && (
                          <button
                            onClick={() => onRollback(deployed.policyId)}
                            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                          >
                            Rollback
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Inactive Policies */}
            {inactivePolicies.length > 0 && (
              <div>
                <div className="px-6 py-3 bg-gray-50">
                  <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Previous Versions
                  </h4>
                </div>
                {inactivePolicies
                  .sort((a, b) => b.deployedAt.getTime() - a.deployedAt.getTime())
                  .slice(0, 5)
                  .map((deployed) => (
                    <div key={deployed.versionId} className="px-6 py-3 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="w-2 h-2 bg-gray-400 rounded-full" />
                            <h4 className="font-medium text-gray-700">
                              {getPolicyName(deployed.policyId)}
                            </h4>
                            <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                              Inactive
                            </span>
                          </div>
                          <div className="text-sm text-gray-500 space-y-1">
                            <p>Version: {deployed.versionId.substring(0, 8)}...</p>
                            <p>Deployed: {formatDate(deployed.deployedAt)}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => onViewPolicy(deployed.policyId)}
                          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                {inactivePolicies.length > 5 && (
                  <div className="px-6 py-3 text-center">
                    <p className="text-sm text-gray-500">
                      +{inactivePolicies.length - 5} more previous versions
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
