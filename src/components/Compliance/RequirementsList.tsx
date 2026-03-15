import React from 'react';
import type { ComplianceRequirement } from '../../types/compliance';

interface RequirementsListProps {
  requirements: ComplianceRequirement[];
  mappedRequirementIds: Set<string>;
  onRequirementClick: (requirement: ComplianceRequirement) => void;
  selectedRequirementId?: string;
}

export const RequirementsList: React.FC<RequirementsListProps> = ({
  requirements,
  mappedRequirementIds,
  onRequirementClick,
  selectedRequirementId,
}) => {
  // Group requirements by category
  const groupedRequirements = requirements.reduce((acc, req) => {
    if (!acc[req.category]) {
      acc[req.category] = [];
    }
    acc[req.category].push(req);
    return acc;
  }, {} as Record<string, ComplianceRequirement[]>);

  const categories = Object.keys(groupedRequirements).sort();

  return (
    <div className="space-y-4">
      {categories.map((category) => (
        <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <h3 className="font-medium text-gray-900">{category}</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {groupedRequirements[category].map((requirement) => {
              const isMapped = mappedRequirementIds.has(requirement.id);
              const isSelected = requirement.id === selectedRequirementId;

              return (
                <button
                  key={requirement.id}
                  onClick={() => onRequirementClick(requirement)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                    isSelected ? 'bg-teal-50 border-l-4 border-teal-500' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {isMapped ? (
                        <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                          <svg
                            className="w-3 h-3 text-green-600"
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
                        </div>
                      ) : (
                        <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center">
                          <svg
                            className="w-3 h-3 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {requirement.code}
                        </span>
                        {isMapped && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            Mapped
                          </span>
                        )}
                      </div>
                      <h4 className="font-medium text-gray-900 mb-1">
                        {requirement.title}
                      </h4>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {requirement.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {categories.length === 0 && (
        <div className="text-center py-8 text-gray-500">
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p>No requirements found</p>
        </div>
      )}
    </div>
  );
};
