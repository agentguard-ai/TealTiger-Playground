/**
 * RBAC Simulator Service
 * Requirements: 13.1-13.10
 * 
 * Provides role-based access control simulation for testing policy behavior
 * across different user roles and permissions.
 */

import { supabase } from '../lib/supabase';
import type {
  RoleDefinition,
  SimulationResult,
  SimulationContext,
  EvaluationScenario,
  RoleComparison,
  RoleDifference,
  PolicyDecision,
} from '../types/rbac';

export class RBACSimulatorService {
  /**
   * Defines a custom role
   * Requirement: 13.1, 13.2, 13.6
   */
  async defineRole(
    workspaceId: string,
    role: RoleDefinition
  ): Promise<RoleDefinition> {
    const { data, error } = await supabase
      .from('rbac_roles')
      .insert({
        workspace_id: workspaceId,
        role_id: role.id,
        name: role.name,
        permissions: role.permissions,
        attributes: role.attributes,
        metadata: role.metadata,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.role_id,
      name: data.name,
      permissions: data.permissions,
      attributes: data.attributes,
      metadata: data.metadata,
    };
  }

  /**
   * Lists all role definitions for a workspace
   * Requirement: 13.6
   */
  async listRoles(workspaceId: string): Promise<RoleDefinition[]> {
    const { data, error } = await supabase
      .from('rbac_roles')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((row) => ({
      id: row.role_id,
      name: row.name,
      permissions: row.permissions,
      attributes: row.attributes,
      metadata: row.metadata,
    }));
  }

  /**
   * Simulates policy evaluation with a specific role
   * Requirement: 13.3, 13.4
   */
  async simulateWithRole(
    policyId: string,
    versionId: string,
    role: RoleDefinition,
    scenario: EvaluationScenario
  ): Promise<SimulationResult> {
    const startTime = performance.now();

    // Create simulation context with role
    const context: SimulationContext = {
      role,
      user: {
        id: `sim-user-${role.id}`,
        attributes: role.attributes,
      },
      environment: {
        timestamp: new Date(),
        simulation: true,
      },
    };

    // Get policy code
    const { data: versionData, error: versionError } = await supabase
      .from('policy_versions')
      .select('code')
      .eq('id', versionId)
      .single();

    if (versionError) throw versionError;

    // Execute policy with role context
    const decision = await this.executePolicyWithContext(
      versionData.code,
      context,
      scenario
    );

    const executionTime = performance.now() - startTime;

    return {
      role,
      decision,
      executionTime,
      metadata: {
        policyId,
        versionId,
        scenario: scenario.prompt.substring(0, 100),
      },
    };
  }

  /**
   * Simulates policy across multiple roles
   * Requirement: 13.5
   */
  async simulateAcrossRoles(
    policyId: string,
    versionId: string,
    roles: RoleDefinition[],
    scenario: EvaluationScenario
  ): Promise<SimulationResult[]> {
    const results = await Promise.all(
      roles.map((role) =>
        this.simulateWithRole(policyId, versionId, role, scenario)
      )
    );

    return results;
  }

  /**
   * Compares results across roles
   * Requirement: 13.8
   */
  compareRoleResults(results: SimulationResult[]): RoleComparison {
    const differences: RoleDifference[] = [];

    // Compare each pair of results
    for (let i = 0; i < results.length; i++) {
      for (let j = i + 1; j < results.length; j++) {
        const result1 = results[i];
        const result2 = results[j];

        // Compare decisions
        if (result1.decision.allowed !== result2.decision.allowed) {
          differences.push({
            role1: result1.role.name,
            role2: result2.role.name,
            field: 'decision',
            difference: `${result1.role.name}: ${result1.decision.allowed ? 'ALLOW' : 'DENY'} vs ${result2.role.name}: ${result2.decision.allowed ? 'ALLOW' : 'DENY'}`,
          });
        }

        // Compare execution times (if significantly different)
        const timeDiff = Math.abs(result1.executionTime - result2.executionTime);
        if (timeDiff > 100) {
          // More than 100ms difference
          differences.push({
            role1: result1.role.name,
            role2: result2.role.name,
            field: 'executionTime',
            difference: `${result1.role.name}: ${result1.executionTime.toFixed(2)}ms vs ${result2.role.name}: ${result2.executionTime.toFixed(2)}ms`,
          });
        }

        // Compare reasons
        if (result1.decision.reason !== result2.decision.reason) {
          differences.push({
            role1: result1.role.name,
            role2: result2.role.name,
            field: 'reason',
            difference: `${result1.role.name}: "${result1.decision.reason}" vs ${result2.role.name}: "${result2.decision.reason}"`,
          });
        }
      }
    }

    const summary = this.generateComparisonSummary(results, differences);

    return {
      differences,
      summary,
    };
  }

  /**
   * Imports role definitions from JSON
   * Requirement: 13.7
   */
  async importRoles(
    workspaceId: string,
    rolesJson: string
  ): Promise<RoleDefinition[]> {
    let roles: RoleDefinition[];

    try {
      roles = JSON.parse(rolesJson);
    } catch (error) {
      throw new Error('Invalid JSON format');
    }

    // Validate roles
    if (!Array.isArray(roles)) {
      throw new Error('JSON must contain an array of roles');
    }

    for (const role of roles) {
      if (!role.id || !role.name || !role.permissions || !role.attributes || !role.metadata) {
        throw new Error(`Invalid role structure: ${JSON.stringify(role)}`);
      }
    }

    // Insert roles into database
    const importedRoles: RoleDefinition[] = [];
    for (const role of roles) {
      try {
        const imported = await this.defineRole(workspaceId, role);
        importedRoles.push(imported);
      } catch (error) {
        console.error(`Failed to import role ${role.name}:`, error);
      }
    }

    return importedRoles;
  }

  /**
   * Exports role definitions as JSON
   * Requirement: 13.7
   */
  async exportRoles(workspaceId: string): Promise<string> {
    const roles = await this.listRoles(workspaceId);
    return JSON.stringify(roles, null, 2);
  }

  /**
   * Executes policy code with role context
   * Private helper method
   */
  private async executePolicyWithContext(
    policyCode: string,
    context: SimulationContext,
    scenario: EvaluationScenario
  ): Promise<PolicyDecision> {
    try {
      // Create a safe execution environment
      const policyFunction = new Function(
        'context',
        'scenario',
        `
        ${policyCode}
        
        // If policy exports a decision function, call it
        if (typeof evaluate === 'function') {
          return evaluate(context, scenario);
        }
        
        // Default: allow if no explicit policy
        return {
          allowed: true,
          reason: 'No policy evaluation function found',
          metadata: {}
        };
      `
      );

      const result = policyFunction(context, scenario);

      // Ensure result has required fields
      return {
        allowed: result.allowed ?? true,
        reason: result.reason || 'Policy executed successfully',
        metadata: result.metadata || {},
      };
    } catch (error) {
      return {
        allowed: false,
        reason: `Policy execution error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        metadata: { error: true },
      };
    }
  }

  /**
   * Generates a human-readable comparison summary
   * Private helper method
   */
  private generateComparisonSummary(
    results: SimulationResult[],
    differences: RoleDifference[]
  ): string {
    if (differences.length === 0) {
      return `All ${results.length} roles produced identical results.`;
    }

    const decisionDiffs = differences.filter((d) => d.field === 'decision');
    const timeDiffs = differences.filter((d) => d.field === 'executionTime');
    const reasonDiffs = differences.filter((d) => d.field === 'reason');

    const parts: string[] = [];

    if (decisionDiffs.length > 0) {
      parts.push(`${decisionDiffs.length} decision difference(s)`);
    }

    if (reasonDiffs.length > 0) {
      parts.push(`${reasonDiffs.length} reason difference(s)`);
    }

    if (timeDiffs.length > 0) {
      parts.push(`${timeDiffs.length} execution time difference(s)`);
    }

    return `Found ${differences.length} total difference(s) across ${results.length} roles: ${parts.join(', ')}.`;
  }
}

// Export singleton instance
export const rbacSimulatorService = new RBACSimulatorService();
