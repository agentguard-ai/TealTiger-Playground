// Rate limit pool types for shared workspace quota management
// Requirements: 19.1-19.10

export interface RateLimitPoolConfig {
  workspaceId: string;
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
  maxRequestsPerDay: number;
  resetSchedule: 'hourly' | 'daily' | 'weekly' | 'monthly';
  notifyAt: number[]; // Percentages, e.g. [80, 100]
  notificationWebhook?: string;
}

export interface MemberQuota {
  userId: string;
  userName: string;
  allocatedPerMinute: number;
  allocatedPerHour: number;
  allocatedPerDay: number;
  usedToday: number;
  usedThisHour: number;
  usedThisMinute: number;
}

export interface QuotaCheckResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  reason?: string;
}

export interface QuotaUsageSnapshot {
  workspaceId: string;
  timestamp: Date;
  totalUsedMinute: number;
  totalUsedHour: number;
  totalUsedDay: number;
  percentageUsedMinute: number;
  percentageUsedHour: number;
  percentageUsedDay: number;
  memberUsage: MemberQuota[];
}
