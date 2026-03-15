// ReportGeneratorPanel - Panel with filters and generation controls
// Requirements: 9.1, 9.6

import React, { useState } from 'react';
import type { ReportFilters } from '../../types/compliance-report';
import type { ComplianceFramework } from '../../types/compliance';
import { PolicyState } from '../../types/policy';

interface ReportGeneratorPanelProps {
  frameworks: ComplianceFramework[];
  selectedFrameworkId: string;
  onFrameworkChange: (frameworkId: string) => void;
  onGenerateReport: (filters: ReportFilters) => void;
  isGenerating: boolean;
}

export const ReportGeneratorPanel: React.FC<ReportGeneratorPanelProps> = ({
  frameworks,
  selectedFrameworkId,
  onFrameworkChange,
  onGenerateReport,
  isGenerating
}) => {
  const [filters, setFilters] = useState<ReportFilters>({});
  const [dateRangeEnabled, setDateRangeEnabled] = useState(false);

  const handleGenerateClick = () => {
    onGenerateReport(filters);
  };

  const handleDateRangeToggle = (enabled: boolean) => {
    setDateRangeEnabled(enabled);
    if (!enabled) {
      setFilters(prev => ({ ...prev, dateRange: undefined }));
    }
  };

  const handleStartDateChange = (date: string) => {
    setFilters(prev => ({
      ...prev,
      dateRange: {
        start: new Date(date),
        end: prev.dateRange?.end || new Date()
      }
    }));
  };

  const handleEndDateChange = (date: string) => {
    setFilters(prev => ({
      ...prev,
      dateRange: {
        start: prev.dateRange?.start || new Date(),
        end: new Date(date)
      }
    }));
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Generate Compliance Report
      </h2>

      <div className="space-y-4">
        {/* Framework Selection */}
        <div>
          <label htmlFor="framework" className="block text-sm font-medium text-gray-700 mb-1">
            Compliance Framework
          </label>
          <select
            id="framework"
            value={selectedFrameworkId}
            onChange={(e) => onFrameworkChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {frameworks.map(framework => (
              <option key={framework.id} value={framework.id}>
                {framework.name} ({framework.version})
              </option>
            ))}
          </select>
        </div>

        {/* Policy State Filter */}
        <div>
          <label htmlFor="policyState" className="block text-sm font-medium text-gray-700 mb-1">
            Policy State (Optional)
          </label>
          <select
            id="policyState"
            value={filters.policyState || ''}
            onChange={(e) => setFilters(prev => ({ 
              ...prev, 
              policyState: e.target.value || undefined 
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All States</option>
            <option value={PolicyState.Draft}>Draft</option>
            <option value={PolicyState.Review}>Review</option>
            <option value={PolicyState.Approved}>Approved</option>
            <option value={PolicyState.Production}>Production</option>
          </select>
        </div>

        {/* Date Range Filter */}
        <div>
          <div className="flex items-center mb-2">
            <input
              type="checkbox"
              id="dateRangeEnabled"
              checked={dateRangeEnabled}
              onChange={(e) => handleDateRangeToggle(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="dateRangeEnabled" className="ml-2 text-sm font-medium text-gray-700">
              Filter by Date Range
            </label>
          </div>

          {dateRangeEnabled && (
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <label htmlFor="startDate" className="block text-xs text-gray-600 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  id="startDate"
                  value={filters.dateRange?.start.toISOString().split('T')[0] || ''}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="endDate" className="block text-xs text-gray-600 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  id="endDate"
                  value={filters.dateRange?.end.toISOString().split('T')[0] || ''}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerateClick}
          disabled={isGenerating}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isGenerating ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating Report...
            </span>
          ) : (
            'Generate Report'
          )}
        </button>
      </div>
    </div>
  );
};
