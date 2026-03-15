/**
 * Role Attributes Form Component
 * Requirements: 13.2
 */

import React, { useState } from 'react';

interface RoleAttributesFormProps {
  attributes: Record<string, any>;
  onChange: (attributes: Record<string, any>) => void;
}

export const RoleAttributesForm: React.FC<RoleAttributesFormProps> = ({
  attributes,
  onChange,
}) => {
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const addAttribute = () => {
    if (newKey && newValue) {
      onChange({ ...attributes, [newKey]: newValue });
      setNewKey('');
      setNewValue('');
    }
  };

  const removeAttribute = (key: string) => {
    const updated = { ...attributes };
    delete updated[key];
    onChange(updated);
  };

  const updateAttribute = (key: string, value: any) => {
    onChange({ ...attributes, [key]: value });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          placeholder="Attribute name"
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                   bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />
        <input
          type="text"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder="Value"
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                   bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />
        <button
          type="button"
          onClick={addAttribute}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Add
        </button>
      </div>

      <div className="space-y-2">
        {Object.entries(attributes).map(([key, value]) => (
          <div key={key} className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <span className="font-medium text-gray-700 dark:text-gray-300 min-w-[120px]">
              {key}:
            </span>
            <input
              type="text"
              value={String(value)}
              onChange={(e) => updateAttribute(key, e.target.value)}
              className="flex-1 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            />
            <button
              type="button"
              onClick={() => removeAttribute(key)}
              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
