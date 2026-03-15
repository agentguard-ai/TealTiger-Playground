/**
 * Parameter Form Component
 * 
 * Dynamic form system that renders appropriate input controls based on parameter types.
 * Supports text, number, checkbox, dropdown, and multi-select inputs with real-time validation.
 * 
 * @module components/VisualPolicyBuilder/ParameterForm
 */

import React from 'react';
import { AlertCircle, HelpCircle } from 'lucide-react';
import type { BlockDefinition, BlockParameter, BlockValidationError, BlockValidationWarning } from '../../types/visual-policy';
import { ConditionalBlockConfig } from './ConditionalBlockConfig';

interface ParameterFormProps {
  blockDefinition: BlockDefinition;
  parameters: Record<string, any>;
  onChange: (paramName: string, value: any) => void;
  errors: BlockValidationError[];
  warnings: BlockValidationWarning[];
}

/**
 * ParameterForm Component
 * 
 * Renders a dynamic form with inputs for all block parameters.
 * Handles validation and displays errors/warnings inline.
 */
export const ParameterForm: React.FC<ParameterFormProps> = ({
  blockDefinition,
  parameters,
  onChange,
  errors,
  warnings
}) => {
  const isConditionalBlock = blockDefinition.category === 'conditional';
  
  if (blockDefinition.parameters.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-sm">This block has no configurable parameters.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Conditional block gets special condition builder */}
      {isConditionalBlock && (
        <ConditionalBlockConfig
          blockType={blockDefinition.id === 'conditional-if-else' ? 'if-else' : 'switch-case'}
          condition={parameters['condition'] || ''}
          onChange={(value) => onChange('condition', value)}
        />
      )}
      
      {/* Render standard parameters (skip 'condition' for conditional blocks) */}
      {blockDefinition.parameters
        .filter(param => !(isConditionalBlock && param.name === 'condition'))
        .map((param) => (
          <ParameterInput
            key={param.name}
            parameter={param}
            value={parameters[param.name]}
            onChange={(value) => onChange(param.name, value)}
            errors={errors}
            warnings={warnings}
          />
        ))}
    </div>
  );
};

interface ParameterInputProps {
  parameter: BlockParameter;
  value: any;
  onChange: (value: any) => void;
  errors: BlockValidationError[];
  warnings: BlockValidationWarning[];
}

/**
 * ParameterInput Component
 * 
 * Renders the appropriate input control based on parameter type.
 */
const ParameterInput: React.FC<ParameterInputProps> = ({
  parameter,
  value,
  onChange,
  errors,
  warnings
}) => {
  const currentValue = value !== undefined ? value : parameter.defaultValue;
  
  // Check for validation errors/warnings for this parameter
  const paramErrors = errors.filter(e => e.message.includes(parameter.name));
  const paramWarnings = warnings.filter(w => w.message.includes(parameter.name));
  const hasError = paramErrors.length > 0;
  const hasWarning = paramWarnings.length > 0;
  
  // Check if required and empty
  const isEmpty = currentValue === undefined || currentValue === '' || 
    (Array.isArray(currentValue) && currentValue.length === 0);
  const isRequiredEmpty = parameter.required && isEmpty;
  
  return (
    <div className="space-y-2">
      {/* Label */}
      <label className="block">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-sm font-medium ${isRequiredEmpty ? 'text-red-700' : 'text-gray-700'}`}>
            {parameter.label}
            {parameter.required && <span className="text-red-500 ml-1">*</span>}
          </span>
          {parameter.helpText && (
            <div className="group relative">
              <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                {parameter.helpText}
              </div>
            </div>
          )}
        </div>
        
        {/* Description */}
        {parameter.description && (
          <p className="text-xs text-gray-500 mb-2">{parameter.description}</p>
        )}
        
        {/* Input based on type */}
        {renderInput(parameter, currentValue, onChange, hasError || isRequiredEmpty)}
      </label>
      
      {/* Validation Messages */}
      {isRequiredEmpty && (
        <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 p-2 rounded">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>This field is required</span>
        </div>
      )}
      
      {paramErrors.map((error, idx) => (
        <div key={idx} className="flex items-start gap-2 text-xs text-red-600 bg-red-50 p-2 rounded">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error.message}</span>
        </div>
      ))}
      
      {paramWarnings.map((warning, idx) => (
        <div key={idx} className="flex items-start gap-2 text-xs text-yellow-700 bg-yellow-50 p-2 rounded">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{warning.message}</span>
        </div>
      ))}
    </div>
  );
};

/**
 * Render the appropriate input control based on parameter type
 */
function renderInput(
  parameter: BlockParameter,
  value: any,
  onChange: (value: any) => void,
  hasError: boolean
): React.ReactNode {
  const baseInputClass = `w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 transition-colors ${
    hasError
      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
  }`;
  
  switch (parameter.type) {
    case 'string':
      return (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={parameter.placeholder}
          className={baseInputClass}
        />
      );
    
    case 'number':
      return (
        <input
          type="number"
          value={value !== undefined ? value : ''}
          onChange={(e) => {
            const numValue = e.target.value === '' ? undefined : parseFloat(e.target.value);
            onChange(numValue);
          }}
          placeholder={parameter.placeholder}
          min={parameter.validation?.min}
          max={parameter.validation?.max}
          step="any"
          className={baseInputClass}
        />
      );
    
    case 'boolean':
      return (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={value || false}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="text-sm text-gray-600">
            {value ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      );
    
    case 'enum':
      return (
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={baseInputClass}
        >
          <option value="">Select an option...</option>
          {parameter.options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    
    case 'array':
      return (
        <MultiSelect
          options={parameter.options || []}
          value={value || []}
          onChange={onChange}
          placeholder={parameter.placeholder}
          hasError={hasError}
        />
      );
    
    case 'object':
      return (
        <textarea
          value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value || ''}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              onChange(parsed);
            } catch {
              onChange(e.target.value);
            }
          }}
          placeholder={parameter.placeholder || '{}'}
          rows={4}
          className={baseInputClass}
        />
      );
    
    default:
      return (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={parameter.placeholder}
          className={baseInputClass}
        />
      );
  }
}

interface MultiSelectProps {
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  hasError: boolean;
}

/**
 * MultiSelect Component
 * 
 * Custom multi-select component with checkboxes for array parameters.
 */
const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  value,
  onChange,
  placeholder,
  hasError
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  
  const toggleOption = (option: string) => {
    const newValue = value.includes(option)
      ? value.filter(v => v !== option)
      : [...value, option];
    onChange(newValue);
  };
  
  const selectedCount = value.length;
  
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 text-sm text-left border rounded-md focus:outline-none focus:ring-2 transition-colors ${
          hasError
            ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
            : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
        } ${selectedCount === 0 ? 'text-gray-400' : 'text-gray-900'}`}
      >
        {selectedCount === 0
          ? placeholder || 'Select options...'
          : `${selectedCount} selected: ${value.join(', ')}`}
      </button>
      
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {options.map((option) => (
              <label
                key={option}
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={value.includes(option)}
                  onChange={() => toggleOption(option)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
