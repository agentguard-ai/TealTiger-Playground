import React, { useState } from 'react';
import type { AuditFilters, AuditAction, ResourceType } from '../../types/audit';

interface AuditFilterBarProps {
  onFilterChange: (filters: AuditFilters) => void;
  currentFilters: AuditFilters;
}

/**
 * AuditFilterBar - Filter audit events by date, actor, action, resource
 * Requirements: 10.8
 */
export const AuditFilterBar: React.FC<AuditFilterBarProps> = ({
  onFilterChange,
  currentFilters,
}) => {
  const [dateRange, setDateRange] = useState<'all' | '7d' | '30d' | '90d' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedActions, setSelectedActions] = useState<AuditAction[]>(currentFilters.actions || []);
  const [selectedResourceType, setSelectedResourceType] = useState<ResourceType | ''>(
    currentFilters.resourceType || ''
  );

  const allActions: AuditAction[] = [
    'policy_created',
    'policy_updated',
    'policy_deleted',
    'policy_approved',
    'policy_rejected',
    'policy_deployed',
    'policy_evaluated',
    'member_added',
    'member_removed',
    'member_role_changed',
    'workspace_settings_changed',
    'auth_login',
    'auth_logout',
    'emergency_bypass',
  ];

  const allResourceTypes: ResourceType[] = [
    'policy',
    'policy_version',
    'workspace',
    'workspace_member',
    'comment',
    'compliance_mapping',
  ];

  const handleDateRangeChange = (range: string) => {
    setDateRange(range as any);
    
    if (range === 'all') {
      const { dateRange: _, ...rest } = currentFilters;
      onFilterChange(rest);
      return;
    }

    if (range === 'custom') {
      return; // Wait for custom dates to be set
    }

    const now = new Date();
    const start = new Date();
    
    switch (range) {
      case '7d':
        start.setDate(now.getDate() - 7);
        break;
      case '30d':
        start.setDate(now.getDate() - 30);
        break;
      case '90d':
        start.setDate(now.getDate() - 90);
        break;
    }

    onFilterChange({
      ...currentFilters,
      dateRange: { start, end: now },
    });
  };

  const handleCustomDateApply = () => {
    if (customStartDate && customEndDate) {
      onFilterChange({
        ...currentFilters,
        dateRange: {
          start: new Date(customStartDate),
          end: new Date(customEndDate),
        },
      });
    }
  };

  const handleActionToggle = (action: AuditAction) => {
    const newActions = selectedActions.includes(action)
      ? selectedActions.filter(a => a !== action)
      : [...selectedActions, action];
    
    setSelectedActions(newActions);
    onFilterChange({
      ...currentFilters,
      actions: newActions.length > 0 ? newActions : undefined,
    });
  };

  const handleResourceTypeChange = (type: string) => {
    setSelectedResourceType(type as ResourceType | '');
    onFilterChange({
      ...currentFilters,
      resourceType: type ? (type as ResourceType) : undefined,
    });
  };

  const handleClearFilters = () => {
    setDateRange('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setSelectedActions([]);
    setSelectedResourceType('');
    onFilterChange({});
  };

  const hasActiveFilters = 
    currentFilters.dateRange ||
    (currentFilters.actions && currentFilters.actions.length > 0) ||
    currentFilters.resourceType;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="text-xs text-blue-600 hover:text-blue-700"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Date Range Filter */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">
          Date Range
        </label>
        <div className="flex gap-2 flex-wrap">
          {['all', '7d', '30d', '90d', 'custom'].map((range) => (
            <button
              key={range}
              onClick={() => handleDateRangeChange(range)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                dateRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range === 'all' ? 'All Time' : range === 'custom' ? 'Custom' : `Last ${range}`}
            </button>
          ))}
        </div>

        {dateRange === 'custom' && (
          <div className="mt-2 flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-xs text-gray-600 mb-1">Start Date</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-600 mb-1">End Date</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
              />
            </div>
            <button
              onClick={handleCustomDateApply}
              disabled={!customStartDate || !customEndDate}
              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply
            </button>
          </div>
        )}
      </div>

      {/* Resource Type Filter */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">
          Resource Type
        </label>
        <select
          value={selectedResourceType}
          onChange={(e) => handleResourceTypeChange(e.target.value)}
          className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Types</option>
          {allResourceTypes.map((type) => (
            <option key={type} value={type}>
              {type.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      {/* Action Filter */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">
          Actions ({selectedActions.length} selected)
        </label>
        <div className="max-h-48 overflow-y-auto border border-gray-200 rounded p-2 space-y-1">
          {allActions.map((action) => (
            <label
              key={action}
              className="flex items-center gap-2 text-xs text-gray-700 hover:bg-gray-50 p-1 rounded cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedActions.includes(action)}
                onChange={() => handleActionToggle(action)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>{action.replace(/_/g, ' ')}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};
