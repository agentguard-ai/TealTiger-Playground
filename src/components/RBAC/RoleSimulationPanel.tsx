/**
 * Role Simulation Panel Component
 * Requirements: 13.3, 13.4, 13.5
 */

import React, { useState } from 'react';
import type { RoleDefinition, SimulationResult, EvaluationScenario } from '../../types/rbac';
import { rbacSimulatorService } from '../../services/RBACSimulatorService';

interface RoleSimulationPanelProps {
  policyId: string;
  versionId: string;
  roles: RoleDefinition[];
}

export const RoleSimulationPanel: React.FC<RoleSimulationPanelProps> = ({
  policyId,
  versionId,
  roles,
}) => {
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [scenario, setScenario] = useState<EvaluationScenario>({
    prompt: '',
    provider: 'openai',
    model: 'gpt-4',
    parameters: {},
  });
  const [results, setResults] = useState<SimulationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSimulate = async () => {
    if (!scenario.prompt) {
      setError('Please enter a prompt');
      return;
    }

    if (selectedRoles.length === 0) {
      setError('Please select at least one role');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const rolesToSimulate = roles.filter((r) => selectedRoles.includes(r.id));
      const simulationResults = await rbacSimulatorService.simulateAcrossRoles(
        policyId,
        versionId,
        rolesToSimulate,
        scenario
      );
      setResults(simulationResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Simulation failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = (roleId: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Role Simulation
        </h3>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Roles to Simulate
          </label>
          <div className="flex flex-wrap gap-2">
            {roles.map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => toggleRole(role.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedRoles.includes(role.id)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {role.name}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Test Prompt
          </label>
          <textarea
            value={scenario.prompt}
            onChange={(e) => setScenario({ ...scenario, prompt: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            rows={4}
            placeholder="Enter a prompt to test with different roles..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Provider
            </label>
            <select
              value={scenario.provider}
              onChange={(e) => setScenario({ ...scenario, provider: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="gemini">Google Gemini</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Model
            </label>
            <input
              type="text"
              value={scenario.model}
              onChange={(e) => setScenario({ ...scenario, model: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <button
          onClick={handleSimulate}
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                   disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Simulating...' : 'Run Simulation'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-md font-semibold text-gray-900 dark:text-white">
            Simulation Results
          </h4>
          {results.map((result, index) => (
            <div
              key={index}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
            >
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-medium text-gray-900 dark:text-white">
                  {result.role.name}
                </h5>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    result.decision.allowed
                      ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                      : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                  }`}
                >
                  {result.decision.allowed ? 'ALLOW' : 'DENY'}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {result.decision.reason}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                Execution time: {result.executionTime.toFixed(2)}ms
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
