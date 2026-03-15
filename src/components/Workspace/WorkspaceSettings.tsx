import React, { useState } from 'react';
import type { Workspace, WorkspaceSettings as WorkspaceSettingsType } from '../../types/workspace';

interface WorkspaceSettingsProps {
  workspace: Workspace;
  onUpdateSettings: (settings: WorkspaceSettingsType) => Promise<void>;
  onClose: () => void;
}

export const WorkspaceSettings: React.FC<WorkspaceSettingsProps> = ({
  workspace,
  onUpdateSettings,
  onClose,
}) => {
  const [settings, setSettings] = useState<WorkspaceSettingsType>(workspace.settings);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setIsSaving(true);
    setError('');

    try {
      await onUpdateSettings(settings);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Workspace Settings</h2>
            <p className="text-sm text-gray-500 mt-1">{workspace.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Governance Settings */}
        <div>
          <h3 className="text-md font-semibold text-gray-900 mb-4">Governance</h3>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="required-approvers" className="block text-sm font-medium text-gray-700 mb-1">
                Required Approvers
              </label>
              <input
                id="required-approvers"
                type="number"
                min="1"
                max="5"
                value={settings.requiredApprovers}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    requiredApprovers: parseInt(e.target.value) || 1,
                  })
                }
                className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Number of approvals required before policy promotion (1-5)
              </p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.allowEmergencyBypass}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      allowEmergencyBypass: e.target.checked,
                    })
                  }
                  className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span>Allow emergency bypass for critical fixes</span>
              </label>
              <p className="text-xs text-gray-500 mt-1 ml-6">
                Enables skipping approval workflow in emergencies (logged in audit trail)
              </p>
            </div>
          </div>
        </div>

        {/* Rate Limiting */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-md font-semibold text-gray-900 mb-4">Rate Limiting</h3>
          
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.rateLimitPool.enabled}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      rateLimitPool: {
                        ...settings.rateLimitPool,
                        enabled: e.target.checked,
                      },
                    })
                  }
                  className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span>Enable shared rate limit pool</span>
              </label>
            </div>

            {settings.rateLimitPool.enabled && (
              <div className="ml-6 space-y-3">
                <div>
                  <label htmlFor="requests-per-hour" className="block text-sm font-medium text-gray-700 mb-1">
                    Requests per Hour
                  </label>
                  <input
                    id="requests-per-hour"
                    type="number"
                    min="0"
                    value={settings.rateLimitPool.requestsPerHour || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        rateLimitPool: {
                          ...settings.rateLimitPool,
                          requestsPerHour: parseInt(e.target.value) || undefined,
                        },
                      })
                    }
                    placeholder="Unlimited"
                    className="w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label htmlFor="requests-per-day" className="block text-sm font-medium text-gray-700 mb-1">
                    Requests per Day
                  </label>
                  <input
                    id="requests-per-day"
                    type="number"
                    min="0"
                    value={settings.rateLimitPool.requestsPerDay || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        rateLimitPool: {
                          ...settings.rateLimitPool,
                          requestsPerDay: parseInt(e.target.value) || undefined,
                        },
                      })
                    }
                    placeholder="Unlimited"
                    className="w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>

      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          disabled={isSaving}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 text-sm text-white bg-teal-600 rounded-md hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};
