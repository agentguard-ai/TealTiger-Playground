// AffectedScenariosList - List of scenarios with changed outcomes
// Requirements: 17.6, 17.7

import React, { useState } from 'react';
import type { AffectedScenario, ImpactType, ImpactSeverity } from '../../types/impact';

interface AffectedScenariosListProps {
  scenarios: AffectedScenario[];
  onSelectScenario?: (scenario: AffectedScenario) => void;
}

export const AffectedScenariosList: React.FC<AffectedScenariosListProps> = ({
  scenarios,
  onSelectScenario
}) => {
  const [filterType, setFilterType] = useState<ImpactType | 'all'>('all');
  const [filterSeverity, setFilterSeverity] = useState<ImpactSeverity | 'all'>('all');

  const getImpactTypeBadge = (type: ImpactType) => {
    switch (type) {
      case 'breaking':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getSeverityBadge = (severity: ImpactSeverity) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-700';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'low':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredScenarios = scenarios.filter(scenario => {
    if (filterType !== 'all' && scenario.impactType !== filterType) {
      return false;
    }
    if (filterSeverity !== 'all') {
      const hasSeverity = scenario.changes.some(c => c.severity === filterSeverity);
      if (!hasSeverity) return false;
    }
    return true;
  });

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200">
      {/* Header with Filters */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Affected Scenarios ({filteredScenarios.length})
        </h3>
        
        <div className="flex gap-4">
          {/* Impact Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Impact Type
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as ImpactType | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              <option value="breaking">Breaking</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
          </div>

          {/* Severity Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Severity
            </label>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value as ImpactSeverity | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Severities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Scenarios List */}
      <div className="divide-y divide-gray-200">
        {filteredScenarios.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No scenarios match the selected filters
          </div>
        ) : (
          filteredScenarios.map((scenario) => (
            <div
              key={scenario.scenarioId}
              className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => onSelectScenario?.(scenario)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-1">
                    {scenario.scenarioName}
                  </h4>
                  <div className="flex gap-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${getImpactTypeBadge(scenario.impactType)}`}>
                      {scenario.impactType.toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-600">
                      {scenario.changes.length} change{scenario.changes.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Changes Summary */}
              <div className="mt-2 space-y-1">
                {scenario.changes.map((change, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getSeverityBadge(change.severity)}`}>
                      {change.severity}
                    </span>
                    <span className="text-gray-700">{change.description}</span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
