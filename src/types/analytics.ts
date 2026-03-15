// Analytics types for workspace usage metrics and reporting
// Requirements: 18.1-18.10

export type DateRange = '7d' | '30d' | '90d' | '365d' | 'custom';

export interface DateRangeConfig {
  range: DateRange;
  startDate?: Date;
  endDate?: Date;
}

export interface EvaluationEvent {
  id: string;
  workspaceId: string;
  policyId: string;
  policyName: string;
  userId: string;
  provider: string;
  model: string;
  action: 'ALLOW' | 'DENY' | 'MONITOR';
  latencyMs: number;
  costUsd: number;
  tokensUsed: number;
  timestamp: Date;
  success: boolean;
}

export interface WorkspaceMetrics {
  totalEvaluations: number;
  successRate: number;
  averageLatencyMs: number;
  totalCostUsd: number;
  totalTokens: number;
  evaluationsPerDay: TimeSeriesPoint[];
  successRateOverTime: TimeSeriesPoint[];
  latencyOverTime: TimeSeriesPoint[];
  costByPolicy: CategoryMetric[];
  costByProvider: CategoryMetric[];
  topPolicies: PolicyUsageMetric[];
  evaluationsByMember: CategoryMetric[];
  approvalVelocity: TimeSeriesPoint[];
  complianceCoverageTrend: TimeSeriesPoint[];
}

export interface TimeSeriesPoint {
  date: string; // ISO date string
  value: number;
}

export interface CategoryMetric {
  name: string;
  value: number;
  percentage: number;
}

export interface PolicyUsageMetric {
  policyId: string;
  policyName: string;
  evaluations: number;
  successRate: number;
  averageLatencyMs: number;
  totalCostUsd: number;
}

export interface AnalyticsExportOptions {
  format: 'csv' | 'json' | 'png';
  dateRange: DateRangeConfig;
  includeCharts?: boolean;
}
