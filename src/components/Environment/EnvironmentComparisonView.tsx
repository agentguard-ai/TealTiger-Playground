import React from 'react';
import type { DeploymentEnvironment } from '../../types/environment';
import type { Policy } from '../../types/policy';
import { ENVIRONMENT_LABELS } from '../../types/environment';

interface EnvironmentComparisonViewProps {
  environments: DeploymentEnvironment[];
  policies: Policy[];
}

export const EnvironmentComparisonView: React.FC<EnvironmentComparisonViewProps> = ({
  environments,
  policies,
}) => {
  const getPolicyName = (policyId: string) => {
    const policy = policies.find((p) => p.id === policyId);
    return policy?.name || 'Unknown Policy';
  };

  const getActiveVersion = (env: DeploymentEnvironment, policyId: string) => {
    const deployed = env.deployedPolicies.find(
      (p) => p.policyId === policyId && p.status === 'active'
    );
    return deployed?.versionId.substring(0, 8) || '-';
  };

  // Get all unique policy IDs across all environments
  const allPolicyIds = Array.from(
    new Set(
      environments.flatMap((env) =>
        env.deployedPolicies.filter((p) => p.status === 'active').map((p) => p.policyId)
      )
    )
  );

  const sortedEnvironments = [...environments].sort((a, b) => {
    const order = { development: 0, staging: 1, production: 2 };
    return order[a.name] - order[b.name];
  });

  const getEnvironmentBadgeColor = (name: string) => {
    const colorMap = {
      development: 'bg-blue-100 text-blue-700',
      staging: 'bg-yellow-100 text-yellow-700',
      production: 'bg-red-100 text-red-700',
    };
    return colorMap[name as keyof typeof colorMap] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Environment Comparison</h3>
        <p className="text-sm text-gray-600 mt-1">
          Compare deployed policy versions across environments
        </p>
      </div>

      {allPolicyIds.length === 0 ? (
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
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <p className="text-sm text-gray-600">No policies deployed to any environment</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                  Policy
                </th>
                {sortedEnvironments.map((env) => (
                  <th
                    key={env.id}
                    className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span>{ENVIRONMENT_LABELS[env.name]}</span>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded ${getEnvironmentBadgeColor(
                          env.name
                        )}`}
                      >
                        {env.deployedPolicies.filter((p) => p.status === 'active').length} active
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {allPolicyIds.map((policyId) => {
                const versions = sortedEnvironments.map((env) =>
                  getActiveVersion(env, policyId)
                );
                const allSame = versions.every((v) => v === versions[0] && v !== '-');
                const hasDeployment = versions.some((v) => v !== '-');

                return (
                  <tr key={policyId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 sticky left-0 bg-white">
                      <div className="flex items-center gap-2">
                        {allSame && hasDeployment && (
                          <svg
                            className="w-4 h-4 text-green-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                        {!allSame && hasDeployment && (
                          <svg
                            className="w-4 h-4 text-yellow-500"
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
                        )}
                        {getPolicyName(policyId)}
                      </div>
                    </td>
                    {sortedEnvironments.map((env) => {
                      const version = getActiveVersion(env, policyId);
                      const isDeployed = version !== '-';
                      const isDifferent =
                        isDeployed && versions.some((v) => v !== version && v !== '-');

                      return (
                        <td
                          key={env.id}
                          className={`px-6 py-4 text-sm text-center ${
                            isDifferent ? 'bg-yellow-50' : ''
                          }`}
                        >
                          {isDeployed ? (
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-md font-mono text-xs ${
                                isDifferent
                                  ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                                  : 'bg-gray-100 text-gray-700 border border-gray-300'
                              }`}
                            >
                              {version}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center gap-6 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>Same version across all environments</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span>Different versions deployed</span>
          </div>
        </div>
      </div>
    </div>
  );
};
