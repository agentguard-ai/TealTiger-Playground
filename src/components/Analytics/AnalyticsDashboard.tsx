// AnalyticsDashboard - Main analytics view with all charts and metrics
// Requirements: 18.1-18.10

import React, { useState, useEffect, useCallback } from 'react';
import { AnalyticsService } from '../../services/AnalyticsService';
import type { WorkspaceMetrics, DateRange } from '../../types/analytics';
import { DateRangeFilter } from './DateRangeFilter';
import { MetricCard } from './MetricCard';
import { SuccessRateGauge } from './SuccessRateGauge';
import { SimpleBarChart } from './SimpleBarChart';
import { TopPoliciesTable } from './TopPoliciesTable';
import { CostBreakdownChart } from './CostBreakdownChart';
import { ExportAnalyticsButton } from './ExportAnalyticsButton';

interface AnalyticsDashboardProps {
  workspaceId: string;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ workspaceId }) => {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [metrics, setMetrics] = useState<WorkspaceMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const service = new AnalyticsService();
      const data = await service.getMetrics(workspaceId, { range: dateRange });
      setMetrics(data);
    } catch {
      console.warn('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, dateRange]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Loading analytics...
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
        No analytics data available
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-white">Analytics Dashboard</h2>
        <div className="flex items-center gap-3">
          <ExportAnalyticsButton workspaceId={workspaceId} dateRange={dateRange} />
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <MetricCard label="Total Evaluations" value={metrics.totalEvaluations.toLocaleString()} icon="📊" />
        <SuccessRateGauge rate={metrics.successRate} />
        <MetricCard label="Avg Latency" value={`${metrics.averageLatencyMs}ms`} icon="⏱️" color="text-blue-400" />
        <MetricCard label="Total Cost" value={`$${metrics.totalCostUsd.toFixed(2)}`} icon="💰" color="text-yellow-400" />
        <MetricCard label="Total Tokens" value={metrics.totalTokens.toLocaleString()} icon="🔤" color="text-purple-400" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SimpleBarChart
          data={metrics.evaluationsPerDay}
          title="Evaluations per Day"
          color="#14b8a6"
        />
        <SimpleBarChart
          data={metrics.latencyOverTime}
          title="Average Latency (ms)"
          color="#3b82f6"
          formatValue={(v) => `${v}ms`}
        />
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <CostBreakdownChart data={metrics.costByProvider} title="Cost by Provider" />
        <CostBreakdownChart data={metrics.costByPolicy} title="Cost by Policy" />
      </div>

      {/* Tables and activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <TopPoliciesTable policies={metrics.topPolicies} />
        <CostBreakdownChart data={metrics.evaluationsByMember} title="Team Activity" />
      </div>
    </div>
  );
};
