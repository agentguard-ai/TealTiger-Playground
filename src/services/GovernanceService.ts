// GovernanceService - Policy approval workflow and state management
// Requirements: 7.1-7.10

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { policyRegistryService } from './PolicyRegistryService';
import type {
  PolicyApproval,
  GovernanceWorkflow,
  PromotePolicyInput,
  RequestApprovalInput,
  ApprovePolicyInput,
  RejectPolicyInput,
  EmergencyBypassInput,
  AutoApprovalRule,
  WorkspaceSettings,
  isValidTransition,
  requiresApproval
} from '../types/governance';
import type { Policy, PolicyState } from '../types/policy';
import { isValidTransition as validateTransition, requiresApproval as checkApprovalRequired } from '../types/governance';

export class GovernanceService {
  /**
   * Promotes policy to next state
   * Requirements: 7.1, 7.2
   */
  async promotePolicy(input: PromotePolicyInput): Promise<Policy> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    const { policyId, targetState, userId } = input;

    // Get current policy
    const policy = await policyRegistryService.getPolicy(policyId);

    // Validate state transition
    if (!validateTransition(policy.state, targetState)) {
      throw new Error(`Invalid state transition from ${policy.state} to ${targetState}`);
    }

    // Check if approval is required
    if (checkApprovalRequired(policy.state, targetState)) {
      const workflow = await this.getApprovalStatus(policyId);
      
      if (!workflow.canPromote) {
        throw new Error(
          `Cannot promote policy: requires ${workflow.requiredApprovals} approvals, ` +
          `but only ${workflow.approvals.filter(a => a.status === 'approved').length} received`
        );
      }
    }

    // Update policy state
    const { data: updatedPolicy, error } = await supabase!
      .from('policies')
      .update({ 
        state: targetState,
        updated_at: new Date().toISOString()
      })
      .eq('id', policyId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to promote policy: ${error.message}`);
    }

    // Log audit event
    await this.logAuditEvent(
      policy.workspaceId,
      userId,
      'policy_state_changed',
      'policy',
      policyId,
      {
        from_state: policy.state,
        to_state: targetState
      }
    );

    return {
      ...policy,
      state: targetState,
      updatedAt: new Date()
    };
  }

  /**
   * Requests approval for policy
   * Requirements: 7.2, 7.3, 7.6
   */
  async requestApproval(input: RequestApprovalInput): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    const { policyId, versionId, approverIds, userId } = input;

    // Get policy
    const policy = await policyRegistryService.getPolicy(policyId);

    // Create approval requests for each approver
    const approvals = approverIds.map(approverId => ({
      policy_id: policyId,
      version_id: versionId,
      approver_id: approverId,
      status: 'pending',
      comment: ''
    }));

    const { error } = await supabase!
      .from('policy_approvals')
      .insert(approvals);

    if (error) {
      throw new Error(`Failed to request approvals: ${error.message}`);
    }

    // Notify approvers
    await this.notifyApprovers(policyId, approverIds);

    // Log audit event
    await this.logAuditEvent(
      policy.workspaceId,
      userId,
      'approval_requested',
      'policy',
      policyId,
      {
        version_id: versionId,
        approver_ids: approverIds
      }
    );
  }

  /**
   * Approves a policy version
   * Requirements: 7.4, 7.5
   */
  async approvePolicy(input: ApprovePolicyInput): Promise<PolicyApproval> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    const { policyId, versionId, approverId, comment } = input;

    // Find pending approval
    const { data: existingApproval, error: findError } = await supabase!
      .from('policy_approvals')
      .select('*')
      .eq('policy_id', policyId)
      .eq('version_id', versionId)
      .eq('approver_id', approverId)
      .eq('status', 'pending')
      .single();

    if (findError || !existingApproval) {
      throw new Error('No pending approval found for this approver');
    }

    // Update approval status
    const { data: approval, error } = await supabase!
      .from('policy_approvals')
      .update({
        status: 'approved',
        comment,
        decided_at: new Date().toISOString()
      })
      .eq('id', existingApproval.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to approve policy: ${error.message}`);
    }

    // Get policy for audit log
    const policy = await policyRegistryService.getPolicy(policyId);

    // Log audit event
    await this.logAuditEvent(
      policy.workspaceId,
      approverId,
      'policy_approved',
      'policy',
      policyId,
      {
        version_id: versionId,
        comment
      }
    );

    return this.mapPolicyApproval(approval);
  }

  /**
   * Rejects a policy version
   * Requirements: 7.4, 7.5
   */
  async rejectPolicy(input: RejectPolicyInput): Promise<PolicyApproval> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    const { policyId, versionId, approverId, reason } = input;

    // Find pending approval
    const { data: existingApproval, error: findError } = await supabase!
      .from('policy_approvals')
      .select('*')
      .eq('policy_id', policyId)
      .eq('version_id', versionId)
      .eq('approver_id', approverId)
      .eq('status', 'pending')
      .single();

    if (findError || !existingApproval) {
      throw new Error('No pending approval found for this approver');
    }

    // Update approval status
    const { data: approval, error } = await supabase!
      .from('policy_approvals')
      .update({
        status: 'rejected',
        comment: reason,
        decided_at: new Date().toISOString()
      })
      .eq('id', existingApproval.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to reject policy: ${error.message}`);
    }

    // Get policy for audit log
    const policy = await policyRegistryService.getPolicy(policyId);

    // Log audit event
    await this.logAuditEvent(
      policy.workspaceId,
      approverId,
      'policy_rejected',
      'policy',
      policyId,
      {
        version_id: versionId,
        reason
      }
    );

    return this.mapPolicyApproval(approval);
  }

  /**
   * Gets approval status for policy
   * Requirements: 7.5
   */
  async getApprovalStatus(policyId: string): Promise<GovernanceWorkflow> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    // Get policy
    const policy = await policyRegistryService.getPolicy(policyId);

    // Get workspace settings
    const { data: workspace, error: workspaceError } = await supabase!
      .from('workspaces')
      .select('settings')
      .eq('id', policy.workspaceId)
      .single();

    if (workspaceError) {
      throw new Error(`Failed to get workspace settings: ${workspaceError.message}`);
    }

    const settings = (workspace.settings || {}) as WorkspaceSettings;
    const requiredApprovals = settings.requiredApprovers || 1;

    // Get approvals for current version
    const { data: approvals, error: approvalsError } = await supabase!
      .from('policy_approvals')
      .select('*')
      .eq('policy_id', policyId)
      .order('created_at', { ascending: false });

    if (approvalsError) {
      throw new Error(`Failed to get approvals: ${approvalsError.message}`);
    }

    const mappedApprovals = (approvals || []).map(a => this.mapPolicyApproval(a));
    const approvedCount = mappedApprovals.filter(a => a.status === 'approved').length;
    const canPromote = approvedCount >= requiredApprovals;

    return {
      policyId,
      currentState: policy.state,
      requiredApprovals,
      approvals: mappedApprovals,
      canPromote
    };
  }

  /**
   * Notifies approvers when policy enters Review
   * Requirements: 7.6
   */
  async notifyApprovers(policyId: string, approverIds: string[]): Promise<void> {
    if (!isSupabaseConfigured()) {
      return;
    }

    // Get policy details
    const policy = await policyRegistryService.getPolicy(policyId);

    // Get approver details
    const { data: approvers, error } = await supabase!
      .from('users')
      .select('id, username, email')
      .in('id', approverIds);

    if (error) {
      console.error('Failed to get approver details:', error);
      return;
    }

    // In a real implementation, this would send emails or push notifications
    // For now, we'll just log the notification
    console.log(`Notifying approvers for policy ${policy.name}:`, approvers);

    // Log audit event
    await this.logAuditEvent(
      policy.workspaceId,
      policy.createdBy,
      'approvers_notified',
      'policy',
      policyId,
      {
        approver_ids: approverIds,
        approver_count: approverIds.length
      }
    );
  }

  /**
   * Prevents editing policies in Approved/Production state
   * Requirements: 7.7
   */
  async validateEditPermission(policyId: string, userId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    const policy = await policyRegistryService.getPolicy(policyId);

    // Policies in Approved or Production state cannot be edited
    // User must create a new version or revert to Draft
    if (policy.state === 'approved' || policy.state === 'production') {
      return false;
    }

    return true;
  }

  /**
   * Emergency bypass for critical fixes (logged)
   * Requirements: 7.8
   */
  async emergencyBypass(input: EmergencyBypassInput): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    const { policyId, userId, reason, targetState } = input;

    // Get policy
    const policy = await policyRegistryService.getPolicy(policyId);

    // Get workspace settings
    const { data: workspace, error: workspaceError } = await supabase!
      .from('workspaces')
      .select('settings')
      .eq('id', policy.workspaceId)
      .single();

    if (workspaceError) {
      throw new Error(`Failed to get workspace settings: ${workspaceError.message}`);
    }

    const settings = (workspace.settings || {}) as WorkspaceSettings;

    if (!settings.allowEmergencyBypass) {
      throw new Error('Emergency bypass is not enabled for this workspace');
    }

    // Validate state transition
    if (!validateTransition(policy.state, targetState)) {
      throw new Error(`Invalid state transition from ${policy.state} to ${targetState}`);
    }

    // Update policy state (bypass approval requirements)
    const { error } = await supabase!
      .from('policies')
      .update({ 
        state: targetState,
        updated_at: new Date().toISOString()
      })
      .eq('id', policyId);

    if (error) {
      throw new Error(`Failed to bypass approval: ${error.message}`);
    }

    // Log audit event with emergency bypass flag
    await this.logAuditEvent(
      policy.workspaceId,
      userId,
      'emergency_bypass',
      'policy',
      policyId,
      {
        from_state: policy.state,
        to_state: targetState,
        reason,
        bypass_type: 'emergency'
      }
    );
  }

  /**
   * Checks if change qualifies for auto-approval
   * Requirements: 7.9, 7.10
   */
  async checkAutoApproval(
    policyId: string,
    oldVersionId: string,
    newVersionId: string
  ): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    // Get policy
    const policy = await policyRegistryService.getPolicy(policyId);

    // Get workspace settings
    const { data: workspace, error: workspaceError } = await supabase!
      .from('workspaces')
      .select('settings')
      .eq('id', policy.workspaceId)
      .single();

    if (workspaceError) {
      throw new Error(`Failed to get workspace settings: ${workspaceError.message}`);
    }

    const settings = (workspace.settings || {}) as WorkspaceSettings;
    const autoApprovalRules = settings.autoApprovalRules || [];

    // If no rules are enabled, auto-approval is not available
    const enabledRules = autoApprovalRules.filter(rule => rule.enabled);
    if (enabledRules.length === 0) {
      return false;
    }

    // Get both versions
    const oldVersion = await policyRegistryService.getVersion(oldVersionId);
    const newVersion = await policyRegistryService.getVersion(newVersionId);

    // Check each rule
    for (const rule of enabledRules) {
      switch (rule.condition) {
        case 'lines_changed_lt': {
          const linesChanged = this.calculateLinesChanged(oldVersion.code, newVersion.code);
          if (linesChanged < rule.threshold) {
            return true;
          }
          break;
        }
        case 'metadata_only': {
          // Check if only metadata changed
          if (oldVersion.code === newVersion.code) {
            return true;
          }
          break;
        }
        case 'comment_only': {
          // Check if only comments changed (simplified check)
          const oldCodeNoComments = this.removeComments(oldVersion.code);
          const newCodeNoComments = this.removeComments(newVersion.code);
          if (oldCodeNoComments === newCodeNoComments) {
            return true;
          }
          break;
        }
      }
    }

    return false;
  }

  // Helper methods

  private calculateLinesChanged(oldCode: string, newCode: string): number {
    const oldLines = oldCode.split('\n');
    const newLines = newCode.split('\n');
    
    let changes = 0;
    const maxLength = Math.max(oldLines.length, newLines.length);
    
    for (let i = 0; i < maxLength; i++) {
      if (oldLines[i] !== newLines[i]) {
        changes++;
      }
    }
    
    return changes;
  }

  private removeComments(code: string): string {
    // Simple comment removal (handles // and /* */ comments)
    return code
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove /* */ comments
      .replace(/\/\/.*/g, '') // Remove // comments
      .trim();
  }

  private mapPolicyApproval(data: any): PolicyApproval {
    return {
      id: data.id,
      policyId: data.policy_id,
      versionId: data.version_id,
      approverId: data.approver_id,
      status: data.status,
      comment: data.comment || '',
      createdAt: new Date(data.created_at),
      decidedAt: data.decided_at ? new Date(data.decided_at) : undefined
    };
  }

  private async logAuditEvent(
    workspaceId: string,
    actorId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    metadata: any
  ): Promise<void> {
    if (!isSupabaseConfigured()) return;

    await supabase!.from('audit_log').insert({
      workspace_id: workspaceId,
      actor_id: actorId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      metadata
    });
  }
}

// Export singleton instance
export const governanceService = new GovernanceService();
