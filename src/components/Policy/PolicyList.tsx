// PolicyList - Display and search policies
// Requirements: 3.5, 3.6

import React, { useState, useEffect } from 'react';
import { Policy, PolicyFilters, PolicyState } from '../../types/policy';
import { policyRegistryService } from '../../services/PolicyRegistryService';
import { PolicyCard } from './PolicyCard';

interface PolicyListProps {
  workspaceId: string;
  onSelectPolicy?: (policy: Policy) => void;
}

export const PolicyList: React.FC<PolicyListProps> = ({ workspaceId, onSelectPolicy }) => {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<PolicyFilters>({});

  useEffect(() => {
    loadPolicies();
  }, [workspaceId, searchQuery, filters]);

  const loadPolicies = async () => {
    try {
      setLoading(true);
      setError(null);

      let result: Policy[];
      if (searchQuery || Object.keys(filters).length > 0) {
        result = await policyRegistryService.searchPolicies({
          workspaceId,
          query: searchQuery,
          filters
        });
      } else {
        result = await policyRegistryService.listPolicies(workspaceId);
      }

      setPolicies(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleStateFilter = (state: PolicyState | '') => {
    setFilters(prev => ({
      ...prev,
      state: state || undefined
    }));
  };

  return (
    <div className="policy-list">
      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search policies by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
          <button
            onClick={loadPolicies}
            className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            Search
          </button>
        </div>

        {/* State Filter */}
        <div className="flex gap-2 items-center">
          <span className="text-sm font-medium text-gray-700">Filter by state:</span>
          <select
            value={filters.state || ''}
            onChange={(e) => handleStateFilter(e.target.value as PolicyState | '')}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="">All States</option>
            <option value="draft">Draft</option>
            <option value="review">Review</option>
            <option value="approved">Approved</option>
            <option value="production">Production</option>
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          <p className="mt-2 text-gray-600">Loading policies...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && policies.length === 0 && (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No policies found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchQuery || Object.keys(filters).length > 0
              ? 'Try adjusting your search or filters'
              : 'Get started by creating a new policy'}
          </p>
        </div>
      )}

      {/* Policy Grid */}
      {!loading && !error && policies.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {policies.map((policy) => (
            <PolicyCard
              key={policy.id}
              policy={policy}
              onClick={() => onSelectPolicy?.(policy)}
            />
          ))}
        </div>
      )}

      {/* Results Count */}
      {!loading && !error && policies.length > 0 && (
        <div className="mt-4 text-sm text-gray-600 text-center">
          Showing {policies.length} {policies.length === 1 ? 'policy' : 'policies'}
        </div>
      )}
    </div>
  );
};
