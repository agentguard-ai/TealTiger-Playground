// PolicyRegistryService - Policy versioning and management
// Requirements: 3.1-3.10

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type {
  Policy,
  PolicyVersion,
  PolicyMetadata,
  PolicyFilters,
  PolicyState,
  CreatePolicyInput,
  SaveVersionInput,
  SearchPoliciesInput,
  BranchPolicyInput
} from '../types/policy';

export class PolicyRegistryService {
  /**
   * Creates a new policy (Draft state)
   * Requirements: 3.1, 3.2, 3.3, 3.4
   */
  async createPolicy(input: CreatePolicyInput): Promise<Policy> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    const { workspaceId, name, description, code, metadata, userId } = input;

    // Validate unique name within workspace
    const isUnique = await this.validateUniqueName(workspaceId, name);
    if (!isUnique) {
      throw new Error(`Policy name "${name}" already exists in this workspace`);
    }

    // Create policy with initial version 1.0.0
    const initialVersion = '1.0.0';

    // Insert policy
    const { data: policy, error: policyError } = await supabase!
      .from('policies')
      .insert({
        workspace_id: workspaceId,
        name,
        description: description || '',
        current_version: initialVersion,
        state: 'draft',
        created_by: userId
      })
      .select()
      .single();

    if (policyError) {
      throw new Error(`Failed to create policy: ${policyError.message}`);
    }

    // Insert initial version
    const { error: versionError } = await supabase!
      .from('policy_versions')
      .insert({
        policy_id: policy.id,
        version: initialVersion,
        code,
        metadata,
        created_by: userId
      });

    if (versionError) {
      // Rollback policy creation
      await supabase!.from('policies').delete().eq('id', policy.id);
      throw new Error(`Failed to create policy version: ${versionError.message}`);
    }

    // Log audit event
    await this.logAuditEvent(workspaceId, userId, 'policy_created', 'policy', policy.id, {
      name,
      version: initialVersion
    });

    return this.mapPolicy(policy);
  }

  /**
   * Saves a new version of existing policy
   * Requirements: 3.2, 3.3
   */
  async saveVersion(input: SaveVersionInput): Promise<PolicyVersion> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    const { policyId, code, versionType, userId, metadata } = input;

    // Get current policy
    const { data: policy, error: policyError } = await supabase!
      .from('policies')
      .select('*')
      .eq('id', policyId)
      .single();

    if (policyError || !policy) {
      throw new Error('Policy not found');
    }

    // Calculate new version
    const newVersion = this.incrementVersion(policy.current_version, versionType);

    // Get metadata from latest version if not provided
    let versionMetadata = metadata;
    if (!versionMetadata) {
      const { data: latestVersion } = await supabase!
        .from('policy_versions')
        .select('metadata')
        .eq('policy_id', policyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      versionMetadata = latestVersion?.metadata || {
        tags: [],
        category: '',
        providers: [],
        models: [],
        estimatedCost: 0,
        testCoverage: 0
      };
    }

    // Insert new version
    const { data: version, error: versionError } = await supabase!
      .from('policy_versions')
      .insert({
        policy_id: policyId,
        version: newVersion,
        code,
        metadata: versionMetadata,
        created_by: userId
      })
      .select()
      .single();

    if (versionError) {
      throw new Error(`Failed to save version: ${versionError.message}`);
    }

    // Update policy current_version
    await supabase!
      .from('policies')
      .update({ current_version: newVersion, updated_at: new Date().toISOString() })
      .eq('id', policyId);

    // Log audit event
    await this.logAuditEvent(policy.workspace_id, userId, 'policy_updated', 'policy_version', version.id, {
      policy_id: policyId,
      version: newVersion,
      version_type: versionType
    });

    return this.mapPolicyVersion(version);
  }

  /**
   * Reverts policy to a previous version
   * Requirements: 3.7
   */
  async revertToVersion(policyId: string, versionId: string, userId: string): Promise<PolicyVersion> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    // Get the target version
    const { data: targetVersion, error: versionError } = await supabase!
      .from('policy_versions')
      .select('*')
      .eq('id', versionId)
      .eq('policy_id', policyId)
      .single();

    if (versionError || !targetVersion) {
      throw new Error('Version not found');
    }

    // Get current policy
    const { data: policy, error: policyError } = await supabase!
      .from('policies')
      .select('*')
      .eq('id', policyId)
      .single();

    if (policyError || !policy) {
      throw new Error('Policy not found');
    }

    // Create new version with reverted code (increment patch version)
    const newVersion = this.incrementVersion(policy.current_version, 'patch');

    const { data: revertedVersion, error: insertError } = await supabase!
      .from('policy_versions')
      .insert({
        policy_id: policyId,
        version: newVersion,
        code: targetVersion.code,
        metadata: targetVersion.metadata,
        created_by: userId
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to revert version: ${insertError.message}`);
    }

    // Update policy current_version
    await supabase!
      .from('policies')
      .update({ current_version: newVersion, updated_at: new Date().toISOString() })
      .eq('id', policyId);

    // Log audit event
    await this.logAuditEvent(policy.workspace_id, userId, 'policy_reverted', 'policy_version', revertedVersion.id, {
      policy_id: policyId,
      reverted_to_version: targetVersion.version,
      new_version: newVersion
    });

    return this.mapPolicyVersion(revertedVersion);
  }

  /**
   * Lists all versions of a policy
   * Requirements: 3.6
   */
  async listVersions(policyId: string): Promise<PolicyVersion[]> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    const { data: versions, error } = await supabase!
      .from('policy_versions')
      .select('*')
      .eq('policy_id', policyId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list versions: ${error.message}`);
    }

    return versions.map(v => this.mapPolicyVersion(v));
  }

  /**
   * Gets a specific policy version
   * Requirements: 3.6
   */
  async getVersion(versionId: string): Promise<PolicyVersion> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    const { data: version, error } = await supabase!
      .from('policy_versions')
      .select('*')
      .eq('id', versionId)
      .single();

    if (error || !version) {
      throw new Error('Version not found');
    }

    return this.mapPolicyVersion(version);
  }

  /**
   * Searches policies by name, tag, or author
   * Requirements: 3.5
   */
  async searchPolicies(input: SearchPoliciesInput): Promise<Policy[]> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    const { workspaceId, query, filters } = input;

    let queryBuilder = supabase!
      .from('policies')
      .select('*')
      .eq('workspace_id', workspaceId);

    // Text search on name and description
    if (query) {
      queryBuilder = queryBuilder.or(`name.ilike.%${query}%,description.ilike.%${query}%`);
    }

    // Apply filters
    if (filters?.state) {
      queryBuilder = queryBuilder.eq('state', filters.state);
    }

    if (filters?.author) {
      queryBuilder = queryBuilder.eq('created_by', filters.author);
    }

    if (filters?.dateRange) {
      queryBuilder = queryBuilder
        .gte('created_at', filters.dateRange.start.toISOString())
        .lte('created_at', filters.dateRange.end.toISOString());
    }

    // For tag and category filters, we need to join with policy_versions
    if (filters?.tags || filters?.category) {
      // Get latest versions with metadata
      const { data: versions, error: versionError } = await supabase!
        .from('policy_versions')
        .select('policy_id, metadata')
        .in('policy_id', 
          supabase!.from('policies').select('id').eq('workspace_id', workspaceId)
        );

      if (versionError) {
        throw new Error(`Failed to search policies: ${versionError.message}`);
      }

      // Filter by metadata
      const matchingPolicyIds = versions
        ?.filter(v => {
          const metadata = v.metadata as PolicyMetadata;
          if (filters.tags && !filters.tags.some(tag => metadata.tags?.includes(tag))) {
            return false;
          }
          if (filters.category && metadata.category !== filters.category) {
            return false;
          }
          return true;
        })
        .map(v => v.policy_id) || [];

      if (matchingPolicyIds.length > 0) {
        queryBuilder = queryBuilder.in('id', matchingPolicyIds);
      } else {
        // No matching policies
        return [];
      }
    }

    const { data: policies, error } = await queryBuilder.order('updated_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to search policies: ${error.message}`);
    }

    return policies.map(p => this.mapPolicy(p));
  }

  /**
   * Creates a branch for experimental changes
   * Requirements: 3.9
   */
  async branchPolicy(input: BranchPolicyInput): Promise<Policy> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    const { policyId, branchName, userId } = input;

    // Get source policy
    const { data: sourcePolicy, error: policyError } = await supabase!
      .from('policies')
      .select('*')
      .eq('id', policyId)
      .single();

    if (policyError || !sourcePolicy) {
      throw new Error('Source policy not found');
    }

    // Get latest version
    const { data: latestVersion, error: versionError } = await supabase!
      .from('policy_versions')
      .select('*')
      .eq('policy_id', policyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (versionError || !latestVersion) {
      throw new Error('Source policy version not found');
    }

    // Create new policy with branch name
    const branchedName = `${sourcePolicy.name}-${branchName}`;
    
    return this.createPolicy({
      workspaceId: sourcePolicy.workspace_id,
      name: branchedName,
      description: `Branch of ${sourcePolicy.name}: ${sourcePolicy.description || ''}`,
      code: latestVersion.code,
      metadata: latestVersion.metadata,
      userId
    });
  }

  /**
   * Enforces unique policy names within workspace
   * Requirements: 3.10
   */
  async validateUniqueName(workspaceId: string, name: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    const { data, error } = await supabase!
      .from('policies')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('name', name)
      .limit(1);

    if (error) {
      throw new Error(`Failed to validate name: ${error.message}`);
    }

    return data.length === 0;
  }

  /**
   * Gets a policy by ID
   */
  async getPolicy(policyId: string): Promise<Policy> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    const { data: policy, error } = await supabase!
      .from('policies')
      .select('*')
      .eq('id', policyId)
      .single();

    if (error || !policy) {
      throw new Error('Policy not found');
    }

    return this.mapPolicy(policy);
  }

  /**
   * Lists all policies in a workspace
   */
  async listPolicies(workspaceId: string): Promise<Policy[]> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    const { data: policies, error } = await supabase!
      .from('policies')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list policies: ${error.message}`);
    }

    return policies.map(p => this.mapPolicy(p));
  }

  // Helper methods

  private incrementVersion(currentVersion: string, versionType: 'major' | 'minor' | 'patch'): string {
    const parts = currentVersion.split('.').map(Number);
    
    switch (versionType) {
      case 'major':
        return `${parts[0] + 1}.0.0`;
      case 'minor':
        return `${parts[0]}.${parts[1] + 1}.0`;
      case 'patch':
        return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
      default:
        throw new Error(`Invalid version type: ${versionType}`);
    }
  }

  private mapPolicy(data: any): Policy {
    return {
      id: data.id,
      workspaceId: data.workspace_id,
      name: data.name,
      description: data.description,
      currentVersion: data.current_version,
      state: data.state as PolicyState,
      createdBy: data.created_by,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  private mapPolicyVersion(data: any): PolicyVersion {
    return {
      id: data.id,
      policyId: data.policy_id,
      version: data.version,
      code: data.code,
      metadata: data.metadata as PolicyMetadata,
      createdBy: data.created_by,
      createdAt: new Date(data.created_at)
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
export const policyRegistryService = new PolicyRegistryService();
