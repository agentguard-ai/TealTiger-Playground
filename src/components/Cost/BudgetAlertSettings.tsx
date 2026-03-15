// BudgetAlertSettings - Configure budget alerts for the workspace
// Requirements: 20.7, 20.8

import React, { useState, useCallback } from 'react';
import { CostAllocationService } from '../../services/CostAllocationService';

interface BudgetAlertSettingsProps {
  workspaceId: string;
}

export const BudgetAlertSettings: React.FC<BudgetAlertSettingsProps> = ({ workspaceId }) => {
  const [threshold, setThreshold] = useState(100);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const service = new CostAllocationService();
      await service.setBudgetAlert({ workspaceId, thresholdUsd: threshold, period, enabled });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      console.warn('Failed to save budget alert');
    } finally {
      setSaving(false);
    }
  }, [workspaceId, threshold, period, enabled]);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded p-4 space-y-3">
      <span className="text-sm text-white">Budget Alerts</span>

      <label className="flex items-center gap-2">
        <input
          type="checkbox" checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="rounded border-gray-600 bg-gray-900 text-teal-500"
        />
        <span className="text-xs text-gray-300">Enable budget alerts</span>
      </label>

      <label className="block">
        <span className="text-xs text-gray-400">Threshold (USD)</span>
        <input
          type="number" min={1} step={10}
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          className="mt-1 w-full bg-gray-900 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:border-teal-500 focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="text-xs text-gray-400">Period</span>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as any)}
          className="mt-1 w-full bg-gray-900 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:border-teal-500 focus:outline-none"
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </label>

      <button
        onClick={handleSave} disabled={saving}
        className="w-full py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-600 text-white text-sm rounded transition-colors"
      >
        {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Alert'}
      </button>
    </div>
  );
};
