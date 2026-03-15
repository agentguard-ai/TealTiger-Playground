import React from 'react';
import { Filter } from 'lucide-react';
import type { AuditAction } from '../../types/audit';

export interface EventTypeFilterProps {
  selectedTypes: AuditAction[];
  onChange: (types: AuditAction[]) => void;
}

/**
 * EventTypeFilter - Checkboxes for event types
 * Requirements: 11.5, 11.7
 */
export const EventTypeFilter: React.FC<EventTypeFilterProps> = ({
  selectedTypes,
  onChange,
}) => {
  const eventTypes: { value: AuditAction; label: string; category: string }[] = [
    { value: 'policy_created', label: 'Policy Created', category: 'Policy' },
    { value: 'policy_updated', label: 'Policy Updated', category: 'Policy' },
    { value: 'policy_deleted', label: 'Policy Deleted', category: 'Policy' },
    { value: 'policy_approved', label: 'Policy Approved', category: 'Governance' },
    { value: 'policy_rejected', label: 'Policy Rejected', category: 'Governance' },
    { value: 'policy_deployed', label: 'Policy Deployed', category: 'Deployment' },
    { value: 'policy_evaluated', label: 'Policy Evaluated', category: 'Evaluation' },
    { value: 'member_added', label: 'Member Added', category: 'Team' },
    { value: 'member_removed', label: 'Member Removed', category: 'Team' },
    { value: 'member_role_changed', label: 'Role Changed', category: 'Team' },
    { value: 'workspace_settings_changed', label: 'Settings Changed', category: 'Workspace' },
    { value: 'auth_login', label: 'Login', category: 'Authentication' },
    { value: 'auth_logout', label: 'Logout', category: 'Authentication' },
    { value: 'emergency_bypass', label: 'Emergency Bypass', category: 'Security' },
  ];

  const categories = Array.from(new Set(eventTypes.map((t) => t.category)));

  const handleToggle = (type: AuditAction) => {
    if (selectedTypes.includes(type)) {
      onChange(selectedTypes.filter((t) => t !== type));
    } else {
      onChange([...selectedTypes, type]);
    }
  };

  const handleSelectAll = () => {
    onChange(eventTypes.map((t) => t.value));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Filter className="w-4 h-4" />
          <span>Event Types</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSelectAll}
            className="text-xs text-teal-600 hover:text-teal-700"
          >
            Select All
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={handleClearAll}
            className="text-xs text-gray-600 hover:text-gray-700"
          >
            Clear All
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {categories.map((category) => (
          <div key={category}>
            <div className="text-xs font-medium text-gray-500 mb-2">{category}</div>
            <div className="space-y-1.5 pl-2">
              {eventTypes
                .filter((t) => t.category === category)
                .map((type) => (
                  <label
                    key={type.value}
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes(type.value)}
                      onChange={() => handleToggle(type.value)}
                      className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                    />
                    <span className="text-sm text-gray-700">{type.label}</span>
                  </label>
                ))}
            </div>
          </div>
        ))}
      </div>

      <div className="pt-2 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          {selectedTypes.length} of {eventTypes.length} types selected
        </div>
      </div>
    </div>
  );
};
