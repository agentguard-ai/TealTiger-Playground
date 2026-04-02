// PolicyMetadataEditor - Edit policy metadata
// Requirements: 3.4

import React, { useState } from 'react';
import type { PolicyMetadata } from '../../types/policy';

interface PolicyMetadataEditorProps {
  metadata: PolicyMetadata;
  onChange: (metadata: PolicyMetadata) => void;
}

const PROVIDER_OPTIONS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'bedrock', label: 'AWS Bedrock' },
  { value: 'azure-openai', label: 'Azure OpenAI' },
  { value: 'cohere', label: 'Cohere' },
  { value: 'mistral', label: 'Mistral AI' }
];

const CATEGORY_OPTIONS = [
  'general',
  'security',
  'cost-control',
  'compliance',
  'content-moderation',
  'performance',
  'routing',
  'monitoring'
];

export const PolicyMetadataEditor: React.FC<PolicyMetadataEditorProps> = ({
  metadata,
  onChange
}) => {
  const [tagInput, setTagInput] = useState('');

  const handleAddTag = () => {
    if (tagInput.trim() && !metadata.tags.includes(tagInput.trim())) {
      onChange({
        ...metadata,
        tags: [...metadata.tags, tagInput.trim()]
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    onChange({
      ...metadata,
      tags: metadata.tags.filter(t => t !== tag)
    });
  };

  const handleProviderToggle = (provider: string) => {
    const providers = metadata.providers.includes(provider)
      ? metadata.providers.filter(p => p !== provider)
      : [...metadata.providers, provider];
    
    onChange({ ...metadata, providers });
  };

  const handleModelAdd = () => {
    const model = prompt('Enter model name:');
    if (model && model.trim() && !metadata.models.includes(model.trim())) {
      onChange({
        ...metadata,
        models: [...metadata.models, model.trim()]
      });
    }
  };

  const handleModelRemove = (model: string) => {
    onChange({
      ...metadata,
      models: metadata.models.filter(m => m !== model)
    });
  };

  return (
    <div className="space-y-4 border border-gray-200 rounded-lg p-4 bg-gray-50">
      <h4 className="text-sm font-semibold text-gray-900">Policy Metadata</h4>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Category
        </label>
        <select
          value={metadata.category}
          onChange={(e) => onChange({ ...metadata, category: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        >
          {CATEGORY_OPTIONS.map(cat => (
            <option key={cat} value={cat}>
              {cat.charAt(0).toUpperCase() + cat.slice(1).replace('-', ' ')}
            </option>
          ))}
        </select>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tags
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
            placeholder="Add tag..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={handleAddTag}
            className="px-4 py-2 text-sm bg-teal-600 text-white rounded-md hover:bg-teal-700"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {metadata.tags.map(tag => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-1 bg-teal-100 text-teal-800 text-xs rounded-full"
            >
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="hover:text-teal-900"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Providers */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Supported Providers
        </label>
        <div className="grid grid-cols-2 gap-2">
          {PROVIDER_OPTIONS.map(provider => (
            <label
              key={provider.value}
              className="flex items-center gap-2 p-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-100"
            >
              <input
                type="checkbox"
                checked={metadata.providers.includes(provider.value)}
                onChange={() => handleProviderToggle(provider.value)}
                className="rounded text-teal-600 focus:ring-teal-500"
              />
              <span className="text-sm">{provider.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Models */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Supported Models
        </label>
        <button
          type="button"
          onClick={handleModelAdd}
          className="mb-2 px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
        >
          + Add Model
        </button>
        <div className="flex flex-wrap gap-2">
          {metadata.models.map(model => (
            <span
              key={model}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
            >
              {model}
              <button
                type="button"
                onClick={() => handleModelRemove(model)}
                className="hover:text-blue-900"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Estimated Cost */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Estimated Cost (USD per 1K requests)
        </label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={metadata.estimatedCost}
          onChange={(e) => onChange({ ...metadata, estimatedCost: parseFloat(e.target.value) || 0 })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
      </div>

      {/* Test Coverage */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Test Coverage (%)
        </label>
        <input
          type="number"
          min="0"
          max="100"
          value={metadata.testCoverage}
          onChange={(e) => onChange({ ...metadata, testCoverage: parseFloat(e.target.value) || 0 })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
      </div>
    </div>
  );
};
