// Unit tests for FreeTierMonitoringService
// Requirements: 1.8, 1.9

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FreeTierMonitoringService } from '../../services/FreeTierMonitoringService';
import type { UsageMetrics, ResourceLimit } from '../../types/monitoring';

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

describe('FreeTierMonitoringService', () => {
  let service: FreeTierMonitoringService;

  beforeEach(() => {
    service = new FreeTierMonitoringService();
    vi.clearAllMocks();
  });

  describe('getFreeTierLimits', () => {
    it('should return correct free tier limits', () => {
      const limits = service.getFreeTierLimits();

      expect(limits.storage.limit).toBe(500 * 1024 * 1024); // 500MB
      expect(limits.mau.limit).toBe(50_000);
      expect(limits.bandwidth.limit).toBe(100 * 1024 * 1024 * 1024); // 100GB
      expect(limits.githubActionsMinutes.limit).toBe(2000);
    });
  });

  describe('getSupabaseStorageUsage', () => {
    it('should estimate storage from row counts across tables', async () => {
      mockFrom.mockImplementation(() =>
        buildChain({ count: 100, data: null, error: null })
      );

      const result = await service.getSupabaseStorageUsage();

      // 9 tables × 100 rows × 1024 bytes = 921,600
      expect(result.used).toBe(9 * 100 * 1024);
      expect(result.limit).toBe(500 * 1024 * 1024);
      expect(result.unit).toBe('bytes');
    });

    it('should return zero usage on error', async () => {
      mockFrom.mockImplementation(() => {
        throw new Error('DB error');
      });

      const result = await service.getSupabaseStorageUsage();
      expect(result.used).toBe(0);
    });
  });

  describe('getSupabaseMAU', () => {
    it('should return MAU count from analytics events', async () => {
      mockFrom.mockImplementation(() =>
        buildChain({ count: 1200, data: null, error: null })
      );

      const result = await service.getSupabaseMAU();

      expect(result.used).toBe(1200);
      expect(result.limit).toBe(50_000);
      expect(result.unit).toBe('users');
    });
  });

  describe('getVercelBandwidthUsage', () => {
    it('should return bandwidth from latest analytics event', async () => {
      mockFrom.mockImplementation(() =>
        buildChain({
          data: [{ metadata: { bytes_used: 5_000_000_000 } }],
          error: null,
        })
      );

      const result = await service.getVercelBandwidthUsage();

      expect(result.used).toBe(5_000_000_000);
      expect(result.limit).toBe(100 * 1024 * 1024 * 1024);
      expect(result.unit).toBe('bytes');
    });

    it('should return zero when no bandwidth data exists', async () => {
      mockFrom.mockImplementation(() =>
        buildChain({ data: [], error: null })
      );

      const result = await service.getVercelBandwidthUsage();
      expect(result.used).toBe(0);
    });
  });

  describe('getGitHubActionsUsage', () => {
    it('should sum duration_minutes from analytics events', async () => {
      mockFrom.mockImplementation(() =>
        buildChain({
          data: [
            { metadata: { duration_minutes: 15 } },
            { metadata: { duration_minutes: 30 } },
            { metadata: { duration_minutes: 5 } },
          ],
          error: null,
        })
      );

      const result = await service.getGitHubActionsUsage();

      expect(result.used).toBe(50);
      expect(result.limit).toBe(2000);
      expect(result.unit).toBe('minutes');
    });
  });

  describe('generateAlerts', () => {
    function makeMetrics(overrides: Partial<Record<string, Partial<ResourceLimit>>> = {}): UsageMetrics {
      return {
        storage: { used: 0, limit: 500 * 1024 * 1024, unit: 'bytes', ...overrides.storage },
        mau: { used: 0, limit: 50_000, unit: 'users', ...overrides.mau },
        bandwidth: { used: 0, limit: 100 * 1024 * 1024 * 1024, unit: 'bytes', ...overrides.bandwidth },
        githubActionsMinutes: { used: 0, limit: 2000, unit: 'minutes', ...overrides.githubActionsMinutes },
        lastUpdated: new Date().toISOString(),
      };
    }

    it('should return no alerts when usage is below 80%', () => {
      const metrics = makeMetrics({
        storage: { used: 100 * 1024 * 1024 }, // 100MB / 500MB = 20%
      });

      const alerts = service.generateAlerts(metrics);
      expect(alerts).toHaveLength(0);
    });

    it('should return warning alert at 80% usage', () => {
      const metrics = makeMetrics({
        storage: { used: 400 * 1024 * 1024 }, // 400MB / 500MB = 80%
      });

      const alerts = service.generateAlerts(metrics);
      expect(alerts).toHaveLength(1);
      expect(alerts[0].severity).toBe('warning');
      expect(alerts[0].resource).toBe('storage');
      expect(alerts[0].usagePercent).toBe(80);
    });

    it('should return critical alert at 95% usage', () => {
      const metrics = makeMetrics({
        mau: { used: 48_000 }, // 48000 / 50000 = 96%
      });

      const alerts = service.generateAlerts(metrics);
      expect(alerts).toHaveLength(1);
      expect(alerts[0].severity).toBe('critical');
      expect(alerts[0].resource).toBe('mau');
    });

    it('should return multiple alerts for multiple resources', () => {
      const metrics = makeMetrics({
        storage: { used: 450 * 1024 * 1024 },  // 90% → warning
        mau: { used: 49_000 },                   // 98% → critical
        githubActionsMinutes: { used: 1700 },    // 85% → warning
      });

      const alerts = service.generateAlerts(metrics);
      expect(alerts).toHaveLength(3);

      const critical = alerts.filter((a) => a.severity === 'critical');
      const warning = alerts.filter((a) => a.severity === 'warning');
      expect(critical).toHaveLength(1);
      expect(warning).toHaveLength(2);
    });

    it('should include upgrade recommendation in critical alerts', () => {
      const metrics = makeMetrics({
        bandwidth: { used: 98 * 1024 * 1024 * 1024 }, // ~98%
      });

      const alerts = service.generateAlerts(metrics);
      expect(alerts[0].message).toContain('Upgrade recommended');
    });
  });

  describe('getUsageSummary', () => {
    it('should return healthy summary when no critical alerts', async () => {
      // All queries return low usage
      mockFrom.mockImplementation(() =>
        buildChain({ count: 10, data: [], error: null })
      );

      const summary = await service.getUsageSummary();

      expect(summary.metrics).toBeDefined();
      expect(summary.alerts).toHaveLength(0);
      expect(summary.overallHealthy).toBe(true);
    });
  });

  describe('formatUsage', () => {
    it('should format byte-based resources with human-readable units', () => {
      const resource: ResourceLimit = {
        used: 250 * 1024 * 1024,
        limit: 500 * 1024 * 1024,
        unit: 'bytes',
      };

      const formatted = service.formatUsage(resource);
      expect(formatted).toContain('250');
      expect(formatted).toContain('MB');
      expect(formatted).toContain('500');
    });

    it('should format non-byte resources with locale strings', () => {
      const resource: ResourceLimit = {
        used: 1500,
        limit: 2000,
        unit: 'minutes',
      };

      const formatted = service.formatUsage(resource);
      expect(formatted).toContain('1,500');
      expect(formatted).toContain('2,000');
      expect(formatted).toContain('minutes');
    });
  });

  describe('getUsagePercent', () => {
    it('should return correct percentage', () => {
      const resource: ResourceLimit = { used: 250, limit: 1000, unit: 'units' };
      expect(service.getUsagePercent(resource)).toBe(25);
    });

    it('should return 0 when limit is 0', () => {
      const resource: ResourceLimit = { used: 100, limit: 0, unit: 'units' };
      expect(service.getUsagePercent(resource)).toBe(0);
    });
  });
});
