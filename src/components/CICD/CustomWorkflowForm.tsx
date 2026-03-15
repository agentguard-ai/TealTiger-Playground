// CustomWorkflowForm - Configuration form for custom workflow generation
// Requirements: 15.1

import React from 'react';
import type { CICDConfig } from '../../types/cicd';
import type { EnvironmentName } from '../../types/environment';

interface CustomWorkflowFormProps {
  config: CICDConfig;
  onChange: (field: keyof CICDConfig, value: string | boolean) => void;
  onGenerate: () => void;
  generating: boolean;
  error: string | null;
  environments: EnvironmentName[];
}

export const CustomWorkflowForm: React.FC<CustomWorkflowFormProps> = ({
  config,
  onChange,
  onGenerate,
  generating,
  error,
  environments,
}) => {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-400">
        Configure a custom GitHub Actions workflow for your repository.
      </p>

      <label className="block">
        <span className="text-xs text-gray-400">GitHub Repository</span>
        <input
          type="text"
          value={config.githubRepo}
          onChange={(e) => onChange('githubRepo', e.target.value)}
          placeholder="owner/repo"
          className="mt-1 w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:border-teal-500 focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="text-xs text-gray-400">Branch</span>
        <input
          type="text"
          value={config.branch}
          onChange={(e) => onChange('branch', e.target.value)}
          placeholder="main"
          className="mt-1 w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:border-teal-500 focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="text-xs text-gray-400">Test Suite ID</span>
        <input
          type="text"
          value={config.testSuiteId}
          onChange={(e) => onChange('testSuiteId', e.target.value)}
          placeholder="default"
          className="mt-1 w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:border-teal-500 focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="text-xs text-gray-400">Target Environment</span>
        <select
          value={config.targetEnvironment}
          onChange={(e) => onChange('targetEnvironment', e.target.value)}
          className="mt-1 w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:border-teal-500 focus:outline-none"
        >
          {environments.map((env) => (
            <option key={env} value={env}>
              {env}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={config.autoDeployOnMerge}
          onChange={(e) => onChange('autoDeployOnMerge', e.target.checked)}
          className="rounded border-gray-600 bg-gray-800 text-teal-500 focus:ring-teal-500"
        />
        <span className="text-sm text-gray-300">Auto-deploy on merge</span>
      </label>

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      <button
        onClick={onGenerate}
        disabled={generating}
        className="w-full py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-600 text-white text-sm rounded transition-colors"
      >
        {generating ? 'Generating...' : 'Generate Workflow'}
      </button>
    </div>
  );
};
