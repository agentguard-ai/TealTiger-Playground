import React, { useState, useEffect } from 'react';
import type { TestScenario } from '../../types';

interface ScenarioEditorProps {
  scenario?: TestScenario | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (scenario: Omit<TestScenario, 'id' | 'timestamp'>) => void;
}

export const ScenarioEditor: React.FC<ScenarioEditorProps> = ({
  scenario,
  isOpen,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    prompt: '',
    provider: 'openai' as const,
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 1000,
    topP: 1.0,
    expectedOutcome: '' as '' | 'ALLOW' | 'DENY' | 'MONITOR',
    description: '',
    testType: '' as '' | 'pii' | 'injection' | 'normal',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (scenario) {
      setFormData({
        name: scenario.name,
        prompt: scenario.prompt,
        provider: scenario.provider,
        model: scenario.model,
        temperature: scenario.parameters.temperature ?? 0.7,
        maxTokens: scenario.parameters.maxTokens ?? 1000,
        topP: scenario.parameters.topP ?? 1.0,
        expectedOutcome: scenario.expectedOutcome || '',
        description: scenario.description || '',
        testType: scenario.testType || '',
      });
    } else {
      // Reset form for new scenario
      setFormData({
        name: '',
        prompt: '',
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 1000,
        topP: 1.0,
        expectedOutcome: '',
        description: '',
        testType: '',
      });
    }
    setErrors({});
  }, [scenario, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.prompt.trim()) {
      newErrors.prompt = 'Prompt is required';
    }

    if (!formData.model.trim()) {
      newErrors.model = 'Model is required';
    }

    if (formData.temperature < 0 || formData.temperature > 2) {
      newErrors.temperature = 'Temperature must be between 0 and 2';
    }

    if (formData.maxTokens < 1 || formData.maxTokens > 100000) {
      newErrors.maxTokens = 'Max tokens must be between 1 and 100000';
    }

    if (formData.topP < 0 || formData.topP > 1) {
      newErrors.topP = 'Top P must be between 0 and 1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const scenarioData: Omit<TestScenario, 'id' | 'timestamp'> = {
      name: formData.name.trim(),
      prompt: formData.prompt.trim(),
      provider: formData.provider,
      model: formData.model.trim(),
      parameters: {
        temperature: formData.temperature,
        maxTokens: formData.maxTokens,
        topP: formData.topP,
      },
      expectedOutcome: formData.expectedOutcome || undefined,
      description: formData.description.trim() || undefined,
      testType: formData.testType || undefined,
    };

    onSave(scenarioData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="scenario-editor-title"
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <h2 id="scenario-editor-title" className="text-xl font-semibold text-gray-900">
            {scenario ? 'Edit Scenario' : 'Add New Scenario'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., Test PII Detection"
            />
            {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
          </div>

          {/* Prompt */}
          <div>
            <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-1">
              Prompt *
            </label>
            <textarea
              id="prompt"
              value={formData.prompt}
              onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
              rows={4}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                errors.prompt ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter the prompt to test..."
            />
            {errors.prompt && <p className="text-red-600 text-sm mt-1">{errors.prompt}</p>}
          </div>

          {/* Provider and Model */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="provider" className="block text-sm font-medium text-gray-700 mb-1">
                Provider *
              </label>
              <select
                id="provider"
                value={formData.provider}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    provider: e.target.value as typeof formData.provider,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="gemini">Gemini</option>
                <option value="bedrock">Bedrock</option>
              </select>
            </div>

            <div>
              <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-1">
                Model *
              </label>
              <input
                type="text"
                id="model"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  errors.model ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., gpt-4"
              />
              {errors.model && <p className="text-red-600 text-sm mt-1">{errors.model}</p>}
            </div>
          </div>

          {/* Parameters */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="temperature" className="block text-sm font-medium text-gray-700 mb-1">
                Temperature
              </label>
              <input
                type="number"
                id="temperature"
                value={formData.temperature}
                onChange={(e) =>
                  setFormData({ ...formData, temperature: parseFloat(e.target.value) })
                }
                step="0.1"
                min="0"
                max="2"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  errors.temperature ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.temperature && (
                <p className="text-red-600 text-sm mt-1">{errors.temperature}</p>
              )}
            </div>

            <div>
              <label htmlFor="maxTokens" className="block text-sm font-medium text-gray-700 mb-1">
                Max Tokens
              </label>
              <input
                type="number"
                id="maxTokens"
                value={formData.maxTokens}
                onChange={(e) =>
                  setFormData({ ...formData, maxTokens: parseInt(e.target.value) })
                }
                min="1"
                max="100000"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  errors.maxTokens ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.maxTokens && <p className="text-red-600 text-sm mt-1">{errors.maxTokens}</p>}
            </div>

            <div>
              <label htmlFor="topP" className="block text-sm font-medium text-gray-700 mb-1">
                Top P
              </label>
              <input
                type="number"
                id="topP"
                value={formData.topP}
                onChange={(e) => setFormData({ ...formData, topP: parseFloat(e.target.value) })}
                step="0.1"
                min="0"
                max="1"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  errors.topP ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.topP && <p className="text-red-600 text-sm mt-1">{errors.topP}</p>}
            </div>
          </div>

          {/* Expected Outcome and Test Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="expectedOutcome"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Expected Outcome
              </label>
              <select
                id="expectedOutcome"
                value={formData.expectedOutcome}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    expectedOutcome: e.target.value as typeof formData.expectedOutcome,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">None</option>
                <option value="ALLOW">ALLOW</option>
                <option value="DENY">DENY</option>
                <option value="MONITOR">MONITOR</option>
              </select>
            </div>

            <div>
              <label htmlFor="testType" className="block text-sm font-medium text-gray-700 mb-1">
                Test Type
              </label>
              <select
                id="testType"
                value={formData.testType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    testType: e.target.value as typeof formData.testType,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">None</option>
                <option value="pii">PII</option>
                <option value="injection">Injection</option>
                <option value="normal">Normal</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Optional description..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-teal-600 rounded-md hover:bg-teal-700 transition-colors"
            >
              {scenario ? 'Update' : 'Add'} Scenario
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
