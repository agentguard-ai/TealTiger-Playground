/**
 * DatabaseQueryOptimizer - Query optimization utility for the TealTiger Playground
 *
 * Documents recommended indexes, provides optimized query builders for common
 * operations (policy listing, audit log queries, analytics aggregation), and
 * exposes helpers that services can use to stay within the 500ms performance
 * budget defined by Requirements 29.2 and 29.3.
 *
 * Validates: Requirements 29.2, 29.3
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QueryPerformanceResult {
  queryName: string;
  durationMs: number;
  rowCount: number;
  withinBudget: boolean;
}

export interface IndexRecommendation {
  table: string;
  indexName: string;
  columns: string[];
  reason: string;
  queryPattern: string;
}

export interface OptimizedQueryOptions {
  workspaceId: string;
  page?: number;
  pageSize?: number;
  selectColumns?: string;
}

export interface PolicyListOptions extends OptimizedQueryOptions {
  state?: string;
  searchQuery?: string;
}

export interface AuditLogOptions extends OptimizedQueryOptions {
  action?: string;
  actorId?: string;
  resourceType?: string;
  dateRange?: { start: Date; end: Date };
}

export interface AnalyticsAggregationOptions extends OptimizedQueryOptions {
  dateRange: { start: Date; end: Date };
  policyId?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Performance budget from Req 29.2 / 29.3 */
export const PERFORMANCE_BUDGET_MS = 500;

const POLICY_LIST_COLUMNS =
  'id, workspace_id, name, description, current_version, state, created_by, created_at, updated_at';

const AUDIT_LOG_COLUMNS =
  'id, workspace_id, actor_id, action, resource_type, resource_id, metadata, created_at';

const ANALYTICS_COLUMNS =
  'id, workspace_id, user_id, policy_id, event_type, metadata, created_at';

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class DatabaseQueryOptimizer {
  // -------------------------------------------------------------------------
  // Index documentation
  // -------------------------------------------------------------------------

  /**
   * Returns the full set of recommended composite indexes for the playground
   * database. These complement the single-column indexes created in migration
   * 001 and are applied by migration 005.
   */
  getRecommendedIndexes(): IndexRecommendation[] {
    return [
      // Policies
      {
        table: 'policies',
        indexName: 'idx_policies_workspace_updated',
        columns: ['workspace_id', 'updated_at DESC'],
        reason: 'Covers listPolicies ORDER BY updated_at DESC within a workspace',
        queryPattern: "SELECT * FROM policies WHERE workspace_id = ? ORDER BY updated_at DESC",
      },
      {
        table: 'policies',
        indexName: 'idx_policies_workspace_state',
        columns: ['workspace_id', 'state'],
        reason: 'Covers searchPolicies filtered by state within a workspace',
        queryPattern: "SELECT * FROM policies WHERE workspace_id = ? AND state = ?",
      },
      {
        table: 'policies',
        indexName: 'idx_policies_workspace_name',
        columns: ['workspace_id', 'name'],
        reason: 'Covers searchPolicies text search on name within a workspace',
        queryPattern: "SELECT * FROM policies WHERE workspace_id = ? AND name ILIKE ?",
      },
      // Audit log
      {
        table: 'audit_log',
        indexName: 'idx_audit_log_workspace_created',
        columns: ['workspace_id', 'created_at DESC'],
        reason: 'Covers getEvents paginated query ordered by created_at',
        queryPattern: "SELECT * FROM audit_log WHERE workspace_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
      },
      {
        table: 'audit_log',
        indexName: 'idx_audit_log_workspace_action',
        columns: ['workspace_id', 'action'],
        reason: 'Covers filterEvents by action type within a workspace',
        queryPattern: "SELECT * FROM audit_log WHERE workspace_id = ? AND action IN (?)",
      },
      {
        table: 'audit_log',
        indexName: 'idx_audit_log_workspace_actor',
        columns: ['workspace_id', 'actor_id'],
        reason: 'Covers filterEvents by actor within a workspace',
        queryPattern: "SELECT * FROM audit_log WHERE workspace_id = ? AND actor_id = ?",
      },
      {
        table: 'audit_log',
        indexName: 'idx_audit_log_workspace_resource',
        columns: ['workspace_id', 'resource_type'],
        reason: 'Covers filterEvents by resource type within a workspace',
        queryPattern: "SELECT * FROM audit_log WHERE workspace_id = ? AND resource_type = ?",
      },
      // Analytics
      {
        table: 'analytics_events',
        indexName: 'idx_analytics_workspace_timestamp',
        columns: ['workspace_id', 'created_at DESC'],
        reason: 'Covers getMetrics date-range query ordered by timestamp',
        queryPattern: "SELECT * FROM analytics_events WHERE workspace_id = ? AND created_at BETWEEN ? AND ? ORDER BY created_at",
      },
      {
        table: 'analytics_events',
        indexName: 'idx_analytics_workspace_policy',
        columns: ['workspace_id', 'policy_id'],
        reason: 'Covers cost-by-policy aggregation within a workspace',
        queryPattern: "SELECT policy_id, SUM(cost) FROM analytics_events WHERE workspace_id = ? GROUP BY policy_id",
      },
      // Comments
      {
        table: 'comments',
        indexName: 'idx_comments_policy_created',
        columns: ['policy_id', 'created_at DESC'],
        reason: 'Covers getComments ordered by creation date',
        queryPattern: "SELECT * FROM comments WHERE policy_id = ? ORDER BY created_at DESC",
      },
      {
        table: 'comments',
        indexName: 'idx_comments_policy_resolved',
        columns: ['policy_id', 'resolved'],
        reason: 'Covers unresolved comment count per policy',
        queryPattern: "SELECT COUNT(*) FROM comments WHERE policy_id = ? AND resolved = false",
      },
      // Policy versions
      {
        table: 'policy_versions',
        indexName: 'idx_policy_versions_policy_created',
        columns: ['policy_id', 'created_at DESC'],
        reason: 'Covers listVersions ordered by creation date',
        queryPattern: "SELECT * FROM policy_versions WHERE policy_id = ? ORDER BY created_at DESC",
      },
      // Compliance
      {
        table: 'compliance_mappings',
        indexName: 'idx_compliance_policy_framework',
        columns: ['policy_id', 'framework_id'],
        reason: 'Covers calculateCoverage join on policy + framework',
        queryPattern: "SELECT * FROM compliance_mappings WHERE policy_id = ? AND framework_id = ?",
      },
    ];
  }

  // -------------------------------------------------------------------------
  // Optimized query builders
  // -------------------------------------------------------------------------

  /**
   * Optimized policy list query. Uses explicit column selection instead of
   * SELECT * and leverages the composite (workspace_id, updated_at DESC) index.
   *
   * Validates: Requirement 29.2 – policy list within 500ms
   */
  buildPolicyListQuery(options: PolicyListOptions) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    const {
      workspaceId,
      page = 1,
      pageSize = 50,
      state,
      searchQuery,
      selectColumns = POLICY_LIST_COLUMNS,
    } = options;

    let query = supabase!
      .from('policies')
      .select(selectColumns)
      .eq('workspace_id', workspaceId);

    if (state) {
      query = query.eq('state', state);
    }

    if (searchQuery) {
      query = query.or(
        `name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`
      );
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query.order('updated_at', { ascending: false }).range(from, to);

    return query;
  }

  /**
   * Optimized audit log query with server-side pagination. Uses the composite
   * (workspace_id, created_at DESC) index and explicit column selection.
   *
   * Validates: Requirement 29.3 – audit log within 500ms
   */
  buildAuditLogQuery(options: AuditLogOptions) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    const {
      workspaceId,
      page = 1,
      pageSize = 100,
      action,
      actorId,
      resourceType,
      dateRange,
      selectColumns = AUDIT_LOG_COLUMNS,
    } = options;

    let query = supabase!
      .from('audit_log')
      .select(selectColumns)
      .eq('workspace_id', workspaceId);

    if (action) {
      query = query.eq('action', action);
    }
    if (actorId) {
      query = query.eq('actor_id', actorId);
    }
    if (resourceType) {
      query = query.eq('resource_type', resourceType);
    }
    if (dateRange) {
      query = query
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query.order('created_at', { ascending: false }).range(from, to);

    return query;
  }

  /**
   * Optimized analytics aggregation query. Uses the composite
   * (workspace_id, created_at DESC) index with date-range bounds.
   */
  buildAnalyticsQuery(options: AnalyticsAggregationOptions) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    const {
      workspaceId,
      dateRange,
      policyId,
      selectColumns = ANALYTICS_COLUMNS,
    } = options;

    let query = supabase!
      .from('analytics_events')
      .select(selectColumns)
      .eq('workspace_id', workspaceId)
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString())
      .order('created_at', { ascending: true });

    if (policyId) {
      query = query.eq('policy_id', policyId);
    }

    return query;
  }

  // -------------------------------------------------------------------------
  // Performance measurement
  // -------------------------------------------------------------------------

  /**
   * Measures the execution time of an async operation and checks it against
   * the 500ms performance budget.
   */
  async measureQuery<T>(
    queryName: string,
    fn: () => Promise<T>
  ): Promise<{ data: T; performance: QueryPerformanceResult }> {
    const start = performance.now();
    const data = await fn();
    const durationMs = performance.now() - start;

    const rowCount = Array.isArray(data) ? data.length : 1;

    return {
      data,
      performance: {
        queryName,
        durationMs,
        rowCount,
        withinBudget: durationMs < PERFORMANCE_BUDGET_MS,
      },
    };
  }
}
