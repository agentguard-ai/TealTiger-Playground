// PolicyVersionHistory - Display policy version timeline
// Requirements: 3.6, 3.7

import React, { useState, useEffect } from 'react';
import type { PolicyVersion } from '../../types/policy';
import { policyRegistryService } from '../../services/PolicyRegistryService';

interface PolicyVersionHistoryProps {
  policyId: string;
  currentVersion: string;
  onRevert?: (versionId: string) => void;
  onViewVersion?: (version: PolicyVersion) => void;
}

export const PolicyVersionHistory: React.FC<PolicyVersionHistoryProps> = ({
  policyId,
  currentVersion,
  onRevert,
  onViewVersion
}) => {
  const [versions, setVersions] = useState<PolicyVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVersions();
  }, [policyId]);

  const loadVersions = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await policyRegistryService.listVersions(policyId);
      setVersions(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRevert = async (versionId: string) => {
    if (!confirm('Are you sure you want to revert to this version? This will create a new version with the reverted code.')) {
      return;
    }
    onRevert?.(versionId);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
        <p className="mt-2 text-sm text-gray-600">Loading version history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <div className="policy-version-history">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Version History</h3>

      {versions.length === 0 ? (
        <p className="text-sm text-gray-500">No version history available</p>
      ) : (
        <div className="space-y-4">
          {versions.map((version, index) => {
            const isCurrent = version.version === currentVersion;
            const isLatest = index === 0;

            return (
              <div
                key={version.id}
                className={`relative pl-8 pb-4 ${
                  index !== versions.length - 1 ? 'border-l-2 border-gray-200' : ''
                }`}
              >
                {/* Timeline dot */}
                <div
                  className={`absolute left-0 top-0 -ml-1 w-3 h-3 rounded-full ${
                    isCurrent
                      ? 'bg-teal-600 ring-4 ring-teal-100'
                      : 'bg-gray-300'
                  }`}
                />

                {/* Version card */}
                <div
                  className={`bg-white border rounded-lg p-4 ${
                    isCurrent
                      ? 'border-teal-300 shadow-md'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-gray-900">
                          Version {version.version}
                        </h4>
                        {isCurrent && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-teal-100 text-teal-800 rounded-full">
                            Current
                          </span>
                        )}
                        {isLatest && !isCurrent && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            Latest
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(version.createdAt)}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => onViewVersion?.(version)}
                        className="px-3 py-1 text-xs font-medium text-teal-700 bg-teal-50 rounded hover:bg-teal-100"
                      >
                        View
                      </button>
                      {!isCurrent && (
                        <button
                          onClick={() => handleRevert(version.id)}
                          className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                        >
                          Revert
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Metadata summary */}
                  {version.metadata && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex flex-wrap gap-2 text-xs">
                        {version.metadata.category && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                            {version.metadata.category}
                          </span>
                        )}
                        {version.metadata.tags?.slice(0, 3).map(tag => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-teal-50 text-teal-700 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                        {version.metadata.tags && version.metadata.tags.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded">
                            +{version.metadata.tags.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
