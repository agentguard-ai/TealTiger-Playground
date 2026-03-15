// CI/CD Integration types for GitHub Actions workflow generation
// Requirements: 15.1-15.10

import type { EnvironmentName } from './environment';

export interface CICDConfig {
  workspaceId: string;
  githubRepo: string;
  branch: string;
  testSuiteId: string;
  autoDeployOnMerge: boolean;
  targetEnvironment: EnvironmentName;
  notificationWebhook?: string;
}

export interface TestRunResult {
  id: string;
  policyId: string;
  versionId: string;
  testSuiteId: string;
  passed: number;
  failed: number;
  skipped: number;
  coverage: number;
  duration: number;
  timestamp: Date;
  failures: TestFailure[];
}

export interface TestFailure {
  testName: string;
  expected: any;
  actual: any;
  error: string;
}

export interface CoverageReport {
  totalLines: number;
  coveredLines: number;
  coveragePercentage: number;
  uncoveredLines: number[];
}

export interface SyntaxValidationResult {
  isValid: boolean;
  errors: SyntaxError[];
  warnings: SyntaxWarning[];
}

export interface SyntaxError {
  line: number;
  column: number;
  message: string;
}

export interface SyntaxWarning {
  line: number;
  column: number;
  message: string;
}

export interface DeploymentResult {
  policyId: string;
  versionId: string;
  environment: EnvironmentName;
  deployedAt: Date;
  status: 'success' | 'failed';
  message: string;
}

export interface CICDError {
  message: string;
  code?: string;
}
