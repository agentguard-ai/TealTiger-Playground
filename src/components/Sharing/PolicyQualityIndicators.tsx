// PolicyQualityIndicators - Shows test coverage and approval status
// Requirements: 21.8

import React from 'react';

interface PolicyQualityIndicatorsProps {
  testCoverage: number;
  approvalStatus: 'draft' | 'approved' | 'production';
}

const STATUS_STYLES = {
  draft: { bg: 'bg-gray-600', text: 'Draft' },
  approved: { bg: 'bg-green-600', text: 'Approved' },
  production: { bg: 'bg-blue-600', text: 'Production' },
};

export const PolicyQualityIndicators: React.FC<PolicyQualityIndicatorsProps> = ({
  testCoverage,
  approvalStatus,
}) => {
  const status = STATUS_STYLES[approvalStatus];
  const coverageColor = testCoverage >= 80 ? 'text-green-400' : testCoverage >= 50 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="flex items-center gap-2">
      <span className={`px-1.5 py-0.5 text-xs rounded ${status.bg} text-white`}>
        {status.text}
      </span>
      <span className={`text-xs ${coverageColor}`}>
        {testCoverage}% covered
      </span>
    </div>
  );
};
