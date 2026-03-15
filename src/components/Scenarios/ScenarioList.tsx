import React from 'react';
import type { TestScenario } from '../../types';

interface ScenarioListProps {
  scenarios: TestScenario[];
  onEdit: (scenario: TestScenario) => void;
  onDelete: (id: string) => void;
  onSelect?: (scenario: TestScenario) => void;
}

export const ScenarioList: React.FC<ScenarioListProps> = ({
  scenarios,
  onEdit,
  onDelete,
  onSelect,
}) => {
  if (scenarios.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No scenarios yet</p>
        <p className="text-sm mt-2">Add a scenario to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {scenarios.map((scenario) => (
        <ScenarioCard
          key={scenario.id}
          scenario={scenario}
          onEdit={onEdit}
          onDelete={onDelete}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
};

interface ScenarioCardProps {
  scenario: TestScenario;
  onEdit: (scenario: TestScenario) => void;
  onDelete: (id: string) => void;
  onSelect?: (scenario: TestScenario) => void;
}

const ScenarioCard: React.FC<ScenarioCardProps> = ({
  scenario,
  onEdit,
  onDelete,
  onSelect,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const providerColors = {
    openai: 'bg-green-100 text-green-800',
    anthropic: 'bg-orange-100 text-orange-800',
    gemini: 'bg-blue-100 text-blue-800',
    bedrock: 'bg-purple-100 text-purple-800',
  };

  const outcomeColors = {
    ALLOW: 'text-green-600',
    DENY: 'text-red-600',
    MONITOR: 'text-yellow-600',
  };

  const truncatePrompt = (text: string, maxLength: number = 80) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div
      className="border border-gray-200 rounded-lg p-4 hover:border-teal-500 transition-colors cursor-pointer"
      onClick={() => onSelect?.(scenario)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">{scenario.name}</h3>
          <p className="text-sm text-gray-600 mt-1">
            {isExpanded ? scenario.prompt : truncatePrompt(scenario.prompt)}
          </p>
          
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span
              className={`text-xs px-2 py-1 rounded ${
                providerColors[scenario.provider]
              }`}
            >
              {scenario.provider}
            </span>
            <span className="text-xs text-gray-600">{scenario.model}</span>
            {scenario.expectedOutcome && (
              <span
                className={`text-xs font-medium ${
                  outcomeColors[scenario.expectedOutcome]
                }`}
              >
                Expected: {scenario.expectedOutcome}
              </span>
            )}
            {scenario.testType && (
              <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
                {scenario.testType}
              </span>
            )}
          </div>

          {scenario.description && isExpanded && (
            <p className="text-sm text-gray-500 mt-2 italic">
              {scenario.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="text-gray-400 hover:text-gray-600 p-1"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            <svg
              className={`w-5 h-5 transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(scenario);
            }}
            className="text-teal-600 hover:text-teal-700 p-1"
            aria-label="Edit scenario"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Delete scenario "${scenario.name}"?`)) {
                onDelete(scenario.id);
              }
            }}
            className="text-red-600 hover:text-red-700 p-1"
            aria-label="Delete scenario"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
