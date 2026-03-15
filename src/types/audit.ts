// Audit trail types for immutable logging
// Requirements: 10.1-10.10, 11.1-11.10

export type AuditAction =
  | 'policy_created'
  | 'policy_updated'
  | 'policy_deleted'
  | 'policy_approved'
  | 'policy_rejected'
  | 'policy_deployed'
  | 'policy_evaluated'
  | 'member_added'
  | 'member_removed'
  | 'member_role_changed'
  | 'workspace_settings_changed'
  | 'auth_login'
  | 'auth_logout'
  | 'emergency_bypass';

export type ResourceType =
  | 'policy'
  | 'policy_version'
  | 'workspace'
  | 'workspace_member'
  | 'comment'
  | 'compliance_mapping';

export interface AuditEvent {
  id: string;
  workspaceId: string;
  actorId: string;
  action: AuditAction;
  resourceType: ResourceType;
  resourceId: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface AuditQueryOptions {
  page: number;
  pageSize: number; // Default: 100
  sortBy?: 'created_at' | 'action' | 'actor';
  sortOrder?: 'asc' | 'desc';
}

export interface AuditFilters {
  dateRange?: { start: Date; end: Date };
  actor?: string;
  actions?: AuditAction[];
  resourceType?: ResourceType;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface AuditExportMetadata {
  exportedAt: Date;
  exportedBy: string;
  filters: AuditFilters;
  totalEvents: number;
  signature?: string;
}

export interface AuditExport {
  metadata: AuditExportMetadata;
  events: AuditEvent[];
}

export interface AuditError {
  message: string;
  code?: string;
}
