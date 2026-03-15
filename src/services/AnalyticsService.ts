// AnalyticsService - Workspace usage metrics, evaluation tracking, and export
// Requirements: 18.1-18.10

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type {
  EvaluationEvent,
  WorkspaceMetrics,
  TimeSeriesPoint,
  CategoryMetric,
  PolicyUsageMetric,
  DateRangeConfig,
  AnalyticsExportOptions,
} from '../types/analytics';

export class AnalyticsService {
  /**
   * Retrieves aggregated metrics for a workspace within a date range
   * Requirements: 18.1-18.8
   */
  async getMetrics(workspaceId: string, dateRange: DateRangeConfig): Promise<WorkspaceMetrics> {
    const { startDate, endDate } = this.resolveDateRange(dateRange);

    if (!isSupabaseConfigured()) {
      return this.emptyMetrics();
    }

    // Fetch evaluation events for the workspace
    let query = supabase!
      .from('analytics_events')
      .select('*')
      .eq('workspace_id', workspaceId)
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString())
      .order('timestamp', { ascending: true });

    const { data: events, error } = await query;

    if (error || !events || events.length === 0) {
      return this.emptyMetrics();
    }

    const evaluations: EvaluationEvent[] = events.map(this.mapEvent);
    return this.aggregateMetrics(evaluations, startDate, endDate);
  }

  /**
   * Tracks a new evaluation event
   * Requirements: 18.1
   */
  async trackEvaluation(event: Omit<EvaluationEvent, 'id' | 'timestamp'>): Promise<void> {
    if (!isSupabaseConfigured()) return;

    try {
      await supabase!.from('analytics_events').insert({
        workspace_id: event.workspaceId,
        policy_id: event.policyId,
        policy_name: event.policyName,
        user_id: event.userId,
        provider: event.provider,
        model: event.model,
        action: event.action,
        latency_ms: event.latencyMs,
        cost_usd: event.costUsd,
        tokens_used: event.tokensUsed,
        success: event.success,
      });
    } catch {
      console.warn('Failed to track evaluation event');
    }
  }

  /**
   * Exports analytics data as CSV
   * Requirements: 18.9
   */
  async exportCSV(workspaceId: string, options: AnalyticsExportOptions): Promise<string> {
    const metrics = await this.getMetrics(workspaceId, options.dateRange);

    const headers = [
      'Metric', 'Value',
    ];

    const rows: string[][] = [
      ['Total Evaluations', String(metrics.totalEvaluations)],
      ['Success Rate (%)', String(metrics.successRate)],
      ['Average Latency (ms)', String(metrics.averageLatencyMs)],
      ['Total Cost (USD)', metrics.totalCostUsd.toFixed(4)],
      ['Total Tokens', String(metrics.totalTokens)],
    ];

    // Add top policies
    rows.push(['', '']);
    rows.push(['Top Policies', '']);
    rows.push(['Policy', 'Evaluations', 'Success Rate', 'Avg Latency', 'Cost'].join(',').split(',') as any);
    for (const p of metrics.topPolicies) {
      rows.push([p.policyName, String(p.evaluations), `${p.successRate}%`, `${p.averageLatencyMs}ms`, `$${p.totalCostUsd.toFixed(4)}`]);
    }

    // Add cost by provider
    rows.push(['', '']);
    rows.push(['Cost by Provider', '']);
    for (const c of metrics.costByProvider) {
      rows.push([c.name, `$${c.value.toFixed(4)}`, `${c.percentage}%`]);
    }

    const csvLines = [headers.join(',')];
    for (const row of rows) {
      csvLines.push(row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','));
    }

    return csvLines.join('\n');
  }

  /**
   * Exports chart data as a PNG-compatible data URL (simplified SVG-based)
   * Requirements: 18.10
   */
  async exportChart(workspaceId: string, options: AnalyticsExportOptions): Promise<string> {
    const metrics = await this.getMetrics(workspaceId, options.dateRange);

    // Generate a simple SVG bar chart of evaluations per day
    const data = metrics.evaluationsPerDay.slice(-30); // Last 30 points
    if (data.length === 0) return '';

    const maxVal = Math.max(...data.map((d) => d.value), 1);
    const width = 600;
    const height = 300;
    const barWidth = Math.floor(width / data.length) - 2;

    let bars = '';
    data.forEach((point, i) => {
      const barHeight = (point.value / maxVal) * (height - 40);
      const x = i * (barWidth + 2) + 1;
      const y = height - 20 - barHeight;
      bars += `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="#14b8a6" rx="2"/>`;
    });

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" style="background:#1f2937">
      <text x="10" y="20" fill="#9ca3af" font-size="12">Evaluations per Day</text>
      ${bars}
      <line x1="0" y1="${height - 20}" x2="${width}" y2="${height - 20}" stroke="#374151" stroke-width="1"/>
    </svg>`;

    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  // --- Private helpers ---

  private aggregateMetrics(
    events: EvaluationEvent[],
    startDate: Date,
    endDate: Date
  ): WorkspaceMetrics {
    const total = events.length;
    const successful = events.filter((e) => e.success).length;
    const totalLatency = events.reduce((sum, e) => sum + e.latencyMs, 0);
    const totalCost = events.reduce((sum, e) => sum + e.costUsd, 0);
    const totalTokens = events.reduce((sum, e) => sum + e.tokensUsed, 0);

    return {
      totalEvaluations: total,
      successRate: total > 0 ? Math.round((successful / total) * 100) : 0,
      averageLatencyMs: total > 0 ? Math.round(totalLatency / total) : 0,
      totalCostUsd: totalCost,
      totalTokens,
      evaluationsPerDay: this.groupByDay(events, 'count'),
      successRateOverTime: this.groupByDay(events, 'successRate'),
      latencyOverTime: this.groupByDay(events, 'avgLatency'),
      costByPolicy: this.groupByField(events, 'policyName', 'costUsd'),
      costByProvider: this.groupByField(events, 'provider', 'costUsd'),
      topPolicies: this.getTopPolicies(events, 10),
      evaluationsByMember: this.groupByField(events, 'userId', 'count'),
      approvalVelocity: [], // Populated from governance data separately
      complianceCoverageTrend: [], // Populated from compliance data separately
    };
  }

  private groupByDay(
    events: EvaluationEvent[],
    metric: 'count' | 'successRate' | 'avgLatency'
  ): TimeSeriesPoint[] {
    const dayMap = new Map<string, EvaluationEvent[]>();

    for (const e of events) {
      const day = e.timestamp.toISOString().split('T')[0];
      if (!dayMap.has(day)) dayMap.set(day, []);
      dayMap.get(day)!.push(e);
    }

    const points: TimeSeriesPoint[] = [];
    for (const [date, dayEvents] of dayMap) {
      let value: number;
      switch (metric) {
        case 'count':
          value = dayEvents.length;
          break;
        case 'successRate': {
          const ok = dayEvents.filter((e) => e.success).length;
          value = dayEvents.length > 0 ? Math.round((ok / dayEvents.length) * 100) : 0;
          break;
        }
        case 'avgLatency': {
          const sum = dayEvents.reduce((s, e) => s + e.latencyMs, 0);
          value = dayEvents.length > 0 ? Math.round(sum / dayEvents.length) : 0;
          break;
        }
      }
      points.push({ date, value });
    }

    return points.sort((a, b) => a.date.localeCompare(b.date));
  }

  private groupByField(
    events: EvaluationEvent[],
    field: keyof EvaluationEvent,
    valueField: 'costUsd' | 'count'
  ): CategoryMetric[] {
    const groups = new Map<string, number>();

    for (const e of events) {
      const key = String(e[field]);
      const current = groups.get(key) || 0;
      groups.set(key, current + (valueField === 'count' ? 1 : e.costUsd));
    }

    const total = Array.from(groups.values()).reduce((s, v) => s + v, 0);

    return Array.from(groups.entries())
      .map(([name, value]) => ({
        name,
        value: Math.round(value * 10000) / 10000,
        percentage: total > 0 ? Math.round((value / total) * 100) : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }

  private getTopPolicies(events: EvaluationEvent[], limit: number): PolicyUsageMetric[] {
    const policyMap = new Map<string, EvaluationEvent[]>();

    for (const e of events) {
      if (!policyMap.has(e.policyId)) policyMap.set(e.policyId, []);
      policyMap.get(e.policyId)!.push(e);
    }

    return Array.from(policyMap.entries())
      .map(([policyId, pEvents]) => {
        const ok = pEvents.filter((e) => e.success).length;
        const totalLatency = pEvents.reduce((s, e) => s + e.latencyMs, 0);
        const totalCost = pEvents.reduce((s, e) => s + e.costUsd, 0);
        return {
          policyId,
          policyName: pEvents[0].policyName,
          evaluations: pEvents.length,
          successRate: pEvents.length > 0 ? Math.round((ok / pEvents.length) * 100) : 0,
          averageLatencyMs: pEvents.length > 0 ? Math.round(totalLatency / pEvents.length) : 0,
          totalCostUsd: Math.round(totalCost * 10000) / 10000,
        };
      })
      .sort((a, b) => b.evaluations - a.evaluations)
      .slice(0, limit);
  }

  private mapEvent(row: any): EvaluationEvent {
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      policyId: row.policy_id,
      policyName: row.policy_name,
      userId: row.user_id,
      provider: row.provider,
      model: row.model,
      action: row.action,
      latencyMs: row.latency_ms,
      costUsd: row.cost_usd,
      tokensUsed: row.tokens_used,
      timestamp: new Date(row.timestamp),
      success: row.success,
    };
  }

  private resolveDateRange(config: DateRangeConfig): { startDate: Date; endDate: Date } {
    const endDate = config.endDate || new Date();
    let startDate: Date;

    if (config.range === 'custom' && config.startDate) {
      startDate = config.startDate;
    } else {
      const days = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 }[config.range] || 30;
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - days);
    }

    return { startDate, endDate };
  }

  private emptyMetrics(): WorkspaceMetrics {
    return {
      totalEvaluations: 0,
      successRate: 0,
      averageLatencyMs: 0,
      totalCostUsd: 0,
      totalTokens: 0,
      evaluationsPerDay: [],
      successRateOverTime: [],
      latencyOverTime: [],
      costByPolicy: [],
      costByProvider: [],
      topPolicies: [],
      evaluationsByMember: [],
      approvalVelocity: [],
      complianceCoverageTrend: [],
    };
  }
}

export const analyticsService = new AnalyticsService();
