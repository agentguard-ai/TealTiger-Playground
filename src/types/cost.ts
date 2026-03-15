// Cost allocation and tracking types
// Requirements: 20.1-20.10

export interface CostEntry {
  id: string;
  workspaceId: string;
  policyId: string;
  policyName: string;
  userId: string;
  provider: string;
  model: string;
  costUsd: number;
  tokensUsed: number;
  projectCode?: string;
  timestamp: Date;
}

export interface CostAllocationReport {
  workspaceId: string;
  dateRange: { start: Date; end: Date };
  totalCostUsd: number;
  byPolicy: CostCategory[];
  byProvider: CostCategory[];
  byMember: CostCategory[];
  byProject: CostCategory[];
  trends: CostTrendPoint[];
}

export interface CostCategory {
  name: string;
  costUsd: number;
  percentage: number;
  count: number;
}

export interface CostTrendPoint {
  date: string;
  costUsd: number;
}

export interface BudgetAlert {
  id: string;
  workspaceId: string;
  thresholdUsd: number;
  period: 'daily' | 'weekly' | 'monthly';
  enabled: boolean;
  notifyEmail?: string;
}
