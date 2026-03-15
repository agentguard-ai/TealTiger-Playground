// Policy Impact Analysis types
// Requirements: 17.1-17.10

import type { PolicyVersion } from './policy';
import type { TestScenario, EvaluationResult } from './index';

export type ImpactSeverity = 'low' | 'medium' | 'high';
export type ImpactType = 'breaking' | 'warning' | 'info';

export interface ImpactAnalysis {
  policyId: string;
  oldVersionId: string;
  newVersionId: string;
  affectedScenarios: AffectedScenario[];
  summary: ImpactSummary;
  recommendation: 'approve' | 'review' | 'reject';
  analyzedAt: Date;
}

export interface AffectedScenario {
  scenarioId: string;
  scenarioName: string;
  impactType: ImpactType;
  changes: ScenarioChange[];
}

export interface ScenarioChange {
  field: 'decision' | 'cost' | 'latency' | 'metadata';
  oldValue: any;
  newValue: any;
  percentageChange?: number;
  severity: ImpactSeverity;
  description: string;
}

export interface ImpactSummary {
  totalScenarios: number;
  affectedScenarios: number;
  breakingChanges: number;
  warnings: number;
  infoChanges: number;
}

export interface TestRunResult {
  scenarioId: string;
  scenarioName: string;
  scenario: TestScenario;
  result: EvaluationResult;
  success: boolean;
  executionTime: number;
}

export interface ImpactReportData {
  analysis: ImpactAnalysis;
  oldVersion: PolicyVersion;
  newVersion: PolicyVersion;
  generatedAt: Date;
  generatedBy: string;
}

export interface ImpactExportOptions {
  format: 'pdf' | 'csv';
  includeDetails?: boolean;
  includeRecommendations?: boolean;
}
