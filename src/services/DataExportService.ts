// DataExportService - Export all workspace data as structured JSON
// Requirements: 1.10

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Policy, PolicyVersion } from '../types/policy';
import type { Comment, CommentReply } from '../types/comment';
import type { AuditEvent } from '../types/audit';
import type { ComplianceMapping } from '../types/compliance';

export interface WorkspaceExportMetadata {
  exportVersion: string;
  exportedAt: string;
  workspaceId: string;
  workspaceName: string;
  exportedBy: string;
}

export interface WorkspaceExportData {
  metadata: WorkspaceExportMetadata;
  policies: Policy[];
  policyVersions: PolicyVersion[];
  comments: Comment[];
  commentReplies: CommentReply[];
  auditLog: AuditEvent[];
  complianceMappings: ComplianceMapping[];
}

export class DataExportService {
  /**
   * Exports all workspace data as a structured JSON object.
   * Requirements: 1.10
   */
  async exportWorkspaceData(
    workspaceId: string,
    exportedBy: string
  ): Promise<WorkspaceExportData> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    // Fetch workspace info
    const { data: workspace, error: wsError } = await supabase!
      .from('workspaces')
      .select('name')
      .eq('id', workspaceId)
      .single();

    if (wsError || !workspace) {
      throw new Error(`Workspace not found: ${wsError?.message || 'unknown'}`);
    }

    // Fetch all data in parallel
    const [
      policies,
      policyVersions,
      comments,
      commentReplies,
      auditLog,
      complianceMappings,
    ] = await Promise.all([
      this.fetchPolicies(workspaceId),
      this.fetchPolicyVersions(workspaceId),
      this.fetchComments(workspaceId),
      this.fetchCommentReplies(workspaceId),
      this.fetchAuditLog(workspaceId),
      this.fetchComplianceMappings(workspaceId),
    ]);

    return {
      metadata: {
        exportVersion: '1.0.0',
        exportedAt: new Date().toISOString(),
        workspaceId,
        workspaceName: workspace.name,
        exportedBy,
      },
      policies,
      policyVersions,
      comments,
      commentReplies,
      auditLog,
      complianceMappings,
    };
  }

  /**
   * Exports workspace data and triggers a browser download.
   */
  downloadExport(exportData: WorkspaceExportData): void {
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `workspace-export-${exportData.metadata.workspaceId}-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // --- Private fetch methods ---

  private async fetchPolicies(workspaceId: string): Promise<Policy[]> {
    const { data, error } = await supabase!
      .from('policies')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(`Failed to export policies: ${error.message}`);

    return (data || []).map(this.mapPolicy);
  }

  private async fetchPolicyVersions(workspaceId: string): Promise<PolicyVersion[]> {
    // Get all policy IDs for this workspace first
    const { data: policyIds, error: policyError } = await supabase!
      .from('policies')
      .select('id')
      .eq('workspace_id', workspaceId);

    if (policyError) throw new Error(`Failed to export policy versions: ${policyError.message}`);
    if (!policyIds || policyIds.length === 0) return [];

    const ids = policyIds.map((p: any) => p.id);

    const { data, error } = await supabase!
      .from('policy_versions')
      .select('*')
      .in('policy_id', ids)
      .order('created_at', { ascending: true });

    if (error) throw new Error(`Failed to export policy versions: ${error.message}`);

    return (data || []).map(this.mapPolicyVersion);
  }

  private async fetchComments(workspaceId: string): Promise<Comment[]> {
    const { data: policyIds, error: policyError } = await supabase!
      .from('policies')
      .select('id')
      .eq('workspace_id', workspaceId);

    if (policyError) throw new Error(`Failed to export comments: ${policyError.message}`);
    if (!policyIds || policyIds.length === 0) return [];

    const ids = policyIds.map((p: any) => p.id);

    const { data, error } = await supabase!
      .from('comments')
      .select('*')
      .in('policy_id', ids)
      .order('created_at', { ascending: true });

    if (error) throw new Error(`Failed to export comments: ${error.message}`);

    return (data || []).map(this.mapComment);
  }

  private async fetchCommentReplies(workspaceId: string): Promise<CommentReply[]> {
    const { data: policyIds, error: policyError } = await supabase!
      .from('policies')
      .select('id')
      .eq('workspace_id', workspaceId);

    if (policyError) throw new Error(`Failed to export comment replies: ${policyError.message}`);
    if (!policyIds || policyIds.length === 0) return [];

    const ids = policyIds.map((p: any) => p.id);

    // Get comment IDs for these policies
    const { data: commentIds, error: commentError } = await supabase!
      .from('comments')
      .select('id')
      .in('policy_id', ids);

    if (commentError) throw new Error(`Failed to export comment replies: ${commentError.message}`);
    if (!commentIds || commentIds.length === 0) return [];

    const cIds = commentIds.map((c: any) => c.id);

    const { data, error } = await supabase!
      .from('comment_replies')
      .select('*')
      .in('comment_id', cIds)
      .order('created_at', { ascending: true });

    if (error) throw new Error(`Failed to export comment replies: ${error.message}`);

    return (data || []).map(this.mapCommentReply);
  }

  private async fetchAuditLog(workspaceId: string): Promise<AuditEvent[]> {
    const { data, error } = await supabase!
      .from('audit_log')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(`Failed to export audit log: ${error.message}`);

    return (data || []).map(this.mapAuditEvent);
  }

  private async fetchComplianceMappings(workspaceId: string): Promise<ComplianceMapping[]> {
    const { data: policyIds, error: policyError } = await supabase!
      .from('policies')
      .select('id')
      .eq('workspace_id', workspaceId);

    if (policyError) throw new Error(`Failed to export compliance mappings: ${policyError.message}`);
    if (!policyIds || policyIds.length === 0) return [];

    const ids = policyIds.map((p: any) => p.id);

    const { data, error } = await supabase!
      .from('compliance_mappings')
      .select('*')
      .in('policy_id', ids)
      .order('created_at', { ascending: true });

    if (error) throw new Error(`Failed to export compliance mappings: ${error.message}`);

    return (data || []).map(this.mapComplianceMapping);
  }

  // --- Mappers ---

  private mapPolicy(data: any): Policy {
    return {
      id: data.id,
      workspaceId: data.workspace_id,
      name: data.name,
      description: data.description,
      currentVersion: data.current_version,
      state: data.state,
      createdBy: data.created_by,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  private mapPolicyVersion(data: any): PolicyVersion {
    return {
      id: data.id,
      policyId: data.policy_id,
      version: data.version,
      code: data.code,
      metadata: data.metadata,
      createdBy: data.created_by,
      createdAt: new Date(data.created_at),
    };
  }

  private mapComment(data: any): Comment {
    return {
      id: data.id,
      policyId: data.policy_id,
      versionId: data.version_id,
      lineNumber: data.line_number,
      content: data.content,
      authorId: data.author_id,
      resolved: data.resolved,
      mentions: data.mentions || [],
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  private mapCommentReply(data: any): CommentReply {
    return {
      id: data.id,
      commentId: data.comment_id,
      content: data.content,
      authorId: data.author_id,
      createdAt: new Date(data.created_at),
    };
  }

  private mapAuditEvent(data: any): AuditEvent {
    return {
      id: data.id,
      workspaceId: data.workspace_id,
      actorId: data.actor_id,
      action: data.action,
      resourceType: data.resource_type,
      resourceId: data.resource_id,
      metadata: data.metadata || {},
      createdAt: new Date(data.created_at),
    };
  }

  private mapComplianceMapping(data: any): ComplianceMapping {
    return {
      id: data.id,
      policyId: data.policy_id,
      frameworkId: data.framework_id || data.framework,
      requirementId: data.requirement_id,
      notes: data.notes,
      createdAt: new Date(data.created_at),
    };
  }
}

// Export singleton instance
export const dataExportService = new DataExportService();
