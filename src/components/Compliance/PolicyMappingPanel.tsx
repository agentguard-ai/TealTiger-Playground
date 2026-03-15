import React, { useState } from 'react';
import type { Policy } from '../../types/policy';
import type { ComplianceRequirement, ComplianceMapping } from '../../types/compliance';

interface PolicyMappingPanelProps {
  requirement: ComplianceRequirement | null;
  policies: Policy[];
  existingMappings: ComplianceMapping[];
  onMapPolicy: (policyId: string, notes: string) => Promise<void>;
  onUnmapPolicy: (mappingId: string) => Promise<void>;
  isLoading?: boolean;
}

export const PolicyMappingPanel: React.FC<PolicyMappingPanelProps> = ({
  requirement,
  policies,
  existingMappings,
  onMapPolicy,
  onUnmapPolicy,
  isLoading = false,
}) => {
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!requirement) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="text-center text-gray-500">
          <svg
            className="w-12 h-12 mx-auto mb-3 text-gray-400"
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
          <p>Select a requirement to map policies</p>
        </div>
      </div>
    );
  }

  const mappedPolicyIds = new Set(existingMappings.map(m => m.policyId));
  const availablePolicies = policies.filter(p => !mappedPolicyIds.has(p.id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPolicyId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await onMapPolicy(selectedPolicyId, notes);
      setSelectedPolicyId('');
      setNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create mapping');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnmap = async (mappingId: string) => {
    if (!confirm('Are you sure you want to remove this mapping?')) return;

    try {
      await onUnmapPolicy(mappingId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove mapping');
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      {/* Requirement Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-5 h-5 text-teal-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                {requirement.code}
              </span>
              <span className="text-xs text-gray-500">{requirement.category}</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{requirement.title}</h3>
            <p className="text-sm text-gray-600">{requirement.description}</p>
          </div>
        </div>
      </div>

      {/* Existing Mappings */}
      {existingMappings.length > 0 && (
        <div className="border-b border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Mapped Policies</h4>
          <div className="space-y-2">
            {existingMappings.map((mapping) => {
              const policy = policies.find(p => p.id === mapping.policyId);
              return (
                <div
                  key={mapping.id}
                  className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-md"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900">{policy?.name || 'Unknown Policy'}</div>
                    {mapping.notes && (
                      <p className="text-sm text-gray-600 mt-1">{mapping.notes}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleUnmap(mapping.id)}
                    className="flex-shrink-0 text-red-600 hover:text-red-700 transition-colors"
                    title="Remove mapping"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add New Mapping Form */}
      <div className="p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Map New Policy</h4>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="policy-select" className="block text-sm font-medium text-gray-700 mb-1">
              Select Policy
            </label>
            <select
              id="policy-select"
              value={selectedPolicyId}
              onChange={(e) => setSelectedPolicyId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              disabled={isSubmitting || availablePolicies.length === 0}
            >
              <option value="">Choose a policy...</option>
              {availablePolicies.map((policy) => (
                <option key={policy.id} value={policy.id}>
                  {policy.name} (v{policy.currentVersion})
                </option>
              ))}
            </select>
            {availablePolicies.length === 0 && (
              <p className="mt-1 text-sm text-gray-500">
                All policies are already mapped to this requirement
              </p>
            )}
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Add notes about how this policy addresses the requirement..."
              disabled={isSubmitting}
            />
          </div>

          <button
            type="submit"
            disabled={!selectedPolicyId || isSubmitting || availablePolicies.length === 0}
            className="w-full px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isSubmitting ? 'Mapping...' : 'Map Policy'}
          </button>
        </form>
      </div>
    </div>
  );
};
