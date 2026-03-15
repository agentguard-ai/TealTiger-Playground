// Template Customizer Component
// Allows users to customize template parameters

import React, { useState, useEffect } from 'react';
import type { PolicyTemplate, TemplateParameter } from '../../types/policy-template';
import { policyTemplateService } from '../../services/PolicyTemplateService';

interface TemplateCustomizerProps {
  template: PolicyTemplate;
  onCustomize: (customizedCode: string, parameters: Record<string, unknown>) => void;
  onCancel: () => void;
}

export const TemplateCustomizer: React.FC<TemplateCustomizerProps> = ({
  template,
  onCustomize,
  onCancel,
}) => {
  const [parameters, setParameters] = useState<Record<string, unknown>>(() => {
    const defaults: Record<string, unknown> = {};
    template.parameters.forEach((param) => {
      defaults[param.name] = param.defaultValue;
    });
    return defaults;
  });

  const [errors, setErrors] = useState<string[]>([]);
  const [customizedCode, setCustomizedCode] = useState('');

  useEffect(() => {
    try {
      const code = policyTemplateService.customizeTemplate(template.id, parameters);
      setCustomizedCode(code);
      setErrors([]);
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Customization failed']);
    }
  }, [template.id, parameters]);

  const handleParameterChange = (paramName: string, value: unknown) => {
    setParameters((prev) => ({
      ...prev,
      [paramName]: value,
    }));
  };

  const handleSubmit = () => {
    const validation = policyTemplateService.validateParameters(template.id, parameters);
    if (validation.isValid) {
      onCustomize(customizedCode, parameters);
    } else {
      setErrors(validation.errors);
    }
  };

  const renderParameterInput = (param: TemplateParameter) => {
    const value = parameters[param.name];

    if (param.type === 'boolean') {
      return (
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={value as boolean}
            onChange={(e) => handleParameterChange(param.name, e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {param.description}
          </span>
        </label>
      );
    }

    if (param.type === 'number') {
      return (
        <input
          type="number"
          value={value as number}
          onChange={(e) => handleParameterChange(param.name, parseFloat(e.target.value))}
          min={param.validation?.min}
          max={param.validation?.max}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                   bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                   focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      );
    }

    if (param.validation?.options) {
      return (
        <select
          value={value as string}
          onChange={(e) => handleParameterChange(param.name, e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                   bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                   focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {param.validation.options.map((option) => (
            <option key={String(option)} value={String(option)}>
              {String(option)}
            </option>
          ))}
        </select>
      );
    }

    if (param.type === 'array') {
      return (
        <input
          type="text"
          value={JSON.stringify(value)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              handleParameterChange(param.name, parsed);
            } catch {
              // Invalid JSON, ignore
            }
          }}
          placeholder='["item1", "item2"]'
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                   bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm
                   focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      );
    }

    return (
      <input
        type="text"
        value={value as string}
        onChange={(e) => handleParameterChange(param.name, e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                 bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Customize {template.name}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {template.description}
        </p>
      </div>

      {/* Parameters */}
      <div className="space-y-4 mb-6">
        {template.parameters.map((param) => (
          <div key={param.name}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {param.name}
              {param.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              {param.description}
            </p>
            {renderParameterInput(param)}
          </div>
        ))}
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
            Validation Errors
          </h4>
          <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-300 space-y-1">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end space-x-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 
                   bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600
                   transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={errors.length > 0}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg 
                   hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                   transition-colors"
        >
          Apply Template
        </button>
      </div>
    </div>
  );
};
