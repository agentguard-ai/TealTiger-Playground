// Environment types for multi-environment support
// Requirements: 14.1-14.10

export type EnvironmentName = 'development' | 'staging' | 'production';

export interface RBACRule {
  role: string;
  resource: string;
  action: string;
  allowed: boolean;
}

export interface EnvironmentConfig {
  apiEndpoints: Record<string, string>;
  rateLimits: Record<string, number>;
  budgetLimits: Record<string, number>;
  rbacRules: RBACRule[];
  customSettings: Record<string, any>;
}

export interface DeployedPolicy {
  policyId: string;
  versionId: string;
  deployedAt: Date;
  deployedBy: string;
  status: 'active' | 'inactive';
}

export interface DeploymentEnvironment {
  id: string;
  workspaceId: string;
  name: EnvironmentName;
  config: EnvironmentConfig;
  deployedPolicies: DeployedPolicy[];
  createdAt: Date;
  updatedAt: Date;
}

export interface EvaluationScenario {
  id: string;
  name: string;
  description: string;
  input: any;
  expectedOutput: any;
  environmentId?: string;
}

export interface PromotePolicyInput {
  policyId: string;
  versionId: string;
  targetEnvironment: EnvironmentName;
  userId: string;
}

export interface CreateEnvironmentInput {
  workspaceId: string;
  name: EnvironmentName;
  config: EnvironmentConfig;
}

export interface UpdateEnvironmentConfigInput {
  environmentId: string;
  config: Partial<EnvironmentConfig>;
}

export interface EnvironmentError {
  message: string;
  code?: string;
}

// Color coding for environments (Requirements: 14.4)
export const ENVIRONMENT_COLORS: Record<EnvironmentName, string> = {
  development: 'blue',
  staging: 'yellow',
  production: 'red',
};

// Environment display names
export const ENVIRONMENT_LABELS: Record<EnvironmentName, string> = {
  development: 'Development',
  staging: 'Staging',
  production: 'Production',
};
