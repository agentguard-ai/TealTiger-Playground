import React from 'react';
import type { ComplianceRequirement } from '../../types/compliance';

interface UnmappedRequirementsAlertProps {
  unmappedRequirements: ComplianceRequirement[];
  onRequirementClick: (requirement: ComplianceRequirement) => void;
}

export const UnmappedRequirementsAlert: React.FC<UnmappedRequirementsAlertProps> = ({
  unmappedRequirements,
  onRequirementClick,
}) => {
  if (unmappedRequirements.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg
              className="w-5 h-5 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-medium text-green-900">Complete Coverage</h3>
            <p className="text-sm text-green-700 mt-1">
              All requirements are mapped to policies. Great work!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg
            className="w-5 h-5 text-yellow-600"
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
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-yellow-900">
            {unmappedRequirements.length} Unmapped Requirement{unmappedRequirements.length !== 1 ? 's' : ''}
          </h3>
          <p className="text-sm text-yellow-700 mt-1 mb-3">
            The following requirements don't have any policies mapped yet:
          </p>
          <div className="space-y-2">
            {unmappedRequirements.slice(0, 5).map((req) => (
              <button
                key={req.id}
                onClick={() => onRequirementClick(req)}
                className="w-full text-left p-2 bg-white border border-yellow-200 rounded hover:bg-yellow-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                    {req.code}
                  </span>
                  <span className="text-sm font-medium text-gray-900">{req.title}</span>
                </div>
              </button>
            ))}
            {unmappedRequirements.length > 5 && (
              <p className="text-sm text-yellow-700 italic">
                ...and {unmappedRequirements.length - 5} more
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
