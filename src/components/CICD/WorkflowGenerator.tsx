// WorkflowGenerator - Configuration form for generating GitHub Actions workflows
// Requirements: 15.1, 15.5, 15.7

import React, { useState, useCallback } from 'react';
import { CICDIntegrationService } from '../../services/CICDIntegrationService';
import type { CICDConfig } from '../../types/cicd';
import type { EnvironmentName } from '../../types/environment';
import { WORKFLOW_TEMPLATES } from '../../data/cicd-workflow-templates';
import { TemplateSelector } from './TemplateSelector';
import { CustomWorkflowForm } from './CustomWorkflowForm';
import { DownloadWorkflowButton } from './DownloadWorkflowButton';

interface WorkflowGeneratorProps {
  workspaceId: string;
  onGenerated?: (yaml: string) => void;
}

const ENVIRONMENTS: EnvironmentName[] = ['development', 'staging', 'production'];

export const WorkflowGenerator: React.FC<WorkflowGeneratorProps> = ({
  workspaceId,
  onGenerated,
}) => {
  const [mode, setMode] = useState<'template' | 'custom'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('policy-testing');
  const [config, setConfig] = useState<CICDConfig>({
    workspaceId,
    githubRepo: '',
    branch: 'main',
    testSuiteId: 'default',
    autoDeployOnMerge: false,
    targetEnvironment: 'staging',
  });
  const [generatedYaml, setGeneratedYaml] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfigChange = useCallback(
    (field: keyof CICDConfig, value: string | boolean) => {
      setConfig((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleGenerateCustom = useCallback(async () => {
    if (!config.githubRepo.trim()) {
      setError('Repository name is required');
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const service = new CICDIntegrationService();
      const yaml = await service.generateWorkflow(config);
      setGeneratedYaml(yaml);
      onGenerated?.(yaml);
    } catch (err: any) {
      setError(err.message || 'Failed to generate workflow');
    } finally {
      setGenerating(false);
    }
  }, [config, onGenerated]);

  const handleSelectTemplate = useCallback(
    (templateId: string) => {
      setSelectedTemplate(templateId);
      const tpl = WORKFLOW_TEMPLATES.find((t) => t.id === templateId);
      if (tpl) {
        setGeneratedYaml(tpl.yaml);
        onGenerated?.(tpl.yaml);
      }
    },
    [onGenerated]
  );

  const activeTemplate = WORKFLOW_TEMPLATES.find((t) => t.id === selectedTemplate);

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex gap-2 border-b border-gray-700 pb-2">
        <button
          onClick={() => setMode('template')}
          className={`px-3 py-1.5 text-sm rounded-t ${
            mode === 'template'
              ? 'bg-teal-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Templates
        </button>
        <button
          onClick={() => setMode('custom')}
          className={`px-3 py-1.5 text-sm rounded-t ${
            mode === 'custom'
              ? 'bg-teal-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Custom Workflow
        </button>
      </div>

      {mode === 'template' ? (
        <TemplateSelector
          templates={WORKFLOW_TEMPLATES}
          selected={selectedTemplate}
          onSelect={handleSelectTemplate}
          activeTemplate={activeTemplate}
        />
      ) : (
        <CustomWorkflowForm
          config={config}
          onChange={handleConfigChange}
          onGenerate={handleGenerateCustom}
          generating={generating}
          error={error}
          environments={ENVIRONMENTS}
        />
      )}

      {/* Generated YAML preview */}
      {generatedYaml && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-300">Generated Workflow</span>
            <DownloadWorkflowButton
              yaml={generatedYaml}
              filename={
                mode === 'template' && activeTemplate
                  ? activeTemplate.filename
                  : 'tealtiger-policy.yml'
              }
            />
          </div>
          <pre className="bg-gray-900 border border-gray-700 rounded p-3 text-xs text-gray-300 overflow-auto max-h-80 font-mono">
            {generatedYaml}
          </pre>
        </div>
      )}
    </div>
  );
};
