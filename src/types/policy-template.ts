// Policy Template Types

export interface PolicyTemplate {
  id: string;
  name: string;
  category: PolicyTemplateCategory;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  description: string;
  longDescription: string;
  code: string;
  parameters: TemplateParameter[];
  tags: string[];
  complianceFrameworks?: string[]; // e.g., ['OWASP-ASI01', 'GDPR-Article-32']
  documentation: string;
  examples: TemplateExample[];
}

export type PolicyTemplateCategory =
  | 'security'
  | 'cost'
  | 'compliance'
  | 'performance'
  | 'routing'
  | 'reliability';

export interface TemplateParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  defaultValue: unknown;
  required: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    options?: unknown[];
  };
}

export interface TemplateExample {
  title: string;
  description: string;
  parameters: Record<string, unknown>;
  expectedBehavior: string;
}

export interface CustomizedTemplate {
  templateId: string;
  name: string;
  parameters: Record<string, unknown>;
  code: string;
  workspaceId?: string;
  createdBy?: string;
  createdAt: Date;
}

export interface TemplateValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
