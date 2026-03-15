// DataImportService - Import workspace data from structured JSON
// Requirements: 1.10, 28.9

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { WorkspaceExportData, WorkspaceExportMetadata } from './DataExportService';
import type { Policy, PolicyVersion } from '../types/policy';
import type { Comment, CommentReply } from '../types/comment';
import type { AuditEvent } from '../types/audit';
import type { ComplianceMapping } from '../types/compliance';

export interface ImportReportEntry {
  table: string;
  imported: number;
  skipped: number;
  errors: string[];
}

export interface ImportReport {
  success: boolean;
  dryRun: boolean;
  startedAt: string;
  completedAt: string;
  workspaceId: string;
  entries: ImportReportEntry[];
  totalImported: number;
  totalSkipped: number;
  totalErrors: number;
}

export interface ImportOptions {
  dryRun?: boolean;
  skipConflicts?: boolean;
  targetWorkspaceId?: string;
}

const REQUIRED_EXPORT_FIELDS: (keyof WorkspaceExportData)[] = [
  'metadata',
  'policies',
  'policyVersions',
  'comments',
  'commentReplies',
  'auditLog',
  'complianceMappings',
];

const REQUIRED_METADATA_FIELDS: (keyof WorkspaceExportMetadata)[] = [
  'exportVersion',
  'exportedAt',
  'workspaceId',
  'workspaceName',
  'exportedBy',
];

export class DataImportService {
  /**
   * Validates that the import data conforms to the WorkspaceExportData schema.
   */
  validateSchema(data: unknown): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data || typeof data !== 'object') {
      return { valid: false, errors: ['Import data must be a non-null object'] };
    }

    const obj = data as Record<string, unknown>;

    // Check top-level required fields
    for (const field of REQUIRED_EXPORT_FIELDS) {
      if (!(field in obj)) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate metadata
    if (obj.metadata && typeof obj.metadata === 'object') {
      const meta = obj.metadata as Record<string, unknown>;
      for (const field of REQUIRED_METADATA_FIELDS) {
        if (!(field in meta)) {
          errors.push(`Missing required metadata field: ${field}`);
        }
      }
      if (meta.exportVersion && typeof meta.exportVersion !== 'string') {
        errors.push('metadata.exportVersion must be a string');
      }
      if (meta.exportedAt && typeof meta.exportedAt !== 'string') {
        errors.push('metadata.exportedAt must be a string');
      }
    } else if ('metadata' in obj) {
      errors.push('metadata must be an object');
    }

    // Validate arrays
    const arrayFields: (keyof WorkspaceExportData)[] = [
      'policies',
      'policyVersions',
      'comments',
      'commentReplies',
      'auditLog',
      'complianceMappings',
    ];
    for (const field of arrayFields) {
      if (field in obj && !Array.isArray(obj[field])) {
        errors.push(`${field} must be an array`);
      }
    }

    // Validate policy entries have required fields
    if (Array.isArray(obj.policies)) {
      (obj.policies as any[]).forEach((p, i) => {
        if (!p.id) errors.push(`policies[${i}] missing id`);
        if (!p.name) errors.push(`policies[${i}] missing name`);
      });
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Checks for conflicts between import data and existing workspace data.
   */
  async checkConflicts(
    data: WorkspaceExportData,
    targetWorkspaceId: string
  ): Promise<{ conflicts: string[]; duplicateIds: string[] }> {
    const conflicts: string[] = [];
    const duplicateIds: string[] = [];

    if (!isSupabaseConfigured()) {
      return { conflicts: ['Supabase is not configured'], duplicateIds: [] };
    }

    // Check for duplicate policy names
    const { data: existingPolicies, error: policyError } = await supabase!
      .from('policies')
      .select('id, name')
      .eq('workspace_id', targetWorkspaceId);

    if (policyError) {
      conflicts.push(`Failed to check existing policies: ${policyError.message}`);
      return { conflicts, duplicateIds };
    }

    const existingNames = new Set((existingPolicies || []).map((p: any) => p.name));
    const existingIds = new Set((existingPolicies || []).map((p: any) => p.id));

    for (const policy of data.policies) {
      if (existingNames.has(policy.name)) {
        conflicts.push(`Policy name conflict: "${policy.name}" already exists in workspace`);
      }
      if (existingIds.has(policy.id)) {
        duplicateIds.push(policy.id);
        conflicts.push(`Policy ID conflict: "${policy.id}" already exists`);
      }
    }

    return { conflicts, duplicateIds };
  }

  /**
   * Imports workspace data into Supabase tables.
   * Supports dry-run mode that validates without writing.
   * Requirements: 1.10, 28.9
   */
  async importWorkspaceData(
    jsonInput: string | WorkspaceExportData,
    options: ImportOptions = {}
  ): Promise<ImportReport> {
    const { dryRun = false, skipConflicts = false, targetWorkspaceId } = options;
    const startedAt = new Date().toISOString();

    // Parse JSON if string
    let data: WorkspaceExportData;
    if (typeof jsonInput === 'string') {
      try {
        data = JSON.parse(jsonInput);
      } catch {
        return this.buildErrorReport(dryRun, startedAt, '', 'Invalid JSON input');
      }
    } else {
      data = jsonInput;
    }

    // Validate schema
    const validation = this.validateSchema(data);
    if (!validation.valid) {
      return this.buildErrorReport(
        dryRun,
        startedAt,
        '',
        ...validation.errors
      );
    }

    const wsId = targetWorkspaceId || data.metadata.workspaceId;

    if (!isSupabaseConfigured()) {
      return this.buildErrorReport(dryRun, startedAt, wsId, 'Supabase is not configured');
    }

    // Check conflicts
    const { conflicts, duplicateIds } = await this.checkConflicts(data, wsId);
    if (conflicts.length > 0 && !skipConflicts) {
      return this.buildErrorReport(dryRun, startedAt, wsId, ...conflicts);
    }

    const duplicateIdSet = new Set(duplicateIds);
    const entries: ImportReportEntry[] = [];

    // In dry-run mode, report what would happen without writing
    if (dryRun) {
      entries.push(this.buildDryRunEntry('policies', data.policies, duplicateIdSet));
      entries.push(this.buildDryRunEntry('policy_versions', data.policyVersions, new Set()));
      entries.push(this.buildDryRunEntry('comments', data.comments, new Set()));
      entries.push(this.buildDryRunEntry('comment_replies', data.commentReplies, new Set()));
      entries.push(this.buildDryRunEntry('audit_log', data.auditLog, new Set()));
      entries.push(this.buildDryRunEntry('compliance_mappings', data.complianceMappings, new Set()));
    } else {
      // Import in correct order: policies → versions → comments → replies → audit → compliance
      entries.push(await this.importPolicies(data.policies, wsId, duplicateIdSet, skipConflicts));
      entries.push(await this.importPolicyVersions(data.policyVersions, duplicateIdSet));
      entries.push(await this.importComments(data.comments));
      entries.push(await this.importCommentReplies(data.commentReplies));
      entries.push(await this.importAuditLog(data.auditLog, wsId));
      entries.push(await this.importComplianceMappings(data.complianceMappings));
    }

    const totalImported = entries.reduce((sum, e) => sum + e.imported, 0);
    const totalSkipped = entries.reduce((sum, e) => sum + e.skipped, 0);
    const totalErrors = entries.reduce((sum, e) => sum + e.errors.length, 0);

    return {
      success: totalErrors === 0,
      dryRun,
      startedAt,
      completedAt: new Date().toISOString(),
      workspaceId: wsId,
      entries,
      totalImported,
      totalSkipped,
      totalErrors,
    };
  }

  // --- Private import methods ---

  private async importPolicies(
    policies: Policy[],
    workspaceId: string,
    duplicateIds: Set<string>,
    skipConflicts: boolean
  ): Promise<ImportReportEntry> {
    const entry: ImportReportEntry = { table: 'policies', imported: 0, skipped: 0, errors: [] };

    for (const policy of policies) {
      if (duplicateIds.has(policy.id) && skipConflicts) {
        entry.skipped++;
        continue;
      }

      const { error } = await supabase!.from('policies').insert({
        id: policy.id,
        workspace_id: workspaceId,
        name: policy.name,
        description: policy.description,
        current_version: policy.currentVersion,
        state: policy.state,
        created_by: policy.createdBy,
        created_at: policy.createdAt,
        updated_at: policy.updatedAt,
      });

      if (error) {
        entry.errors.push(`Policy "${policy.name}": ${error.message}`);
      } else {
        entry.imported++;
      }
    }

    return entry;
  }

  private async importPolicyVersions(
    versions: PolicyVersion[],
    skippedPolicyIds: Set<string>
  ): Promise<ImportReportEntry> {
    const entry: ImportReportEntry = { table: 'policy_versions', imported: 0, skipped: 0, errors: [] };

    for (const version of versions) {
      if (skippedPolicyIds.has(version.policyId)) {
        entry.skipped++;
        continue;
      }

      const { error } = await supabase!.from('policy_versions').insert({
        id: version.id,
        policy_id: version.policyId,
        version: version.version,
        code: version.code,
        metadata: version.metadata,
        created_by: version.createdBy,
        created_at: version.createdAt,
      });

      if (error) {
        entry.errors.push(`Version "${version.id}": ${error.message}`);
      } else {
        entry.imported++;
      }
    }

    return entry;
  }

  private async importComments(comments: Comment[]): Promise<ImportReportEntry> {
    const entry: ImportReportEntry = { table: 'comments', imported: 0, skipped: 0, errors: [] };

    for (const comment of comments) {
      const { error } = await supabase!.from('comments').insert({
        id: comment.id,
        policy_id: comment.policyId,
        version_id: comment.versionId,
        line_number: comment.lineNumber,
        content: comment.content,
        author_id: comment.authorId,
        resolved: comment.resolved,
        mentions: comment.mentions,
        created_at: comment.createdAt,
        updated_at: comment.updatedAt,
      });

      if (error) {
        entry.errors.push(`Comment "${comment.id}": ${error.message}`);
      } else {
        entry.imported++;
      }
    }

    return entry;
  }

  private async importCommentReplies(replies: CommentReply[]): Promise<ImportReportEntry> {
    const entry: ImportReportEntry = { table: 'comment_replies', imported: 0, skipped: 0, errors: [] };

    for (const reply of replies) {
      const { error } = await supabase!.from('comment_replies').insert({
        id: reply.id,
        comment_id: reply.commentId,
        content: reply.content,
        author_id: reply.authorId,
        created_at: reply.createdAt,
      });

      if (error) {
        entry.errors.push(`Reply "${reply.id}": ${error.message}`);
      } else {
        entry.imported++;
      }
    }

    return entry;
  }

  private async importAuditLog(events: AuditEvent[], workspaceId: string): Promise<ImportReportEntry> {
    const entry: ImportReportEntry = { table: 'audit_log', imported: 0, skipped: 0, errors: [] };

    for (const event of events) {
      const { error } = await supabase!.from('audit_log').insert({
        id: event.id,
        workspace_id: workspaceId,
        actor_id: event.actorId,
        action: event.action,
        resource_type: event.resourceType,
        resource_id: event.resourceId,
        metadata: event.metadata,
        created_at: event.createdAt,
      });

      if (error) {
        entry.errors.push(`Audit event "${event.id}": ${error.message}`);
      } else {
        entry.imported++;
      }
    }

    return entry;
  }

  private async importComplianceMappings(mappings: ComplianceMapping[]): Promise<ImportReportEntry> {
    const entry: ImportReportEntry = { table: 'compliance_mappings', imported: 0, skipped: 0, errors: [] };

    for (const mapping of mappings) {
      const { error } = await supabase!.from('compliance_mappings').insert({
        id: mapping.id,
        policy_id: mapping.policyId,
        framework_id: mapping.frameworkId,
        requirement_id: mapping.requirementId,
        notes: mapping.notes,
        created_at: mapping.createdAt,
      });

      if (error) {
        entry.errors.push(`Mapping "${mapping.id}": ${error.message}`);
      } else {
        entry.imported++;
      }
    }

    return entry;
  }

  // --- Helpers ---

  private buildDryRunEntry(
    table: string,
    items: any[],
    duplicateIds: Set<string>
  ): ImportReportEntry {
    const skipped = items.filter((item) => duplicateIds.has(item.id)).length;
    return {
      table,
      imported: items.length - skipped,
      skipped,
      errors: [],
    };
  }

  private buildErrorReport(
    dryRun: boolean,
    startedAt: string,
    workspaceId: string,
    ...errors: string[]
  ): ImportReport {
    return {
      success: false,
      dryRun,
      startedAt,
      completedAt: new Date().toISOString(),
      workspaceId,
      entries: [],
      totalImported: 0,
      totalSkipped: 0,
      totalErrors: errors.length,
    };
  }
}

// Export singleton instance
export const dataImportService = new DataImportService();
