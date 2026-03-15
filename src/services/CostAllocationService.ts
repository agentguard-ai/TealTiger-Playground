// CostAllocationService - Cost tracking, allocation, and budget alerts
// Requirements: 20.1-20.10

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type {
  CostEntry,
  CostAllocationReport,
  CostCategory,
  CostTrendPoint,
  BudgetAlert,
} from '../types/cost';

export class CostAllocationService {
  /**
   * Tracks a cost event
   * Requirements: 20.1
   */
  async trackCost(entry: Omit<CostEntry, 'id' | 'timestamp'>): Promise<void> {
    if (!isSupabaseConfigured()) return;

    try {
      await supabase!.from('cost_entries').insert({
        workspace_id: entry.workspaceId,
        policy_id: entry.policyId,
        policy_name: entry.policyName,
        user_id: entry.userId,
        provider: entry.provider,
        model: entry.model,
        cost_usd: entry.costUsd,
        tokens_used: entry.tokensUsed,
        project_code: entry.projectCode || null,
      });

      // Check budget alerts after tracking
      await this.checkBudgetAlerts(entry.workspaceId);
    } catch {
      console.warn('Failed to track cost entry');
    }
  }

  /**
   * Gets cost allocation report for a workspace
   * Requirements: 20.2-20.5
   */
  async getCostAllocation(
    workspaceId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CostAllocationReport> {
    if (!isSupabaseConfigured()) {
      return this.emptyReport(workspaceId, startDate, endDate);
    }

    const { data, error } = await supabase!
      .from('cost_entries')
      .select('*')
      .eq('workspace_id', workspaceId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true });

    if (error || !data || data.length === 0) {
      return this.emptyReport(workspaceId, startDate, endDate);
    }

    const entries: CostEntry[] = data.map((row: any) => ({
      id: row.id,
      workspaceId: row.workspace_id,
      policyId: row.policy_id,
      policyName: row.policy_name,
      userId: row.user_id,
      provider: row.provider,
      model: row.model,
      costUsd: row.cost_usd,
      tokensUsed: row.tokens_used,
      projectCode: row.project_code,
      timestamp: new Date(row.created_at),
    }));

    const totalCost = entries.reduce((s, e) => s + e.costUsd, 0);

    return {
      workspaceId,
      dateRange: { start: startDate, end: endDate },
      totalCostUsd: Math.round(totalCost * 10000) / 10000,
      byPolicy: this.groupBy(entries, 'policyName', totalCost),
      byProvider: this.groupBy(entries, 'provider', totalCost),
      byMember: this.groupBy(entries, 'userId', totalCost),
      byProject: this.groupBy(entries, 'projectCode', totalCost),
      trends: this.buildTrends(entries),
    };
  }

  /**
   * Exports cost report as CSV
   * Requirements: 20.6
   */
  async exportCostReport(workspaceId: string, startDate: Date, endDate: Date): Promise<string> {
    const report = await this.getCostAllocation(workspaceId, startDate, endDate);

    const lines: string[] = [
      'Category,Name,Cost (USD),Percentage,Count',
    ];

    for (const cat of report.byPolicy) {
      lines.push(`Policy,"${cat.name}",${cat.costUsd.toFixed(4)},${cat.percentage}%,${cat.count}`);
    }
    for (const cat of report.byProvider) {
      lines.push(`Provider,"${cat.name}",${cat.costUsd.toFixed(4)},${cat.percentage}%,${cat.count}`);
    }
    for (const cat of report.byMember) {
      lines.push(`Member,"${cat.name}",${cat.costUsd.toFixed(4)},${cat.percentage}%,${cat.count}`);
    }

    lines.push('');
    lines.push('Date,Daily Cost (USD)');
    for (const t of report.trends) {
      lines.push(`${t.date},${t.costUsd.toFixed(4)}`);
    }

    return lines.join('\n');
  }

  /**
   * Sets a budget alert for the workspace
   * Requirements: 20.7
   */
  async setBudgetAlert(alert: Omit<BudgetAlert, 'id'>): Promise<void> {
    if (!isSupabaseConfigured()) return;

    await supabase!.from('budget_alerts').upsert({
      workspace_id: alert.workspaceId,
      threshold_usd: alert.thresholdUsd,
      period: alert.period,
      enabled: alert.enabled,
      notify_email: alert.notifyEmail,
    }, { onConflict: 'workspace_id,period' });
  }

  /**
   * Checks if any budget alerts should fire
   * Requirements: 20.8
   */
  async checkBudgetAlerts(workspaceId: string): Promise<BudgetAlert[]> {
    if (!isSupabaseConfigured()) return [];

    const { data: alerts } = await supabase!
      .from('budget_alerts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('enabled', true);

    if (!alerts || alerts.length === 0) return [];

    const triggered: BudgetAlert[] = [];
    const now = new Date();

    for (const alert of alerts) {
      const start = this.getPeriodStart(now, alert.period);
      const report = await this.getCostAllocation(workspaceId, start, now);

      if (report.totalCostUsd >= alert.threshold_usd) {
        triggered.push({
          id: alert.id,
          workspaceId: alert.workspace_id,
          thresholdUsd: alert.threshold_usd,
          period: alert.period,
          enabled: alert.enabled,
          notifyEmail: alert.notify_email,
        });

        await this.sendBudgetNotification(workspaceId, alert.threshold_usd, report.totalCostUsd, alert.period);
      }
    }

    return triggered;
  }

  /**
   * Gets cost trends over time
   * Requirements: 20.9
   */
  async getCostTrends(
    workspaceId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CostTrendPoint[]> {
    const report = await this.getCostAllocation(workspaceId, startDate, endDate);
    return report.trends;
  }

  // --- Private helpers ---

  private groupBy(entries: CostEntry[], field: keyof CostEntry, totalCost: number): CostCategory[] {
    const groups = new Map<string, { cost: number; count: number }>();

    for (const e of entries) {
      const key = String(e[field] || 'Unassigned');
      const existing = groups.get(key) || { cost: 0, count: 0 };
      existing.cost += e.costUsd;
      existing.count++;
      groups.set(key, existing);
    }

    return Array.from(groups.entries())
      .map(([name, { cost, count }]) => ({
        name,
        costUsd: Math.round(cost * 10000) / 10000,
        percentage: totalCost > 0 ? Math.round((cost / totalCost) * 100) : 0,
        count,
      }))
      .sort((a, b) => b.costUsd - a.costUsd);
  }

  private buildTrends(entries: CostEntry[]): CostTrendPoint[] {
    const dayMap = new Map<string, number>();
    for (const e of entries) {
      const day = e.timestamp.toISOString().split('T')[0];
      dayMap.set(day, (dayMap.get(day) || 0) + e.costUsd);
    }

    return Array.from(dayMap.entries())
      .map(([date, costUsd]) => ({ date, costUsd: Math.round(costUsd * 10000) / 10000 }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private getPeriodStart(now: Date, period: string): Date {
    const start = new Date(now);
    switch (period) {
      case 'daily': start.setHours(0, 0, 0, 0); break;
      case 'weekly': start.setDate(start.getDate() - start.getDay()); start.setHours(0, 0, 0, 0); break;
      case 'monthly': start.setDate(1); start.setHours(0, 0, 0, 0); break;
    }
    return start;
  }

  private async sendBudgetNotification(
    workspaceId: string, threshold: number, current: number, period: string
  ): Promise<void> {
    if (!isSupabaseConfigured()) return;
    try {
      await supabase!.from('audit_log').insert({
        workspace_id: workspaceId,
        actor_id: 'system',
        action: 'budget_alert_triggered',
        resource_type: 'cost',
        resource_id: workspaceId,
        metadata: { threshold, current, period },
      });
    } catch {
      console.warn('Failed to log budget alert');
    }
  }

  private emptyReport(workspaceId: string, start: Date, end: Date): CostAllocationReport {
    return {
      workspaceId,
      dateRange: { start, end },
      totalCostUsd: 0,
      byPolicy: [],
      byProvider: [],
      byMember: [],
      byProject: [],
      trends: [],
    };
  }
}

export const costAllocationService = new CostAllocationService();
