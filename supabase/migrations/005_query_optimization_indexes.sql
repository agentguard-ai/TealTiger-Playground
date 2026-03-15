-- TealTiger Playground Enterprise - Query Optimization Indexes
-- Migration 005: Add composite indexes for common query patterns
-- Requirements: 29.2 (policy list <500ms), 29.3 (audit log <500ms)
--
-- Analysis: The initial schema (001) created single-column indexes.
-- This migration adds composite indexes that cover the most frequent
-- query patterns identified in PolicyRegistryService, AuditTrailService,
-- and AnalyticsService to avoid index-only scans falling back to heap.

-- ============================================================================
-- Policies: listPolicies(workspace_id) ORDER BY updated_at DESC
-- Covers: PolicyRegistryService.listPolicies, searchPolicies
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_policies_workspace_updated
  ON policies(workspace_id, updated_at DESC);

-- Policies: searchPolicies filtered by workspace + state
CREATE INDEX IF NOT EXISTS idx_policies_workspace_state
  ON policies(workspace_id, state);

-- Policies: text search on name within a workspace
CREATE INDEX IF NOT EXISTS idx_policies_workspace_name
  ON policies(workspace_id, name);

-- ============================================================================
-- Audit Log: getEvents(workspace_id) ORDER BY created_at DESC with pagination
-- Covers: AuditTrailService.getEvents, filterEvents
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_audit_log_workspace_created
  ON audit_log(workspace_id, created_at DESC);

-- Audit Log: filterEvents by workspace + action
CREATE INDEX IF NOT EXISTS idx_audit_log_workspace_action
  ON audit_log(workspace_id, action);

-- Audit Log: filterEvents by workspace + actor
CREATE INDEX IF NOT EXISTS idx_audit_log_workspace_actor
  ON audit_log(workspace_id, actor_id);

-- Audit Log: filterEvents by workspace + resource_type
CREATE INDEX IF NOT EXISTS idx_audit_log_workspace_resource
  ON audit_log(workspace_id, resource_type);

-- ============================================================================
-- Analytics Events: getMetrics(workspace_id) with date range + ORDER BY timestamp
-- Covers: AnalyticsService.getMetrics, exportCSV
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_analytics_workspace_timestamp
  ON analytics_events(workspace_id, created_at DESC);

-- Analytics: filter by workspace + policy for cost-by-policy aggregation
CREATE INDEX IF NOT EXISTS idx_analytics_workspace_policy
  ON analytics_events(workspace_id, policy_id);

-- ============================================================================
-- Comments: getComments(policy_id) ORDER BY created_at
-- Covers: CollaborationService.getComments
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_comments_policy_created
  ON comments(policy_id, created_at DESC);

-- Comments: filter unresolved comments per policy
CREATE INDEX IF NOT EXISTS idx_comments_policy_resolved
  ON comments(policy_id, resolved);

-- ============================================================================
-- Policy Versions: listVersions(policy_id) ORDER BY created_at DESC
-- Covers: PolicyRegistryService.listVersions
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_policy_versions_policy_created
  ON policy_versions(policy_id, created_at DESC);

-- ============================================================================
-- Compliance Mappings: calculateCoverage(workspace_id, framework_id)
-- Covers: ComplianceService.calculateCoverage, getUnmappedRequirements
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_compliance_policy_framework
  ON compliance_mappings(policy_id, framework_id);

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Added 13 composite indexes targeting the most common query patterns.
-- These complement the 47 single-column indexes from migration 001.
-- Expected improvement: eliminates multi-column filter scans for
-- workspace-scoped queries that dominate the application workload.
