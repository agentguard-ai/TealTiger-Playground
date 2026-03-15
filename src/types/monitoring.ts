// Types for Free Tier Monitoring
// Requirements: 1.8, 1.9

export interface FreeTierLimits {
  storage: ResourceLimit;
  mau: ResourceLimit;
  bandwidth: ResourceLimit;
  githubActionsMinutes: ResourceLimit;
}

export interface ResourceLimit {
  used: number;
  limit: number;
  unit: string;
}

export interface UsageMetrics {
  storage: ResourceLimit;
  mau: ResourceLimit;
  bandwidth: ResourceLimit;
  githubActionsMinutes: ResourceLimit;
  lastUpdated: string;
}

export interface UsageAlert {
  resource: keyof FreeTierLimits;
  usagePercent: number;
  message: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface UsageSummary {
  metrics: UsageMetrics;
  alerts: UsageAlert[];
  overallHealthy: boolean;
}
