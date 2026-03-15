/**
 * Role Definition Editor Component
 * Requirements: 13.1, 13.2, 13.6
 */

import React, { useState } from 'react';
import type { RoleDefinition } from '../../types/rbac';

interface RoleDefinitionEditorProps {
  role?: RoleDefinition;
  onSave: (role: RoleDefinition) => void;
  onCancel: () => void;
}

export const RoleDefinitionEditor: React.FC<RoleDefinitionEditorProps> = ({
  role,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState<RoleDefinition>(
    role || {
      id: '',
      name: '',
      permissions: [],
      attributes: {},
      metadata: {
        description: '',
        groups: [],
        level: 1,
        customFields: {},
      },
    }
  );

  const [newPermission, setNewPermission] = useState('');
  const [newGroup, setNewGroup] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id || !formData.name) {
      alert('Role ID and Name are required');
      return;
    }
    onSave(formData);
  };

  const addPermission = () => {
    if (newPermission && !formData.permissions.includes(newPermission)) {
      setFormData({
        ...formData,
        permissions: [...formData.permissions, newPermission],
      });
      setNewPermission('');
    }
  };

  const removePermission = (permission: string) => {
    setFormData({
      ...formData,
      permissions: formData.permissions.filter((p) => p !== permission),
    });
  };

  const addGroup = () => {
    if (newGroup && !formData.metadata.groups.includes(newGroup)) {
      setFormData({
        ...formData,
        metadata: {
          ...formData.metadata,
          groups: [...formData.metadata.groups, newGroup],
        },
      });
      setNewGroup('');
    }
  };

  const removeGroup = (group: string) => {
    setFormData({
      ...formData,
      metadata: {
        ...formData.metadata,
        groups: formData.metadata.groups.filter((g) => g !== group),
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Role ID *
          </label>
          <input
            type="text"
            value={formData.id}
            onChange={(e) => setFormData({ ...formData, id: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            placeholder="admin"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Role Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            placeholder="Administrator"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Description
        </label>
        <textarea
          value={formData.metadata.description}
          onChange={(e) =>
            setFormData({
              ...formData,
              metadata: { ...formData.metadata, description: e.target.value },
            })
          }
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                   bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          rows={3}
          placeholder="Describe this role..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Permissions
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={newPermission}
            onChange={(e) => setNewPermission(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPermission())}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            placeholder="read, write, delete..."
          />
          <button
            type="button"
            onClick={addPermission}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.permissions.map((permission) => (
            <span
              key={permission}
              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900 
                       text-blue-800 dark:text-blue-200 rounded-full text-sm"
            >
              {permission}
              <button
                type="button"
                onClick={() => removePermission(permission)}
                className="hover:text-blue-600 dark:hover:text-blue-400"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Groups
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={newGroup}
            onChange={(e) => setNewGroup(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addGroup())}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            placeholder="admins, users..."
          />
          <button
            type="button"
            onClick={addGroup}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.metadata.groups.map((group) => (
            <span
              key={group}
              className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900 
                       text-green-800 dark:text-green-200 rounded-full text-sm"
            >
              {group}
              <button
                type="button"
                onClick={() => removeGroup(group)}
                className="hover:text-green-600 dark:hover:text-green-400"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Level
        </label>
        <input
          type="number"
          value={formData.metadata.level}
          onChange={(e) =>
            setFormData({
              ...formData,
              metadata: { ...formData.metadata, level: parseInt(e.target.value) || 1 },
            })
          }
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                   bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          min="1"
          max="10"
        />
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                   text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Save Role
        </button>
      </div>
    </form>
  );
};
