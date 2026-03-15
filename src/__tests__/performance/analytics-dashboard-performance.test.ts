import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnalyticsService } from '@/services/AnalyticsService';
import type { DateRangeConfig } from '@/types/analytics';

/**
 * Performance tests for analytics dashboard operations
 * Validates: Requirements 29.4
 *
 * Tests that the analytics service can compute metrics, generate chart data,
 * export CSV, and filter by date range for 30 days of data within 1s.
 */

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
  isSupabaseConfigured: () => true,
}));

// --- Data generators ---

const PROVIDERS = ['openai', 'anthropic', 'gemini', 'bedrock', 'mistral'];
const MODELS = ['gpt-4', 'claude-3', 'gemini-pro', 'titan', 'mistral-large'];
const ACTIONS: Array<'ALLOW' | 'DENY' | 'MONITOR'> = ['ALLOW', 'DENY', 'MONITOR'];

function generateMockAnalyticsEvents(days: number, eventsPerDay: number) {
  const events: any[] = [];
  const now = new Date();

  for (let d = 0; d < days; d++) {
    for (let e = 0; e < eventsPerDay; e++) {
      const idx = d * eventsPerDay + e;
      const timestamp = new Date(now);
      timestamp.setDate(timestamp.getDate() - d);
      timestamp.setHours(Math.floor(e * 24 / eventsPerDay), (e * 17) % 60, 0, 0);

      events.push({
        id: `event-${idx}`,
        workspace_id: 'workspace-perf',
        policy_id: `policy-${idx % 15}`,
        policy_name: `Policy ${idx % 15}`,
        user_id: `user-${idx % 10}`,
        provider: PROVIDERS[idx % PROVIDERS.length],
        model: MODELS[idx % MODELS.length],
        action: ACTIONS[idx % ACTIONS.length],
        latency_ms: 50 + (idx % 500),
        cost_usd: 0.001 + (idx % 100) * 0.0001,
        tokens_used: 100 + (idx % 2000),
        timestamp: timestamp.toISOString(),
        success: idx % 7 !== 0, // ~85% success rate
      });
    }
  }

  return events;
}

// --- Performance helper ---

async function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; durationMs: number }> {
  const start = performance.now();
  const result = await fn();
  const durationMs = performance.now() - start;
  return { result, durationMs };
}

// 1s budget per Requirement 29.4
const DASHBOARD_THRESHOLD_MS = 1000;

describe('Analytics Dashboard Performance', () => {
  let analyticsService: AnalyticsService;
  let mockSupabase: any;

  const dateRange30d: DateRangeConfig = { range: '30d' };

  beforeEach(async () => {
    analyticsService = new AnalyticsService();
    const supabaseModule = await import('@/lib/supabase');
    mockSupabase = supabaseModule.supabase;
    vi.clearAllMocks();
  });

  function mockSupabaseQuery(events: any[]) {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lte: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: events, error: null }),
            }),
          }),
        }),
      }),
    });
  }

  describe('getMetrics with 30 days of data within 1s', () => {
    it('should compute metrics for 30 days (~300 events) within 1s', async () => {
      const mockEvents = generateMockAnalyticsEvents(30, 10);
      mockSupabaseQuery(mockEvents);

      const { result, durationMs } = await measureTime(() =>
        analyticsService.getMetrics('workspace-perf', dateRange30d)
      );

      expect(result.totalEvaluations).toBe(300);
      expect(result.successRate).toBeGreaterThan(0);
      expect(result.averageLatencyMs).toBeGreaterThan(0);
      expect(result.totalCostUsd).toBeGreaterThan(0);
      expect(result.totalTokens).toBeGreaterThan(0);
      expect(result.evaluationsPerDay.length).toBeGreaterThan(0);
      expect(result.topPolicies.length).toBeGreaterThan(0);
      expect(durationMs).toBeLessThan(DASHBOARD_THRESHOLD_MS);
    });

    it('should compute metrics for 30 days with high volume (~1500 events) within 1s', async () => {
      const mockEvents = generateMockAnalyticsEvents(30, 50);
      mockSupabaseQuery(mockEvents);

      const { result, durationMs } = await measureTime(() =>
        analyticsService.getMetrics('workspace-perf', dateRange30d)
      );

      expect(result.totalEvaluations).toBe(1500);
      // Calendar day boundaries can produce up to days+1 distinct dates
      expect(result.evaluationsPerDay.length).toBeLessThanOrEqual(31);
      expect(result.costByProvider.length).toBeGreaterThan(0);
      expect(result.evaluationsByMember.length).toBeGreaterThan(0);
      expect(durationMs).toBeLessThan(DASHBOARD_THRESHOLD_MS);
    });

    it('should correctly aggregate top 10 policies', async () => {
      const mockEvents = generateMockAnalyticsEvents(30, 20);
      mockSupabaseQuery(mockEvents);

      const { result, durationMs } = await measureTime(() =>
        analyticsService.getMetrics('workspace-perf', dateRange30d)
      );

      expect(result.topPolicies.length).toBeLessThanOrEqual(10);
      // Top policies should be sorted by evaluation count descending
      for (let i = 1; i < result.topPolicies.length; i++) {
        expect(result.topPolicies[i - 1].evaluations).toBeGreaterThanOrEqual(
          result.topPolicies[i].evaluations
        );
      }
      expect(durationMs).toBeLessThan(DASHBOARD_THRESHOLD_MS);
    });

    it('should handle empty dataset gracefully within 1s', async () => {
      mockSupabaseQuery([]);

      const { result, durationMs } = await measureTime(() =>
        analyticsService.getMetrics('workspace-perf', dateRange30d)
      );

      expect(result.totalEvaluations).toBe(0);
      expect(result.successRate).toBe(0);
      expect(result.averageLatencyMs).toBe(0);
      expect(result.evaluationsPerDay).toHaveLength(0);
      expect(durationMs).toBeLessThan(DASHBOARD_THRESHOLD_MS);
    });
  });

  describe('chart data generation performance', () => {
    it('should generate evaluationsPerDay time series for 30 days within 1s', async () => {
      const mockEvents = generateMockAnalyticsEvents(30, 20);
      mockSupabaseQuery(mockEvents);

      const { result, durationMs } = await measureTime(() =>
        analyticsService.getMetrics('workspace-perf', dateRange30d)
      );

      // Should have up to 31 data points (calendar day boundaries can span days+1)
      expect(result.evaluationsPerDay.length).toBeGreaterThan(0);
      expect(result.evaluationsPerDay.length).toBeLessThanOrEqual(31);
      // Each point should have a valid date and positive value
      for (const point of result.evaluationsPerDay) {
        expect(point.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(point.value).toBeGreaterThan(0);
      }
      expect(durationMs).toBeLessThan(DASHBOARD_THRESHOLD_MS);
    });

    it('should generate cost breakdown by provider within 1s', async () => {
      const mockEvents = generateMockAnalyticsEvents(30, 20);
      mockSupabaseQuery(mockEvents);

      const { result, durationMs } = await measureTime(() =>
        analyticsService.getMetrics('workspace-perf', dateRange30d)
      );

      expect(result.costByProvider.length).toBeGreaterThan(0);
      // Percentages should sum to ~100
      const totalPct = result.costByProvider.reduce((s, c) => s + c.percentage, 0);
      expect(totalPct).toBeGreaterThanOrEqual(95);
      expect(totalPct).toBeLessThanOrEqual(105);
      expect(durationMs).toBeLessThan(DASHBOARD_THRESHOLD_MS);
    });

    it('should generate SVG chart export within 1s', async () => {
      const mockEvents = generateMockAnalyticsEvents(30, 10);
      mockSupabaseQuery(mockEvents);

      const { result, durationMs } = await measureTime(() =>
        analyticsService.exportChart('workspace-perf', {
          format: 'png',
          dateRange: dateRange30d,
        })
      );

      expect(result).toContain('data:image/svg+xml;base64,');
      expect(result.length).toBeGreaterThan(0);
      expect(durationMs).toBeLessThan(DASHBOARD_THRESHOLD_MS);
    });
  });

  describe('CSV export performance with large datasets', () => {
    it('should export CSV for 30 days (~300 events) within 1s', async () => {
      const mockEvents = generateMockAnalyticsEvents(30, 10);
      mockSupabaseQuery(mockEvents);

      const { result, durationMs } = await measureTime(() =>
        analyticsService.exportCSV('workspace-perf', {
          format: 'csv',
          dateRange: dateRange30d,
        })
      );

      expect(result).toContain('Metric');
      expect(result).toContain('Total Evaluations');
      expect(result).toContain('Success Rate');
      expect(result).toContain('Top Policies');
      expect(result).toContain('Cost by Provider');
      expect(durationMs).toBeLessThan(DASHBOARD_THRESHOLD_MS);
    });

    it('should export CSV for high-volume data (~1500 events) within 1s', async () => {
      const mockEvents = generateMockAnalyticsEvents(30, 50);
      mockSupabaseQuery(mockEvents);

      const { result, durationMs } = await measureTime(() =>
        analyticsService.exportCSV('workspace-perf', {
          format: 'csv',
          dateRange: dateRange30d,
        })
      );

      expect(result).toContain('Total Evaluations');
      // CSV should contain provider cost rows
      for (const provider of PROVIDERS) {
        expect(result).toContain(provider);
      }
      expect(durationMs).toBeLessThan(DASHBOARD_THRESHOLD_MS);
    });
  });

  describe('date range filtering performance', () => {
    it('should filter 7-day range from 30 days of data within 1s', async () => {
      // Supabase handles the filtering, but we test the full pipeline
      const mockEvents = generateMockAnalyticsEvents(7, 20);
      mockSupabaseQuery(mockEvents);

      const { result, durationMs } = await measureTime(() =>
        analyticsService.getMetrics('workspace-perf', { range: '7d' })
      );

      expect(result.totalEvaluations).toBe(140);
      expect(result.evaluationsPerDay.length).toBeLessThanOrEqual(8);
      expect(durationMs).toBeLessThan(DASHBOARD_THRESHOLD_MS);
    });

    it('should filter 90-day range with large dataset within 1s', async () => {
      const mockEvents = generateMockAnalyticsEvents(90, 10);
      mockSupabaseQuery(mockEvents);

      const { result, durationMs } = await measureTime(() =>
        analyticsService.getMetrics('workspace-perf', { range: '90d' })
      );

      expect(result.totalEvaluations).toBe(900);
      expect(result.evaluationsPerDay.length).toBeLessThanOrEqual(91);
      expect(durationMs).toBeLessThan(DASHBOARD_THRESHOLD_MS);
    });

    it('should filter custom date range within 1s', async () => {
      const mockEvents = generateMockAnalyticsEvents(14, 15);
      mockSupabaseQuery(mockEvents);

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 14);

      const { result, durationMs } = await measureTime(() =>
        analyticsService.getMetrics('workspace-perf', {
          range: 'custom',
          startDate,
          endDate,
        })
      );

      expect(result.totalEvaluations).toBe(210);
      expect(durationMs).toBeLessThan(DASHBOARD_THRESHOLD_MS);
    });
  });

  describe('data mapping efficiency at scale', () => {
    it('should compute metrics without degradation across iterations', async () => {
      const mockEvents = generateMockAnalyticsEvents(30, 20);
      mockSupabaseQuery(mockEvents);

      const durations: number[] = [];
      for (let i = 0; i < 5; i++) {
        const { durationMs } = await measureTime(() =>
          analyticsService.getMetrics('workspace-perf', dateRange30d)
        );
        durations.push(durationMs);
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      expect(avgDuration).toBeLessThan(DASHBOARD_THRESHOLD_MS);

      // No single iteration should spike above threshold
      for (const d of durations) {
        expect(d).toBeLessThan(DASHBOARD_THRESHOLD_MS);
      }
    });
  });
});
