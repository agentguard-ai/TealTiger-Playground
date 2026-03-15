// Compliance report types
// Requirements: 9.1-9.10

import type { Policy, PolicyVersion } from './policy';
import type { ComplianceMapping } from './compliance';

export interface ComplianceReport {
  id: string;
  workspaceId: string;
  frameworkId: string;
  generatedAt: Date;
  generatedBy: string;
  filters: ReportFilters;
  summary: ReportSummary;
  policies: PolicyReportEntry[];
  auditSummary: AuditSummary;
}

export interface ReportFilters {
  framework?: string;
  dateRange?: { start: Date; end: Date };
  policyState?: string;
}

export interface ReportSummary {
  totalPolicies: number;
  mappedPolicies: number;
  coveragePercentage: number;
  averageTestCoverage: number;
  averageSuccessRate: number;
}

export interface PolicyReportEntry {
  policy: Policy;
  version: PolicyVersion;
  mappings: ComplianceMapping[];
  testCoverage: number;
  successRate: number;
  approvalStatus: string;
  lastModified: Date;
}

export interface AuditSummary {
  totalChanges: number;
  totalApprovals: number;
  totalDeployments: number;
  recentEvents: AuditEvent[];
}

export interface AuditEvent {
  id: string;
  workspaceId: string;
  actorId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface BrandingConfig {
  organizationName: string;
  logo?: string;
  primaryColor: string;
  footer?: string;
}

export interface GenerateReportInput {
  workspaceId: string;
  frameworkId: string;
  filters?: ReportFilters;
  userId: string;
}

export interface ScheduleReportInput {
  workspaceId: string;
  frameworkId: string;
  schedule: 'weekly' | 'monthly';
  recipients: string[];
  userId: string;
}
