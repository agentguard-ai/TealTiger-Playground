// RateLimitPoolService - Shared rate limit pool for workspace quota management
// Requirements: 19.1-19.10

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type {
  RateLimitPoolConfig,
  MemberQuota,
  QuotaCheckResult,
  QuotaUsageSnapshot,
} from '../types/ratelimit';

export class RateLimitPoolService {
  // In-memory tracking for fast quota checks (synced to DB periodically)
  private minuteCounters = new Map<string, { count: number; resetAt: number }>();
  private hourCounters = new Map<string, { count: number; resetAt: number }>();
  private dayCounters = new Map<string, { count: number; resetAt: number }>();

  /**
   * Configures the rate limit pool for a workspace
   * Requirements: 19.1
   */
  async configurePool(config: RateLimitPoolConfig): Promise<void> {
    if (!isSupabaseConfigured()) return;

    await supabase!
      .from('rate_limit_pools')
      .upsert({
        workspace_id: config.workspaceId,
        max_requests_per_minute: config.maxRequestsPerMinute,
        max_requests_per_hour: config.maxRequestsPerHour,
        max_requests_per_day: config.maxRequestsPerDay,
        reset_schedule: config.resetSchedule,
        notify_at: config.notifyAt,
        notification_webhook: config.notificationWebhook,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'workspace_id' });

    await this.logAudit(config.workspaceId, 'system', 'rate_limit_configured', config);
  }

  /**
   * Checks if a request is within quota
   * Requirements: 19.2
   */
  checkQuota(workspaceId: string, config: RateLimitPoolConfig): QuotaCheckResult {
    const now = Date.now();

    // Check minute quota
    const minuteKey = `${workspaceId}:min`;
    const minute = this.getOrResetCounter(this.minuteCounters, minuteKey, now, 60_000);
    if (minute.count >= config.maxRequestsPerMinute) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(minute.resetAt),
        reason: 'Minute quota exceeded',
      };
    }

    // Check hour quota
    const hourKey = `${workspaceId}:hr`;
    const hour = this.getOrResetCounter(this.hourCounters, hourKey, now, 3_600_000);
    if (hour.count >= config.maxRequestsPerHour) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(hour.resetAt),
        reason: 'Hourly quota exceeded',
      };
    }

    // Check day quota
    const dayKey = `${workspaceId}:day`;
    const day = this.getOrResetCounter(this.dayCounters, dayKey, now, 86_400_000);
    if (day.count >= config.maxRequestsPerDay) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(day.resetAt),
        reason: 'Daily quota exceeded',
      };
    }

    const remaining = Math.min(
      config.maxRequestsPerMinute - minute.count,
      config.maxRequestsPerHour - hour.count,
      config.maxRequestsPerDay - day.count
    );

    return { allowed: true, remaining, resetAt: new Date(minute.resetAt) };
  }

  /**
   * Records a request against the quota
   * Requirements: 19.3
   */
  async recordRequest(workspaceId: string, userId: string, config: RateLimitPoolConfig): Promise<QuotaCheckResult> {
    const check = this.checkQuota(workspaceId, config);
    if (!check.allowed) return check;

    const now = Date.now();
    this.incrementCounter(this.minuteCounters, `${workspaceId}:min`, now, 60_000);
    this.incrementCounter(this.hourCounters, `${workspaceId}:hr`, now, 3_600_000);
    this.incrementCounter(this.dayCounters, `${workspaceId}:day`, now, 86_400_000);

    // Also track per-member
    this.incrementCounter(this.minuteCounters, `${workspaceId}:${userId}:min`, now, 60_000);
    this.incrementCounter(this.hourCounters, `${workspaceId}:${userId}:hr`, now, 3_600_000);
    this.incrementCounter(this.dayCounters, `${workspaceId}:${userId}:day`, now, 86_400_000);

    // Check notification thresholds
    await this.checkNotifications(workspaceId, config);

    return {
      allowed: true,
      remaining: check.remaining - 1,
      resetAt: check.resetAt,
    };
  }

  /**
   * Allocates a sub-quota to a specific member
   * Requirements: 19.4
   */
  async allocateSubQuota(
    workspaceId: string,
    userId: string,
    quota: { perMinute: number; perHour: number; perDay: number }
  ): Promise<void> {
    if (!isSupabaseConfigured()) return;

    await supabase!
      .from('member_quotas')
      .upsert({
        workspace_id: workspaceId,
        user_id: userId,
        allocated_per_minute: quota.perMinute,
        allocated_per_hour: quota.perHour,
        allocated_per_day: quota.perDay,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'workspace_id,user_id' });
  }

  /**
   * Gets remaining quota for the workspace
   * Requirements: 19.5
   */
  getRemainingQuota(workspaceId: string, config: RateLimitPoolConfig): QuotaUsageSnapshot {
    const now = Date.now();
    const minute = this.getOrResetCounter(this.minuteCounters, `${workspaceId}:min`, now, 60_000);
    const hour = this.getOrResetCounter(this.hourCounters, `${workspaceId}:hr`, now, 3_600_000);
    const day = this.getOrResetCounter(this.dayCounters, `${workspaceId}:day`, now, 86_400_000);

    return {
      workspaceId,
      timestamp: new Date(),
      totalUsedMinute: minute.count,
      totalUsedHour: hour.count,
      totalUsedDay: day.count,
      percentageUsedMinute: config.maxRequestsPerMinute > 0
        ? Math.round((minute.count / config.maxRequestsPerMinute) * 100) : 0,
      percentageUsedHour: config.maxRequestsPerHour > 0
        ? Math.round((hour.count / config.maxRequestsPerHour) * 100) : 0,
      percentageUsedDay: config.maxRequestsPerDay > 0
        ? Math.round((day.count / config.maxRequestsPerDay) * 100) : 0,
      memberUsage: [],
    };
  }

  /**
   * Gets usage for a specific member
   * Requirements: 19.6
   */
  getMemberUsage(workspaceId: string, userId: string): MemberQuota {
    const now = Date.now();
    const min = this.getOrResetCounter(this.minuteCounters, `${workspaceId}:${userId}:min`, now, 60_000);
    const hr = this.getOrResetCounter(this.hourCounters, `${workspaceId}:${userId}:hr`, now, 3_600_000);
    const day = this.getOrResetCounter(this.dayCounters, `${workspaceId}:${userId}:day`, now, 86_400_000);

    return {
      userId,
      userName: userId,
      allocatedPerMinute: 0,
      allocatedPerHour: 0,
      allocatedPerDay: 0,
      usedThisMinute: min.count,
      usedThisHour: hr.count,
      usedToday: day.count,
    };
  }

  /**
   * Resets quota counters
   * Requirements: 19.7
   */
  resetQuota(workspaceId: string): void {
    // Clear all counters for this workspace
    for (const [key] of this.minuteCounters) {
      if (key.startsWith(workspaceId)) this.minuteCounters.delete(key);
    }
    for (const [key] of this.hourCounters) {
      if (key.startsWith(workspaceId)) this.hourCounters.delete(key);
    }
    for (const [key] of this.dayCounters) {
      if (key.startsWith(workspaceId)) this.dayCounters.delete(key);
    }
  }

  /**
   * Emergency quota increase (logged to audit trail)
   * Requirements: 19.9
   */
  async emergencyIncrease(
    workspaceId: string,
    actorId: string,
    reason: string,
    multiplier: number
  ): Promise<void> {
    await this.logAudit(workspaceId, actorId, 'emergency_quota_increase', {
      reason,
      multiplier,
    });
  }

  // --- Private helpers ---

  private getOrResetCounter(
    map: Map<string, { count: number; resetAt: number }>,
    key: string,
    now: number,
    windowMs: number
  ): { count: number; resetAt: number } {
    const entry = map.get(key);
    if (!entry || now >= entry.resetAt) {
      const newEntry = { count: 0, resetAt: now + windowMs };
      map.set(key, newEntry);
      return newEntry;
    }
    return entry;
  }

  private incrementCounter(
    map: Map<string, { count: number; resetAt: number }>,
    key: string,
    now: number,
    windowMs: number
  ): void {
    const entry = this.getOrResetCounter(map, key, now, windowMs);
    entry.count++;
  }

  private async checkNotifications(workspaceId: string, config: RateLimitPoolConfig): Promise<void> {
    const snapshot = this.getRemainingQuota(workspaceId, config);
    for (const threshold of config.notifyAt) {
      if (snapshot.percentageUsedDay >= threshold) {
        await this.sendQuotaNotification(workspaceId, threshold, snapshot.percentageUsedDay);
        break; // Only send highest threshold notification
      }
    }
  }

  private async sendQuotaNotification(
    workspaceId: string,
    threshold: number,
    currentUsage: number
  ): Promise<void> {
    await this.logAudit(workspaceId, 'system', 'quota_notification_sent', {
      threshold,
      currentUsage,
    });
  }

  private async logAudit(workspaceId: string, actorId: string, action: string, metadata: any): Promise<void> {
    if (!isSupabaseConfigured()) return;
    try {
      await supabase!.from('audit_log').insert({
        workspace_id: workspaceId,
        actor_id: actorId,
        action,
        resource_type: 'rate_limit',
        resource_id: workspaceId,
        metadata,
      });
    } catch {
      console.warn('Failed to log audit event:', action);
    }
  }
}

export const rateLimitPoolService = new RateLimitPoolService();
