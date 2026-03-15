// TemplateSelector - Displays available workflow templates for selection
// Requirements: 15.1, 15.10

import React from 'react';
import type { WorkflowTemplate } from '../../data/cicd-workflow-templates';

interface TemplateSelectorProps {
  templates: WorkflowTemplate[];
  selected: string;
  onSelect: (id: string) => void;
  activeTemplate?: WorkflowTemplate;
}

const CATEGORY_LABELS: Record<WorkflowTemplate['category'], string> = {
  validation: '🔍 Validation',
  testing: '🧪 Testing',
  deployment: '🚀 Deployment',
};

const CATEGORY_COLORS: Record<WorkflowTemplate['category'], string> = {
  validation: 'border-blue-500',
  testing: 'border-teal-500',
  deployment: 'border-orange-500',
};

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  templates,
  selected,
  onSelect,
}) => {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-400">
        Choose a pre-built workflow template for common CI/CD scenarios.
      </p>
      <div className="grid gap-3">
        {templates.map((tpl) => (
          <button
            key={tpl.id}
            onClick={() => onSelect(tpl.id)}
            className={`text-left p-3 rounded border-l-4 transition-colors ${
              CATEGORY_COLORS[tpl.category]
            } ${
              selected === tpl.id
                ? 'bg-gray-700 ring-1 ring-teal-500'
                : 'bg-gray-800 hover:bg-gray-750'
            }`}
            aria-pressed={selected === tpl.id}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white">{tpl.name}</span>
              <span className="text-xs text-gray-400">
                {CATEGORY_LABELS[tpl.category]}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">{tpl.description}</p>
            <span className="text-xs text-gray-500 mt-1 block font-mono">
              {tpl.filename}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
