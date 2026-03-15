// EnvironmentService - Multi-environment support for policy deployment
// Requirements: 14.1-14.10

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type {
  DeploymentEnvironment,
  EnvironmentConfig,
  DeployedPolicy,
  EvaluationScenario,
  EnvironmentName,
  CreateEnvironmentInput,
  UpdateEnvironmentConfigInput,
  PromotePolicyInput,
  EnvironmentError,
} from '../types/environment';

export class EnvironmentService {
  /**
   * Creates an environment
   * Requirements: 14.1, 14.2
   */
  async createEnvironment(input: CreateEnvironmentInput): Promise<DeploymentEnvironment> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    const { workspaceId, name, config } = input;

    // Check if environment already exists for this workspace
    const { data: existing } = await supabase!
      .from('deployment_environments')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('name', name)
      .single();

    if (existing) {
      throw new Error(`Environment "${name}" already exists for this workspace`);
    }

    // Create environment
    const { data: environment, error } = await supabase!
      .from('deployment_environments')
      .insert({
        workspace_id: workspaceId,
        name,
        config,
        deployed_policies: [],
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create environment: ${error.message}`);
    }

    // Log audit event
    await this.logAuditEvent(
      workspaceId,
      'system', // TODO: Get actual user ID from context
      'environment_created',
      'environment',
      environment.id,
      { name }
    );

    return this.mapEnvironment(environment);
  }

  /**
   * Updates environment configuration
   * Requirements: 14.2
   */
  async updateConfig(input: UpdateEnvironmentConfigInput): Promise<DeploymentEnvironment> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    const { environmentId, config } = input;

    // Get current environment
    const { data: currentEnv, error: fetchError } = await supabase!
      .from('deployment_environments')
      .select('*')
      .eq('id', environmentId)
      .single();

    if (fetchError || !currentEnv) {
      throw new Error('Environment not found');
    }

    // Merge config
    const updatedConfig = {
      ...currentEnv.config,
      ...config,
    };

    // Update environment
    const { data: environment, error } = await supabase!
      .from('deployment_environments')
      .update({
        config: updatedConfig,
        updated_at: new Date().toISOString(),
      })
      .eq('id', environmentId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update environment config: ${error.message}`);
    }

    // Log audit event
    await this.logAuditEvent(
      currentEnv.workspace_id,
      'system',
      'environment_config_updated',
      'environment',
      environmentId,
      { config_changes: config }
    );

    return this.mapEnvironment(environment);
  }

  /**
   * Promotes policy to environment
   * Requirements: 14.3, 14.6, 14.7
   */
  async promotePolicy(input: PromotePolicyInput): Promise<DeployedPolicy> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    const { policyId, versionId, targetEnvironment, userId } = input;

    // Get policy details
    const { data: policy, error: policyError } = await supabase!
      .from('policies')
      .select('workspace_id, name')
      .eq('id', policyId)
      .single();

    if (policyError || !policy) {
      throw new Error('Policy not found');
    }

    // Get environment
    const { data: environment, error: envError } = await supabase!
      .from('deployment_environments')
      .select('*')
      .eq('workspace_id', policy.workspace_id)
      .eq('name', targetEnvironment)
      .single();

    if (envError || !environment) {
      throw new Error(`Environment "${targetEnvironment}" not found`);
    }

    // Create deployed policy record
    const deployedPolicy: DeployedPolicy = {
      policyId,
      versionId,
      deployedAt: new Date(),
      deployedBy: userId,
      status: 'active',
    };

    // Get current deployed policies
    const currentPolicies = environment.deployed_policies || [];

    // Deactivate previous version of this policy if exists
    const updatedPolicies = currentPolicies.map((p: any) =>
      p.policyId === policyId ? { ...p, status: 'inactive' } : p
    );

    // Add new deployment
    updatedPolicies.push({
      policyId: deployedPolicy.policyId,
      versionId: deployedPolicy.versionId,
      deployedAt: deployedPolicy.deployedAt.toISOString(),
      deployedBy: deployedPolicy.deployedBy,
      status: deployedPolicy.status,
    });

    // Update environment
    const { error: updateError } = await supabase!
      .from('deployment_environments')
      .update({
        deployed_policies: updatedPolicies,
        updated_at: new Date().toISOString(),
      })
      .eq('id', environment.id);

    if (updateError) {
      throw new Error(`Failed to promote policy: ${updateError.message}`);
    }

    // Log audit event (Requirements: 14.7)
    await this.logAuditEvent(
      policy.workspace_id,
      userId,
      'policy_promoted',
      'deployed_policy',
      policyId,
      {
        policy_name: policy.name,
        version_id: versionId,
        environment: targetEnvironment,
      }
    );

    return deployedPolicy;
  }

  /**
   * Rolls back to previous version
   * Requirements: 14.9
   */
  async rollback(environmentId: string, policyId: string): Promise<DeployedPolicy> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    // Get environment
    const { data: environment, error: envError } = await supabase!
      .from('deployment_environments')
      .select('*')
      .eq('id', environmentId)
      .single();

    if (envError || !environment) {
      throw new Error('Environment not found');
    }

    // Get deployed policies
    const deployedPolicies = environment.deployed_policies || [];

    // Find all versions of this policy (active and inactive)
    const policyVersions = deployedPolicies
      .filter((p: any) => p.policyId === policyId)
      .sort((a: any, b: any) => 
        new Date(b.deployedAt).getTime() - new Date(a.deployedAt).getTime()
      );

    if (policyVersions.length < 2) {
      throw new Error('No previous version available for rollback');
    }

    // Current (active) version is at index 0, previous is at index 1
    const previousVersion = policyVersions[1];

    // Deactivate current version and reactivate previous
    const updatedPolicies = deployedPolicies.map((p: any) => {
      if (p.policyId === policyId) {
        if (p.versionId === previousVersion.versionId) {
          return { ...p, status: 'active' };
        } else {
          return { ...p, status: 'inactive' };
        }
      }
      return p;
    });

    // Update environment
    const { error: updateError } = await supabase!
      .from('deployment_environments')
      .update({
        deployed_policies: updatedPolicies,
        updated_at: new Date().toISOString(),
      })
      .eq('id', environmentId);

    if (updateError) {
      throw new Error(`Failed to rollback policy: ${updateError.message}`);
    }

    // Log audit event
    await this.logAuditEvent(
      environment.workspace_id,
      'system',
      'policy_rolled_back',
      'deployed_policy',
      policyId,
      {
        environment: environment.name,
        rolled_back_to_version: previousVersion.versionId,
      }
    );

    return {
      policyId: previousVersion.policyId,
      versionId: previousVersion.versionId,
      deployedAt: new Date(previousVersion.deployedAt),
      deployedBy: previousVersion.deployedBy,
      status: 'active',
    };
  }

  /**
   * Lists deployed policies in environment
   * Requirements: 14.10
   */
  async listDeployedPolicies(environmentId: string): Promise<DeployedPolicy[]> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    const { data: environment, error } = await supabase!
      .from('deployment_environments')
      .select('deployed_policies')
      .eq('id', environmentId)
      .single();

    if (error || !environment) {
      throw new Error('Environment not found');
    }

    const policies = environment.deployed_policies || [];

    return policies.map((p: any) => ({
      policyId: p.policyId,
      versionId: p.versionId,
      deployedAt: new Date(p.deployedAt),
      deployedBy: p.deployedBy,
      status: p.status,
    }));
  }

  /**
   * Gets environment-specific test scenarios
   * Requirements: 14.5
   */
  async getEnvironmentScenarios(environmentId: string): Promise<EvaluationScenario[]> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    // Get scenarios linked to this environment
    const { data: scenarios, error } = await supabase!
      .from('policy_tests')
      .select('*')
      .eq('environment_id', environmentId);

    if (error) {
      throw new Error(`Failed to get environment scenarios: ${error.message}`);
    }

    return (scenarios || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      description: s.description || '',
      input: s.scenario,
      expectedOutput: s.expected,
      environmentId: s.environment_id,
    }));
  }

  /**
   * Gets all environments for a workspace
   */
  async listEnvironments(workspaceId: string): Promise<DeploymentEnvironment[]> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    const { data: environments, error } = await supabase!
      .from('deployment_environments')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to list environments: ${error.message}`);
    }

    return (environments || []).map(this.mapEnvironment);
  }

  /**
   * Gets a single environment by ID
   */
  async getEnvironment(environmentId: string): Promise<DeploymentEnvironment | null> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    const { data: environment, error } = await supabase!
      .from('deployment_environments')
      .select('*')
      .eq('id', environmentId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to get environment: ${error.message}`);
    }

    return this.mapEnvironment(environment);
  }

  /**
   * Gets environment by name for a workspace
   */
  async getEnvironmentByName(
    workspaceId: string,
    name: EnvironmentName
  ): Promise<DeploymentEnvironment | null> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    const { data: environment, error } = await supabase!
      .from('deployment_environments')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('name', name)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to get environment: ${error.message}`);
    }

    return this.mapEnvironment(environment);
  }

  // Helper methods

  private mapEnvironment(data: any): DeploymentEnvironment {
    return {
      id: data.id,
      workspaceId: data.workspace_id,
      name: data.name as EnvironmentName,
      config: data.config || {
        apiEndpoints: {},
        rateLimits: {},
        budgetLimits: {},
        rbacRules: [],
        customSettings: {},
      },
      deployedPolicies: (data.deployed_policies || []).map((p: any) => ({
        policyId: p.policyId,
        versionId: p.versionId,
        deployedAt: new Date(p.deployedAt),
        deployedBy: p.deployedBy,
        status: p.status,
      })),
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
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
      metadata,
    });
  }

  private handleError(error: any, defaultMessage: string): EnvironmentError {
    console.error('EnvironmentService error:', error);
    return {
      message: error?.message || defaultMessage,
      code: error?.code,
    };
  }
}

// Export singleton instance
export const environmentService = new EnvironmentService();
