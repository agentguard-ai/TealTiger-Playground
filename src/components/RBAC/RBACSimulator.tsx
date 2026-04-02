/**
 * RBAC Simulator Main Component
 * Requirements: 13.1-13.10
 * 
 * Provides a complete interface for defining roles, simulating policy behavior
 * across roles, and comparing results.
 */

import React, { useState, useEffect } from 'react';
import { rbacSimulatorService } from '../../services/RBACSimulatorService';
import type { RoleDefinition, SimulationResult } from '../../types/rbac';
import { EXAMPLE_ROLES } from '../../types/rbac';
import { RoleDefinitionEditor } from './RoleDefinitionEditor';
import { RoleSimulationPanel } from './RoleSimulationPanel';
import { SideBySideResultsComparison } from './SideBySideResultsComparison';
import { RoleDifferenceHighlighter } from './RoleDifferenceHighlighter';
import { RoleImportExportButtons } from './RoleImportExportButtons';

interface RBACSimulatorProps {
  workspaceId: string;
  policyId: string;
  versionId: string;
}

export const RBACSimulator: React.FC<RBACSimulatorProps> = ({
  workspaceId,
  policyId,
  versionId,
}) => {
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleDefinition | undefined>();
  const [simulationResults, _setSimulationResults] = useState<SimulationResult[]>([]);
  const [activeTab, setActiveTab] = useState<'roles' | 'simulate' | 'compare'>('roles');

  useEffect(() => {
    loadRoles();
  }, [workspaceId]);

  const loadRoles = async () => {
    setLoading(true);
    try {
      const loadedRoles = await rbacSimulatorService.listRoles(workspaceId);
      setRoles(loadedRoles.length > 0 ? loadedRoles : EXAMPLE_ROLES);
    } catch (error) {
      console.error('Failed to load roles:', error);
      setRoles(EXAMPLE_ROLES);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRole = async (role: RoleDefinition) => {
    try {
      await rbacSimulatorService.defineRole(workspaceId, role);
      await loadRoles();
      setShowEditor(false);
      setEditingRole(undefined);
    } catch (error) {
      console.error('Failed to save role:', error);
      alert('Failed to save role');
    }
  };

  const handleImportRoles = async (importedRoles: RoleDefinition[]) => {
    await loadRoles();
    alert(`Successfully imported ${importedRoles.length} role(s)`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500 dark:text-gray-400">Loading roles...</div>
      </div>
    );
  }

  return (
    <div className="rbac-simulator space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            RBAC Simulator
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Test policy behavior across different user roles and permissions
          </p>
        </div>
        <RoleImportExportButtons workspaceId={workspaceId} onImport={handleImportRoles} />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-4">
          {[
            { id: 'roles', label: 'Roles', count: roles.length },
            { id: 'simulate', label: 'Simulate' },
            { id: 'compare', label: 'Compare', count: simulationResults.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 border-b-2 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-2 text-sm opacity-75">({tab.count})</span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'roles' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Role Definitions
              </h3>
              <button
                onClick={() => {
                  setEditingRole(undefined);
                  setShowEditor(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                + New Role
              </button>
            </div>

            {showEditor && (
              <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
                  {editingRole ? 'Edit Role' : 'Create New Role'}
                </h4>
                <RoleDefinitionEditor
                  role={editingRole}
                  onSave={handleSaveRole}
                  onCancel={() => {
                    setShowEditor(false);
                    setEditingRole(undefined);
                  }}
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg 
                           hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white">{role.name}</h4>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Level {role.metadata.level}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {role.metadata.description}
                  </p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {role.permissions.slice(0, 3).map((perm) => (
                      <span
                        key={perm}
                        className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 
                                 dark:text-blue-200 rounded text-xs"
                      >
                        {perm}
                      </span>
                    ))}
                    {role.permissions.length > 3 && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        +{role.permissions.length - 3}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setEditingRole(role);
                      setShowEditor(true);
                    }}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Edit
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'simulate' && (
          <RoleSimulationPanel
            policyId={policyId}
            versionId={versionId}
            roles={roles}
          />
        )}

        {activeTab === 'compare' && (
          <div className="space-y-6">
            <SideBySideResultsComparison results={simulationResults} />
            <RoleDifferenceHighlighter results={simulationResults} />
          </div>
        )}
      </div>
    </div>
  );
};
