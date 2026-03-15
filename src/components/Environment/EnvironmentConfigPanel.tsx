import React, { useState } from 'react';
import type { DeploymentEnvironment, EnvironmentConfig } from '../../types/environment';
import { ENVIRONMENT_LABELS } from '../../types/environment';

interface EnvironmentConfigPanelProps {
  environment: DeploymentEnvironment;
  onUpdateConfig: (config: Partial<EnvironmentConfig>) => Promise<void>;
}

export const EnvironmentConfigPanel: React.FC<EnvironmentConfigPanelProps> = ({
  environment,
  onUpdateConfig,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [config, setConfig] = useState<EnvironmentConfig>(environment.config);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      await onUpdateConfig(config);
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setConfig(environment.config);
    setIsEditing(false);
    setError(null);
  };

  const addApiEndpoint = () => {
    setConfig({
      ...config,
      apiEndpoints: {
        ...config.apiEndpoints,
        '': '',
      },
    });
  };

  const updateApiEndpoint = (oldKey: string, newKey: string, value: string) => {
    const newEndpoints = { ...config.apiEndpoints };
    if (oldKey !== newKey) {
      delete newEndpoints[oldKey];
    }
    newEndpoints[newKey] = value;
    setConfig({ ...config, apiEndpoints: newEndpoints });
  };

  const removeApiEndpoint = (key: string) => {
    const newEndpoints = { ...config.apiEndpoints };
    delete newEndpoints[key];
    setConfig({ ...config, apiEndpoints: newEndpoints });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          {ENVIRONMENT_LABELS[environment.name]} Configuration
        </h3>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-1.5 text-sm bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors"
          >
            Edit Configuration
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* API Endpoints */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">API Endpoints</label>
            {isEditing && (
              <button
                onClick={addApiEndpoint}
                className="text-sm text-teal-600 hover:text-teal-700 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add Endpoint
              </button>
            )}
          </div>
          <div className="space-y-2">
            {Object.entries(config.apiEndpoints).length === 0 ? (
              <p className="text-sm text-gray-500 italic">No API endpoints configured</p>
            ) : (
              Object.entries(config.apiEndpoints).map(([key, value]) => (
                <div key={key} className="flex gap-2">
                  <input
                    type="text"
                    value={key}
                    onChange={(e) => updateApiEndpoint(key, e.target.value, value)}
                    disabled={!isEditing}
                    placeholder="Service name"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-600"
                  />
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => updateApiEndpoint(key, key, e.target.value)}
                    disabled={!isEditing}
                    placeholder="https://api.example.com"
                    className="flex-[2] px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-600"
                  />
                  {isEditing && (
                    <button
                      onClick={() => removeApiEndpoint(key)}
                      className="px-2 text-red-600 hover:text-red-700"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Rate Limits */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Rate Limits</label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Requests per Hour</label>
              <input
                type="number"
                value={config.rateLimits.requestsPerHour || ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    rateLimits: {
                      ...config.rateLimits,
                      requestsPerHour: parseInt(e.target.value) || 0,
                    },
                  })
                }
                disabled={!isEditing}
                placeholder="1000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-600"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Requests per Day</label>
              <input
                type="number"
                value={config.rateLimits.requestsPerDay || ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    rateLimits: {
                      ...config.rateLimits,
                      requestsPerDay: parseInt(e.target.value) || 0,
                    },
                  })
                }
                disabled={!isEditing}
                placeholder="10000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-600"
              />
            </div>
          </div>
        </div>

        {/* Budget Limits */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Budget Limits (USD)</label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Daily Budget</label>
              <input
                type="number"
                step="0.01"
                value={config.budgetLimits.daily || ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    budgetLimits: {
                      ...config.budgetLimits,
                      daily: parseFloat(e.target.value) || 0,
                    },
                  })
                }
                disabled={!isEditing}
                placeholder="100.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-600"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Monthly Budget</label>
              <input
                type="number"
                step="0.01"
                value={config.budgetLimits.monthly || ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    budgetLimits: {
                      ...config.budgetLimits,
                      monthly: parseFloat(e.target.value) || 0,
                    },
                  })
                }
                disabled={!isEditing}
                placeholder="1000.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-600"
              />
            </div>
          </div>
        </div>
      </div>

      {isEditing && (
        <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};
