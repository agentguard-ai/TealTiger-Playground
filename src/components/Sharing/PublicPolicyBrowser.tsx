// PublicPolicyBrowser - Browse and search public policies
// Requirements: 21.1-21.10

import React, { useState, useEffect, useCallback } from 'react';
import { PolicySharingService } from '../../services/PolicySharingService';
import type { SharedPolicy, PolicySearchFilters } from '../../types/sharing';
import { PolicyPopularityBadge } from './PolicyPopularityBadge';
import { PolicyQualityIndicators } from './PolicyQualityIndicators';

interface PublicPolicyBrowserProps {
  workspaceId: string;
  userId: string;
  onFork?: (policyId: string) => void;
}

const SORT_OPTIONS: { value: PolicySearchFilters['sortBy']; label: string }[] = [
  { value: 'stars', label: '⭐ Stars' },
  { value: 'forks', label: '🔀 Forks' },
  { value: 'recent', label: '🕐 Recent' },
  { value: 'views', label: '👁️ Views' },
];

export const PublicPolicyBrowser: React.FC<PublicPolicyBrowserProps> = ({
  workspaceId,
  userId,
  onFork,
}) => {
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<PolicySearchFilters['sortBy']>('stars');
  const [policies, setPolicies] = useState<SharedPolicy[]>([]);
  const [loading, setLoading] = useState(true);

  const search = useCallback(async () => {
    setLoading(true);
    try {
      const service = new PolicySharingService();
      const results = await service.searchPublicPolicies({
        query: query || undefined,
        sortBy,
        limit: 20,
      });
      setPolicies(results);
    } catch {
      console.warn('Search failed');
    } finally {
      setLoading(false);
    }
  }, [query, sortBy]);

  useEffect(() => {
    search();
  }, [search]);

  const handleFork = useCallback(async (policyId: string) => {
    const service = new PolicySharingService();
    const newId = await service.forkPolicy(policyId, workspaceId, userId);
    if (newId) onFork?.(newId);
  }, [workspaceId, userId, onFork]);

  const handleStar = useCallback(async (policyId: string) => {
    const service = new PolicySharingService();
    await service.starPolicy(policyId, userId);
    search(); // Refresh
  }, [userId, search]);

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search public policies..."
          className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:border-teal-500 focus:outline-none"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-xs text-white focus:border-teal-500 focus:outline-none"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center text-gray-400 text-sm py-8">Loading...</div>
      ) : policies.length === 0 ? (
        <div className="text-center text-gray-500 text-sm py-8">No public policies found</div>
      ) : (
        <div className="space-y-2">
          {policies.map((policy) => (
            <div key={policy.id} className="bg-gray-800 border border-gray-700 rounded p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-medium truncate">{policy.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5 line-clamp-2">{policy.description}</div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-gray-500">by {policy.author}</span>
                    <PolicyPopularityBadge stars={policy.stars} forks={policy.forks} views={policy.views} />
                  </div>
                  <div className="mt-1.5">
                    <PolicyQualityIndicators testCoverage={policy.testCoverage} approvalStatus={policy.approvalStatus} />
                  </div>
                  {policy.tags.length > 0 && (
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {policy.tags.slice(0, 4).map((tag) => (
                        <span key={tag} className="px-1.5 py-0.5 text-xs bg-gray-700 text-gray-400 rounded">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1 ml-3">
                  <button
                    onClick={() => handleStar(policy.policyId)}
                    className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-yellow-400 rounded transition-colors"
                  >
                    ⭐ Star
                  </button>
                  <button
                    onClick={() => handleFork(policy.policyId)}
                    className="px-2 py-1 text-xs bg-teal-700 hover:bg-teal-600 text-white rounded transition-colors"
                  >
                    🔀 Fork
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
