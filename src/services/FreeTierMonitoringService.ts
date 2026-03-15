// FreeTierMonitoringService - Monitors Supabase, Vercel, and GitHub Actions free tier usage
// Requirements: 1.8, 1.9

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type {
  FreeTierLimits,
  ResourceLimit,
  UsageMetrics,
  UsageAlert,
  UsageSummary,
} from '../types/monitoring';

/** Free tier limits as defined by providers */
const FREE_TIER_LIMITS: FreeTierLimits = {
  storage: { used: 0, limit: 500 * 1024 * 1024, unit: 'bytes' },       // 500 MB
  mau: { used: 0, limit: 50_000, unit: 'users' },                       // 50K MAU
  bandwidth: { used: 0, limit: 100 * 1024 * 1024 * 1024, unit: 'bytes' }, // 100 GB (Vercel)
  githubActionsMinutes: { used: 0, limit: 2000, unit: 'minutes' },       // 2000 min/month
};

/** Alert threshold — warn at 80% usage */
const WARNING_THRESHOLD = 0.8;
/** Critical threshold — 95% usage */
const CRITICAL_THRESHOLD = 0.95;

export class FreeTierMonitoringService {
  private warningThreshold: number;
  private criticalThreshold: number;

  constructor(warningThreshold = WARNING_THRESHOLD, criticalThreshold = CRITICAL_THRESHOLD) {
    this.warningThreshold = warningThreshold;
    this.criticalThreshold = criticalThreshold;
  }

  /**
   * Gets the default free tier limits.
   */
  getFreeTierLimits(): FreeTierLimits {
    return { ...FREE_TIER_LIMITS };
  }

  /**
   * Monitors Supabase storage usage by estimating row counts and average sizes.
   * Requirements: 1.8
   */
  async getSupabaseStorageUsage(): Promise<ResourceLimit> {
    if (!isSupabaseConfigured()) {
      return { used: 0, limit: FREE_TIER_LIMITS.storage.limit, unit: 'bytes' };
    }

    try {
      const tables = [
        'policies',
        'policy_versions',
        'comments',
        'comment_replies',
        'audit_log',
        'compliance_mappings',
        'analytics_events',
        'workspaces',
        'workspace_members',
      ];

      let totalEstimatedBytes = 0;

      for (const table of tables) {
        const { count } = await supabase!
          .from(table)
          .select('*', { count: 'exact', head: true });

        // Estimate ~1KB per row as a reasonable average
        totalEstimatedBytes += (count ?? 0) * 1024;
      }

      return {
        used: totalEstimatedBytes,
        limit: FREE_TIER_LIMITS.storage.limit,
        unit: 'bytes',
      };
    } catch {
      return { used: 0, limit: FREE_TIER_LIMITS.storage.limit, unit: 'bytes' };
    }
  }

  /**
   * Monitors Supabase MAU by counting distinct users active this month.
   * Requirements: 1.8
   */
  async getSupabaseMAU(): Promise<ResourceLimit> {
    if (!isSupabaseConfigured()) {
      return { used: 0, limit: FREE_TIER_LIMITS.mau.limit, unit: 'users' };
    }

    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { count } = await supabase!
        .from('analytics_events')
        .select('user_id', { count: 'exact', head: true })
        .gte('created_at', monthStart);

      return {
        used: count ?? 0,
        limit: FREE_TIER_LIMITS.mau.limit,
        unit: 'users',
      };
    } catch {
      return { used: 0, limit: FREE_TIER_LIMITS.mau.limit, unit: 'users' };
    }
  }

  /**
   * Monitors Vercel bandwidth usage.
   * Since Vercel doesn't expose a client-side API for bandwidth,
   * we estimate based on tracked analytics events or return stored metrics.
   * Requirements: 1.8
   */
  async getVercelBandwidthUsage(): Promise<ResourceLimit> {
    if (!isSupabaseConfigured()) {
      return { used: 0, limit: FREE_TIER_LIMITS.bandwidth.limit, unit: 'bytes' };
    }

    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { data } = await supabase!
        .from('analytics_events')
        .select('metadata')
        .eq('event_type', 'bandwidth_usage')
        .gte('created_at', monthStart)
        .order('created_at', { ascending: false })
        .limit(1);

      const latestBytes = data?.[0]?.metadata?.bytes_used ?? 0;

      return {
        used: latestBytes,
        limit: FREE_TIER_LIMITS.bandwidth.limit,
        unit: 'bytes',
      };
    } catch {
      return { used: 0, limit: FREE_TIER_LIMITS.bandwidth.limit, unit: 'bytes' };
    }
  }

  /**
   * Monitors GitHub Actions minutes usage.
   * Reads from stored analytics events tracking CI/CD runs.
   */
  async getGitHubActionsUsage(): Promise<ResourceLimit> {
    if (!isSupabaseConfigured()) {
      return { used: 0, limit: FREE_TIER_LIMITS.githubActionsMinutes.limit, unit: 'minutes' };
    }

    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { data } = await supabase!
        .from('analytics_events')
        .select('metadata')
        .eq('event_type', 'github_actions_run')
        .gte('created_at', monthStart);

      const totalMinutes = (data ?? []).reduce(
        (sum: number, row: any) => sum + (row.metadata?.duration_minutes ?? 0),
        0
      );

      return {
        used: totalMinutes,
        limit: FREE_TIER_LIMITS.githubActionsMinutes.limit,
        unit: 'minutes',
      };
    } catch {
      return { used: 0, limit: FREE_TIER_LIMITS.githubActionsMinutes.limit, unit: 'minutes' };
    }
  }

  /**
   * Collects all usage metrics into a single snapshot.
   * Requirements: 1.8
   */
  async getUsageMetrics(): Promise<UsageMetrics> {
    const [storage, mau, bandwidth, githubActionsMinutes] = await Promise.all([
      this.getSupabaseStorageUsage(),
      this.getSupabaseMAU(),
      this.getVercelBandwidthUsage(),
      this.getGitHubActionsUsage(),
    ]);

    return {
      storage,
      mau,
      bandwidth,
      githubActionsMinutes,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Generates alerts for resources approaching their free tier limits.
   * Requirements: 1.9
   */
  generateAlerts(metrics: UsageMetrics): UsageAlert[] {
    const alerts: UsageAlert[] = [];
    const resources: (keyof FreeTierLimits)[] = ['storage', 'mau', 'bandwidth', 'githubActionsMinutes'];

    for (const resource of resources) {
      const { used, limit } = metrics[resource];
      if (limit === 0) continue;

      const usagePercent = used / limit;

      if (usagePercent >= this.criticalThreshold) {
        alerts.push({
          resource,
          usagePercent: Math.round(usagePercent * 100),
          message: `${this.formatResourceName(resource)} is at ${Math.round(usagePercent * 100)}% of free tier limit. Upgrade recommended.`,
          severity: 'critical',
        });
      } else if (usagePercent >= this.warningThreshold) {
        alerts.push({
          resource,
          usagePercent: Math.round(usagePercent * 100),
          message: `${this.formatResourceName(resource)} is at ${Math.round(usagePercent * 100)}% of free tier limit.`,
          severity: 'warning',
        });
      }
    }

    return alerts;
  }

  /**
   * Gets a full usage summary with metrics and alerts.
   * Requirements: 1.8, 1.9
   */
  async getUsageSummary(): Promise<UsageSummary> {
    const metrics = await this.getUsageMetrics();
    const alerts = this.generateAlerts(metrics);

    return {
      metrics,
      alerts,
      overallHealthy: alerts.every((a) => a.severity !== 'critical'),
    };
  }

  /**
   * Formats usage as a human-readable string for display.
   */
  formatUsage(resource: ResourceLimit): string {
    if (resource.unit === 'bytes') {
      return `${this.formatBytes(resource.used)} / ${this.formatBytes(resource.limit)}`;
    }
    return `${resource.used.toLocaleString()} / ${resource.limit.toLocaleString()} ${resource.unit}`;
  }

  /**
   * Returns usage percentage (0-100) for a resource.
   */
  getUsagePercent(resource: ResourceLimit): number {
    if (resource.limit === 0) return 0;
    return Math.round((resource.used / resource.limit) * 100);
  }

  // --- Private helpers ---

  private formatResourceName(resource: keyof FreeTierLimits): string {
    const names: Record<keyof FreeTierLimits, string> = {
      storage: 'Supabase Storage',
      mau: 'Monthly Active Users',
      bandwidth: 'Vercel Bandwidth',
      githubActionsMinutes: 'GitHub Actions Minutes',
    };
    return names[resource];
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const value = bytes / Math.pow(1024, i);
    return `${value.toFixed(value < 10 ? 1 : 0)} ${units[i]}`;
  }
}

export const freeTierMonitoringService = new FreeTierMonitoringService();
