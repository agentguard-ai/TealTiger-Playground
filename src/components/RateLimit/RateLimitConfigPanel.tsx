// RateLimitConfigPanel - Configuration form for workspace rate limits
// Requirements: 19.1, 19.8, 19.9

import React, { useState, useCallback } from 'react';
import type { RateLimitPoolConfig } from '../../types/ratelimit';
import { RateLimitPoolService } from '../../services/RateLimitPoolService';
import { QuotaMeter } from './QuotaMeter';

interface RateLimitConfigPanelProps {
  workspaceId: string;
  initialConfig?: Partial<RateLimitPoolConfig>;
}

export const RateLimitConfigPanel: React.FC<RateLimitConfigPanelProps> = ({
  workspaceId,
  initialConfig,
}) => {
  const [config, setConfig] = useState<RateLimitPoolConfig>({
    workspaceId,
    maxRequestsPerMinute: initialConfig?.maxRequestsPerMinute ?? 100,
    maxRequestsPerHour: initialConfig?.maxRequestsPerHour ?? 1000,
    maxRequestsPerDay: initialConfig?.maxRequestsPerDay ?? 10000,
    resetSchedule: initialConfig?.resetSchedule ?? 'daily',
    notifyAt: initialConfig?.notifyAt ?? [80, 100],
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const service = new RateLimitPoolService();
      await service.configurePool(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      console.warn('Failed to save rate limit config');
    } finally {
      setSaving(false);
    }
  }, [config]);

  const updateField = (field: keyof RateLimitPoolConfig, value: any) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <QuotaMeter label="Per Minute" used={0} max={config.maxRequestsPerMinute} />
        <QuotaMeter label="Per Hour" used={0} max={config.maxRequestsPerHour} />
        <QuotaMeter label="Per Day" used={0} max={config.maxRequestsPerDay} />
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded p-4 space-y-3">
        <span className="text-sm text-white">Rate Limit Configuration</span>

        <label className="block">
          <span className="text-xs text-gray-400">Max Requests / Minute</span>
          <input
            type="number" min={1}
            value={config.maxRequestsPerMinute}
            onChange={(e) => updateField('maxRequestsPerMinute', Number(e.target.value))}
            className="mt-1 w-full bg-gray-900 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:border-teal-500 focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="text-xs text-gray-400">Max Requests / Hour</span>
          <input
            type="number" min={1}
            value={config.maxRequestsPerHour}
            onChange={(e) => updateField('maxRequestsPerHour', Number(e.target.value))}
            className="mt-1 w-full bg-gray-900 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:border-teal-500 focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="text-xs text-gray-400">Max Requests / Day</span>
          <input
            type="number" min={1}
            value={config.maxRequestsPerDay}
            onChange={(e) => updateField('maxRequestsPerDay', Number(e.target.value))}
            className="mt-1 w-full bg-gray-900 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:border-teal-500 focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="text-xs text-gray-400">Reset Schedule</span>
          <select
            value={config.resetSchedule}
            onChange={(e) => updateField('resetSchedule', e.target.value)}
            className="mt-1 w-full bg-gray-900 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:border-teal-500 focus:outline-none"
          >
            <option value="hourly">Hourly</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </label>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-600 text-white text-sm rounded transition-colors"
        >
          {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
};
