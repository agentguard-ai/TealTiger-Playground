// Free tier limits testing
// Task 8.5.3: Test free tier limits
// Requirements: 1.8, 1.9

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FreeTierMonitoringService } from '../../services/FreeTierMonitoringService';
import type { UsageMetrics, ResourceLimit, FreeTierLimits } from '../../types/monitoring';

// Mock Supabase
const mockFrom = vi.fn();
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
  isSupabaseConfigured: () => true,
}));

// Chainable Supabase query mock
function buildChain(result: { data?: any; error?: any; count?: number | null }) {
  const chain: any = {};
  const methods = ['select', 'eq', 'gte', 'lte', 'order', 'limit', 'single'];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }
  chain.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject);
  return chain;
}

/** Helper to build UsageMetrics with overrides */
function makeMetrics(
  overrides: Partial<Record<keyof FreeTierLimits, Partial<ResourceLimit>>> = {}
): UsageMetrics {
  return {
    storage: { used: 0, limit: 500 * 1024 * 1024, unit: 'bytes', ...overrides.storage },
    mau: { used: 0, limit: 50_000, unit: 'users', ...overrides.mau },
    bandwidth: { used: 0, limit: 100 * 1024 * 1024 * 1024, unit: 'bytes', ...overrides.bandwidth },
    githubActionsMinutes: { used: 0, limit: 2000, unit: 'minutes', ...overrides.githubActionsMinutes },
    lastUpdated: new Date().toISOString(),
  };
}

const STORAGE_LIMIT = 500 * 1024 * 1024;       // 500MB in bytes
const BANDWIDTH_LIMIT = 100 * 1024 * 1024 * 1024; // 100GB in bytes
const MAU_LIMIT = 50_000;
const ACTIONS_LIMIT = 2000;

describe('Free Tier Limits Testing', () => {
  let service: FreeTierMonitoringService;

  beforeEach(() => {
    service = new FreeTierMonitoringService();
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------
  // 1. Supabase 500MB storage limit
  // -----------------------------------------------------------
  describe('Supabase 500MB storage limit', () => {
    it('should define storage limit as 500MB', () => {
      const limits = service.getFreeTierLimits();
      expect(limits.storage.limit).toBe(STORAGE_LIMIT);
      expect(limits.storage.unit).toBe('bytes');
    });

    it('should detect usage below 80% as safe (no alerts)', () => {
      const metrics = makeMetrics({ storage: { used: 300 * 1024 * 1024 } }); // 300MB = 60%
      const alerts = service.generateAlerts(metrics);
      const storageAlerts = alerts.filter((a) => a.resource === 'storage');
      expect(storageAlerts).toHaveLength(0);
    });

    it('should generate warning at exactly 80% (400MB)', () => {
      const metrics = makeMetrics({ storage: { used: 400 * 1024 * 1024 } }); // 400MB = 80%
      const alerts = service.generateAlerts(metrics);
      const storageAlerts = alerts.filter((a) => a.resource === 'storage');
      expect(storageAlerts).toHaveLength(1);
      expect(storageAlerts[0].severity).toBe('warning');
      expect(storageAlerts[0].usagePercent).toBe(80);
    });

    it('should generate warning between 80% and 95%', () => {
      const metrics = makeMetrics({ storage: { used: 450 * 1024 * 1024 } }); // 450MB = 90%
      const alerts = service.generateAlerts(metrics);
      const storageAlerts = alerts.filter((a) => a.resource === 'storage');
      expect(storageAlerts).toHaveLength(1);
      expect(storageAlerts[0].severity).toBe('warning');
      expect(storageAlerts[0].usagePercent).toBe(90);
    });

    it('should generate critical alert at 95%+ (475MB)', () => {
      const metrics = makeMetrics({ storage: { used: 475 * 1024 * 1024 } }); // 475MB = 95%
      const alerts = service.generateAlerts(metrics);
      const storageAlerts = alerts.filter((a) => a.resource === 'storage');
      expect(storageAlerts).toHaveLength(1);
      expect(storageAlerts[0].severity).toBe('critical');
      expect(storageAlerts[0].message).toContain('Upgrade recommended');
    });

    it('should report correct usage percentage for storage', () => {
      const resource: ResourceLimit = { used: 250 * 1024 * 1024, limit: STORAGE_LIMIT, unit: 'bytes' };
      expect(service.getUsagePercent(resource)).toBe(50);
    });

    it('should estimate storage from Supabase table row counts', async () => {
      mockFrom.mockImplementation(() =>
        buildChain({ count: 200, data: null, error: null })
      );
      const result = await service.getSupabaseStorageUsage();
      // 9 tables × 200 rows × 1024 bytes = 1,843,200
      expect(result.used).toBe(9 * 200 * 1024);
      expect(result.limit).toBe(STORAGE_LIMIT);
    });
  });

  // -----------------------------------------------------------
  // 2. Supabase 50K MAU limit
  // -----------------------------------------------------------
  describe('Supabase 50K MAU limit', () => {
    it('should define MAU limit as 50,000', () => {
      const limits = service.getFreeTierLimits();
      expect(limits.mau.limit).toBe(MAU_LIMIT);
      expect(limits.mau.unit).toBe('users');
    });

    it('should detect MAU usage below 80% as safe', () => {
      const metrics = makeMetrics({ mau: { used: 30_000 } }); // 60%
      const alerts = service.generateAlerts(metrics);
      const mauAlerts = alerts.filter((a) => a.resource === 'mau');
      expect(mauAlerts).toHaveLength(0);
    });

    it('should generate warning at exactly 80% (40K MAU)', () => {
      const metrics = makeMetrics({ mau: { used: 40_000 } }); // 80%
      const alerts = service.generateAlerts(metrics);
      const mauAlerts = alerts.filter((a) => a.resource === 'mau');
      expect(mauAlerts).toHaveLength(1);
      expect(mauAlerts[0].severity).toBe('warning');
      expect(mauAlerts[0].usagePercent).toBe(80);
    });

    it('should generate critical alert at 95%+ (48K MAU)', () => {
      const metrics = makeMetrics({ mau: { used: 48_000 } }); // 96%
      const alerts = service.generateAlerts(metrics);
      const mauAlerts = alerts.filter((a) => a.resource === 'mau');
      expect(mauAlerts).toHaveLength(1);
      expect(mauAlerts[0].severity).toBe('critical');
      expect(mauAlerts[0].message).toContain('Upgrade recommended');
    });

    it('should fetch MAU count from analytics events', async () => {
      mockFrom.mockImplementation(() =>
        buildChain({ count: 25_000, data: null, error: null })
      );
      const result = await service.getSupabaseMAU();
      expect(result.used).toBe(25_000);
      expect(result.limit).toBe(MAU_LIMIT);
      expect(result.unit).toBe('users');
    });

    it('should report correct MAU usage percentage', () => {
      const resource: ResourceLimit = { used: 40_000, limit: MAU_LIMIT, unit: 'users' };
      expect(service.getUsagePercent(resource)).toBe(80);
    });
  });

  // -----------------------------------------------------------
  // 3. Vercel 100GB bandwidth limit
  // -----------------------------------------------------------
  describe('Vercel 100GB bandwidth limit', () => {
    it('should define bandwidth limit as 100GB', () => {
      const limits = service.getFreeTierLimits();
      expect(limits.bandwidth.limit).toBe(BANDWIDTH_LIMIT);
      expect(limits.bandwidth.unit).toBe('bytes');
    });

    it('should detect bandwidth usage below 80% as safe', () => {
      const metrics = makeMetrics({ bandwidth: { used: 50 * 1024 * 1024 * 1024 } }); // 50GB = 50%
      const alerts = service.generateAlerts(metrics);
      const bwAlerts = alerts.filter((a) => a.resource === 'bandwidth');
      expect(bwAlerts).toHaveLength(0);
    });

    it('should generate warning at exactly 80% (80GB)', () => {
      const used80 = Math.floor(BANDWIDTH_LIMIT * 0.8);
      const metrics = makeMetrics({ bandwidth: { used: used80 } });
      const alerts = service.generateAlerts(metrics);
      const bwAlerts = alerts.filter((a) => a.resource === 'bandwidth');
      expect(bwAlerts).toHaveLength(1);
      expect(bwAlerts[0].severity).toBe('warning');
      expect(bwAlerts[0].usagePercent).toBe(80);
    });

    it('should generate critical alert at 95%+ bandwidth', () => {
      const used96 = Math.floor(BANDWIDTH_LIMIT * 0.96);
      const metrics = makeMetrics({ bandwidth: { used: used96 } });
      const alerts = service.generateAlerts(metrics);
      const bwAlerts = alerts.filter((a) => a.resource === 'bandwidth');
      expect(bwAlerts).toHaveLength(1);
      expect(bwAlerts[0].severity).toBe('critical');
      expect(bwAlerts[0].message).toContain('Upgrade recommended');
    });

    it('should fetch bandwidth from latest analytics event', async () => {
      mockFrom.mockImplementation(() =>
        buildChain({
          data: [{ metadata: { bytes_used: 60 * 1024 * 1024 * 1024 } }],
          error: null,
        })
      );
      const result = await service.getVercelBandwidthUsage();
      expect(result.used).toBe(60 * 1024 * 1024 * 1024);
      expect(result.limit).toBe(BANDWIDTH_LIMIT);
    });

    it('should report correct bandwidth usage percentage', () => {
      const resource: ResourceLimit = { used: 80 * 1024 * 1024 * 1024, limit: BANDWIDTH_LIMIT, unit: 'bytes' };
      expect(service.getUsagePercent(resource)).toBe(80);
    });
  });

  // -----------------------------------------------------------
  // 4. GitHub Actions 2,000 min/month limit
  // -----------------------------------------------------------
  describe('GitHub Actions 2,000 min/month limit', () => {
    it('should define GitHub Actions limit as 2,000 minutes', () => {
      const limits = service.getFreeTierLimits();
      expect(limits.githubActionsMinutes.limit).toBe(ACTIONS_LIMIT);
      expect(limits.githubActionsMinutes.unit).toBe('minutes');
    });

    it('should detect actions usage below 80% as safe', () => {
      const metrics = makeMetrics({ githubActionsMinutes: { used: 1000 } }); // 50%
      const alerts = service.generateAlerts(metrics);
      const actionsAlerts = alerts.filter((a) => a.resource === 'githubActionsMinutes');
      expect(actionsAlerts).toHaveLength(0);
    });

    it('should generate warning at exactly 80% (1,600 min)', () => {
      const metrics = makeMetrics({ githubActionsMinutes: { used: 1600 } }); // 80%
      const alerts = service.generateAlerts(metrics);
      const actionsAlerts = alerts.filter((a) => a.resource === 'githubActionsMinutes');
      expect(actionsAlerts).toHaveLength(1);
      expect(actionsAlerts[0].severity).toBe('warning');
      expect(actionsAlerts[0].usagePercent).toBe(80);
    });

    it('should generate critical alert at 95%+ (1,950 min)', () => {
      const metrics = makeMetrics({ githubActionsMinutes: { used: 1950 } }); // 97.5%
      const alerts = service.generateAlerts(metrics);
      const actionsAlerts = alerts.filter((a) => a.resource === 'githubActionsMinutes');
      expect(actionsAlerts).toHaveLength(1);
      expect(actionsAlerts[0].severity).toBe('critical');
      expect(actionsAlerts[0].message).toContain('Upgrade recommended');
    });

    it('should sum duration_minutes from analytics events', async () => {
      mockFrom.mockImplementation(() =>
        buildChain({
          data: [
            { metadata: { duration_minutes: 500 } },
            { metadata: { duration_minutes: 300 } },
            { metadata: { duration_minutes: 200 } },
          ],
          error: null,
        })
      );
      const result = await service.getGitHubActionsUsage();
      expect(result.used).toBe(1000);
      expect(result.limit).toBe(ACTIONS_LIMIT);
      expect(result.unit).toBe('minutes');
    });

    it('should report correct actions usage percentage', () => {
      const resource: ResourceLimit = { used: 1600, limit: ACTIONS_LIMIT, unit: 'minutes' };
      expect(service.getUsagePercent(resource)).toBe(80);
    });
  });

  // -----------------------------------------------------------
  // 5. Warning display behavior when approaching limits
  // -----------------------------------------------------------
  describe('warning display at 80% threshold', () => {
    it('should not warn at 79% usage', () => {
      const metrics = makeMetrics({
        storage: { used: Math.floor(STORAGE_LIMIT * 0.79) },
      });
      const alerts = service.generateAlerts(metrics);
      expect(alerts).toHaveLength(0);
    });

    it('should warn at exactly 80% for all resources simultaneously', () => {
      const metrics = makeMetrics({
        storage: { used: Math.floor(STORAGE_LIMIT * 0.8) },
        mau: { used: Math.floor(MAU_LIMIT * 0.8) },
        bandwidth: { used: Math.floor(BANDWIDTH_LIMIT * 0.8) },
        githubActionsMinutes: { used: Math.floor(ACTIONS_LIMIT * 0.8) },
      });
      const alerts = service.generateAlerts(metrics);
      expect(alerts).toHaveLength(4);
      alerts.forEach((alert) => {
        expect(alert.severity).toBe('warning');
        expect(alert.usagePercent).toBe(80);
      });
    });

    it('should include resource name in warning message', () => {
      const metrics = makeMetrics({
        storage: { used: Math.floor(STORAGE_LIMIT * 0.85) },
      });
      const alerts = service.generateAlerts(metrics);
      expect(alerts[0].message).toContain('Supabase Storage');
      expect(alerts[0].message).toContain('85%');
    });

    it('should format usage as human-readable string for byte resources', () => {
      const resource: ResourceLimit = { used: 400 * 1024 * 1024, limit: STORAGE_LIMIT, unit: 'bytes' };
      const formatted = service.formatUsage(resource);
      expect(formatted).toContain('400');
      expect(formatted).toContain('MB');
      expect(formatted).toContain('500');
    });

    it('should format usage as human-readable string for non-byte resources', () => {
      const resource: ResourceLimit = { used: 1600, limit: 2000, unit: 'minutes' };
      const formatted = service.formatUsage(resource);
      expect(formatted).toContain('1,600');
      expect(formatted).toContain('2,000');
      expect(formatted).toContain('minutes');
    });
  });

  // -----------------------------------------------------------
  // 6. Alert/notification behavior when limits are exceeded
  // -----------------------------------------------------------
  describe('alert behavior when limits are exceeded', () => {
    it('should generate critical alerts with upgrade recommendation at 95%+', () => {
      const metrics = makeMetrics({
        storage: { used: Math.floor(STORAGE_LIMIT * 0.96) },
        mau: { used: Math.floor(MAU_LIMIT * 0.97) },
        bandwidth: { used: Math.floor(BANDWIDTH_LIMIT * 0.98) },
        githubActionsMinutes: { used: Math.floor(ACTIONS_LIMIT * 0.99) },
      });
      const alerts = service.generateAlerts(metrics);
      expect(alerts).toHaveLength(4);
      alerts.forEach((alert) => {
        expect(alert.severity).toBe('critical');
        expect(alert.message).toContain('Upgrade recommended');
      });
    });

    it('should mark overall health as unhealthy when any critical alert exists', async () => {
      // Mock all queries to return high usage for storage
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        // First 9 calls are storage table counts (high usage)
        if (callCount <= 9) {
          // ~54,000 rows per table → 9 * 54000 * 1024 ≈ 497MB (>95%)
          return buildChain({ count: 54_000, data: null, error: null });
        }
        // Remaining calls return low usage
        return buildChain({ count: 0, data: [], error: null });
      });

      const summary = await service.getUsageSummary();
      expect(summary.overallHealthy).toBe(false);
    });

    it('should mark overall health as healthy when only warning alerts exist', async () => {
      // Mock all queries to return moderate usage
      mockFrom.mockImplementation(() =>
        buildChain({ count: 10, data: [], error: null })
      );

      const summary = await service.getUsageSummary();
      expect(summary.overallHealthy).toBe(true);
    });

    it('should produce mixed warning and critical alerts across resources', () => {
      const metrics = makeMetrics({
        storage: { used: Math.floor(STORAGE_LIMIT * 0.85) },   // warning
        mau: { used: Math.floor(MAU_LIMIT * 0.97) },            // critical
        bandwidth: { used: Math.floor(BANDWIDTH_LIMIT * 0.5) }, // safe
        githubActionsMinutes: { used: Math.floor(ACTIONS_LIMIT * 0.92) }, // warning
      });
      const alerts = service.generateAlerts(metrics);

      const warnings = alerts.filter((a) => a.severity === 'warning');
      const criticals = alerts.filter((a) => a.severity === 'critical');
      expect(warnings).toHaveLength(2);
      expect(criticals).toHaveLength(1);
      expect(criticals[0].resource).toBe('mau');
    });

    it('should handle zero limit gracefully (no division by zero)', () => {
      const resource: ResourceLimit = { used: 100, limit: 0, unit: 'units' };
      expect(service.getUsagePercent(resource)).toBe(0);
    });

    it('should handle usage at exactly 100% as critical', () => {
      const metrics = makeMetrics({
        storage: { used: STORAGE_LIMIT },
      });
      const alerts = service.generateAlerts(metrics);
      const storageAlerts = alerts.filter((a) => a.resource === 'storage');
      expect(storageAlerts).toHaveLength(1);
      expect(storageAlerts[0].severity).toBe('critical');
      expect(storageAlerts[0].usagePercent).toBe(100);
    });
  });
});
