// PolicySharingService - Public/private policy sharing, starring, forking
// Requirements: 21.1-21.10

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type {
  SharedPolicy,
  PolicyVisibility,
  PolicyReport,
  PolicySearchFilters,
} from '../types/sharing';

export class PolicySharingService {
  /**
   * Makes a policy publicly visible
   * Requirements: 21.1
   */
  async makePublic(policyId: string, workspaceId: string): Promise<void> {
    await this.setVisibility(policyId, workspaceId, 'public');
  }

  /**
   * Makes a policy private (workspace-only)
   * Requirements: 21.2
   */
  async makePrivate(policyId: string, workspaceId: string): Promise<void> {
    await this.setVisibility(policyId, workspaceId, 'private');
  }

  /**
   * Searches public policies
   * Requirements: 21.3
   */
  async searchPublicPolicies(filters: PolicySearchFilters): Promise<SharedPolicy[]> {
    if (!isSupabaseConfigured()) return [];

    let query = supabase!
      .from('shared_policies')
      .select('*')
      .eq('visibility', 'public');

    if (filters.query) {
      query = query.or(`name.ilike.%${filters.query}%,description.ilike.%${filters.query}%`);
    }
    if (filters.category) {
      query = query.eq('category', filters.category);
    }
    if (filters.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags);
    }

    const sortField = {
      stars: 'stars',
      forks: 'forks',
      views: 'views',
      recent: 'updated_at',
    }[filters.sortBy || 'stars'] || 'stars';

    query = query.order(sortField, { ascending: false });

    if (filters.limit) query = query.limit(filters.limit);
    if (filters.offset) query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map(this.mapSharedPolicy);
  }

  /**
   * Stars a policy
   * Requirements: 21.4
   */
  async starPolicy(policyId: string, userId: string): Promise<void> {
    if (!isSupabaseConfigured()) return;

    await supabase!.from('policy_stars').upsert({
      policy_id: policyId,
      user_id: userId,
    }, { onConflict: 'policy_id,user_id' });

    // Increment star count
    await supabase!.rpc('increment_policy_stars', { p_policy_id: policyId });
  }

  /**
   * Unstars a policy
   * Requirements: 21.4
   */
  async unstarPolicy(policyId: string, userId: string): Promise<void> {
    if (!isSupabaseConfigured()) return;

    await supabase!
      .from('policy_stars')
      .delete()
      .eq('policy_id', policyId)
      .eq('user_id', userId);

    await supabase!.rpc('decrement_policy_stars', { p_policy_id: policyId });
  }

  /**
   * Forks a public policy into a workspace
   * Requirements: 21.5
   */
  async forkPolicy(policyId: string, targetWorkspaceId: string, userId: string): Promise<string | null> {
    if (!isSupabaseConfigured()) return null;

    // Get the source policy
    const { data: source, error } = await supabase!
      .from('shared_policies')
      .select('*, policy_versions(*)')
      .eq('policy_id', policyId)
      .eq('visibility', 'public')
      .single();

    if (error || !source) return null;

    // Create a copy in the target workspace
    const { data: newPolicy, error: createError } = await supabase!
      .from('policies')
      .insert({
        workspace_id: targetWorkspaceId,
        name: `${source.name} (fork)`,
        description: source.description,
        state: 'Draft',
        created_by: userId,
        forked_from: policyId,
      })
      .select('id')
      .single();

    if (createError || !newPolicy) return null;

    // Increment fork count
    await supabase!.rpc('increment_policy_forks', { p_policy_id: policyId });

    // Log audit
    await this.logAudit(targetWorkspaceId, userId, 'policy_forked', {
      sourcePolicyId: policyId,
      newPolicyId: newPolicy.id,
    });

    return newPolicy.id;
  }

  /**
   * Reports a policy for inappropriate content
   * Requirements: 21.6
   */
  async reportPolicy(report: Omit<PolicyReport, 'id' | 'status' | 'createdAt'>): Promise<void> {
    if (!isSupabaseConfigured()) return;

    await supabase!.from('policy_reports').insert({
      policy_id: report.policyId,
      reporter_id: report.reporterId,
      reason: report.reason,
      description: report.description,
      status: 'pending',
    });
  }

  /**
   * Gets popularity metrics for a policy
   * Requirements: 21.7
   */
  async getPopularity(policyId: string): Promise<{ stars: number; forks: number; views: number }> {
    if (!isSupabaseConfigured()) return { stars: 0, forks: 0, views: 0 };

    const { data } = await supabase!
      .from('shared_policies')
      .select('stars, forks, views')
      .eq('policy_id', policyId)
      .single();

    if (!data) return { stars: 0, forks: 0, views: 0 };
    return { stars: data.stars || 0, forks: data.forks || 0, views: data.views || 0 };
  }

  // --- Private helpers ---

  private async setVisibility(policyId: string, workspaceId: string, visibility: PolicyVisibility): Promise<void> {
    if (!isSupabaseConfigured()) return;

    await supabase!
      .from('shared_policies')
      .upsert({
        policy_id: policyId,
        workspace_id: workspaceId,
        visibility,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'policy_id' });

    await this.logAudit(workspaceId, 'system', `policy_visibility_${visibility}`, { policyId });
  }

  private mapSharedPolicy(row: any): SharedPolicy {
    return {
      id: row.id,
      policyId: row.policy_id,
      workspaceId: row.workspace_id,
      name: row.name,
      description: row.description || '',
      author: row.author || 'Unknown',
      authorAvatar: row.author_avatar,
      visibility: row.visibility,
      stars: row.stars || 0,
      forks: row.forks || 0,
      views: row.views || 0,
      testCoverage: row.test_coverage || 0,
      approvalStatus: row.approval_status || 'draft',
      tags: row.tags || [],
      category: row.category || 'general',
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private async logAudit(workspaceId: string, actorId: string, action: string, metadata: any): Promise<void> {
    if (!isSupabaseConfigured()) return;
    try {
      await supabase!.from('audit_log').insert({
        workspace_id: workspaceId,
        actor_id: actorId,
        action,
        resource_type: 'policy_sharing',
        resource_id: workspaceId,
        metadata,
      });
    } catch {
      console.warn('Failed to log audit event:', action);
    }
  }
}

export const policySharingService = new PolicySharingService();
