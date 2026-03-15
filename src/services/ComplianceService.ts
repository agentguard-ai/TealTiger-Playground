// ComplianceService - Compliance framework mapping
// Requirements: 8.1-8.10

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type {
  ComplianceFramework,
  ComplianceRequirement,
  ComplianceMapping,
  ComplianceCoverage,
  CreateMappingInput,
  ExportMappingsInput
} from '../types/compliance';
import { BUILT_IN_FRAMEWORKS, getFrameworkById } from '../data/compliance-frameworks';

export class ComplianceService {
  /**
   * Built-in framework IDs
   * Requirements: 8.1-8.5
   */
  readonly FRAMEWORKS = {
    OWASP_ASI: 'owasp-asi-2024',
    NIST_AI_RMF: 'nist-ai-rmf-1.0',
    SOC2_TYPE_II: 'soc2-type-ii',
    ISO_27001: 'iso-27001-2022',
    GDPR: 'gdpr-2018'
  };

  /**
   * Maps a policy to a compliance requirement
   * Requirements: 8.1-8.5
   */
  async mapPolicyToRequirement(input: CreateMappingInput): Promise<ComplianceMapping> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    const { policyId, frameworkId, requirementId, notes, workspaceId, userId } = input;

    // Validate framework exists
    const framework = getFrameworkById(frameworkId);
    if (!framework) {
      throw new Error(`Framework not found: ${frameworkId}`);
    }

    // Validate requirement exists in framework
    const requirement = framework.requirements.find(r => r.id === requirementId);
    if (!requirement) {
      throw new Error(`Requirement not found: ${requirementId}`);
    }

    // Check if mapping already exists
    const { data: existing } = await supabase!
      .from('compliance_mappings')
      .select('id')
      .eq('policy_id', policyId)
      .eq('framework_id', frameworkId)
      .eq('requirement_id', requirementId)
      .limit(1)
      .single();

    if (existing) {
      throw new Error('Mapping already exists for this policy and requirement');
    }

    // Create mapping
    const { data: mapping, error } = await supabase!
      .from('compliance_mappings')
      .insert({
        policy_id: policyId,
        framework_id: frameworkId,
        requirement_id: requirementId,
        notes
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create mapping: ${error.message}`);
    }

    // Log audit event
    await this.logAuditEvent(workspaceId, userId, 'compliance_mapping_created', 'compliance_mapping', mapping.id, {
      policy_id: policyId,
      framework_id: frameworkId,
      requirement_id: requirementId
    });

    return this.mapComplianceMapping(mapping);
  }

  /**
   * Removes a compliance mapping
   * Requirements: 8.9
   */
  async unmapPolicy(mappingId: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    // Get mapping details for audit log
    const { data: mapping } = await supabase!
      .from('compliance_mappings')
      .select('*')
      .eq('id', mappingId)
      .single();

    if (!mapping) {
      throw new Error('Mapping not found');
    }

    // Delete mapping
    const { error } = await supabase!
      .from('compliance_mappings')
      .delete()
      .eq('id', mappingId);

    if (error) {
      throw new Error(`Failed to delete mapping: ${error.message}`);
    }

    // Log audit event
    await this.logAuditEvent(
      mapping.workspace_id,
      mapping.created_by,
      'compliance_mapping_deleted',
      'compliance_mapping',
      mappingId,
      {
        policy_id: mapping.policy_id,
        framework_id: mapping.framework_id,
        requirement_id: mapping.requirement_id
      }
    );
  }

  /**
   * Gets all mappings for a policy
   * Requirements: 8.6
   */
  async getPolicyMappings(policyId: string): Promise<ComplianceMapping[]> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    const { data: mappings, error } = await supabase!
      .from('compliance_mappings')
      .select('*')
      .eq('policy_id', policyId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get policy mappings: ${error.message}`);
    }

    return mappings.map(m => this.mapComplianceMapping(m));
  }

  /**
   * Calculates coverage for a framework
   * Requirements: 8.6
   */
  async calculateCoverage(workspaceId: string, frameworkId: string): Promise<ComplianceCoverage> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    // Get framework
    const framework = getFrameworkById(frameworkId);
    if (!framework) {
      throw new Error(`Framework not found: ${frameworkId}`);
    }

    const totalRequirements = framework.requirements.length;

    // Get all policies in workspace
    const { data: policies, error: policiesError } = await supabase!
      .from('policies')
      .select('id')
      .eq('workspace_id', workspaceId);

    if (policiesError) {
      throw new Error(`Failed to get workspace policies: ${policiesError.message}`);
    }

    const policyIds = policies.map(p => p.id);

    if (policyIds.length === 0) {
      // No policies in workspace
      return {
        frameworkId,
        totalRequirements,
        mappedRequirements: 0,
        coveragePercentage: 0,
        unmappedRequirements: framework.requirements
      };
    }

    // Get all mappings for workspace policies and framework
    const { data: mappings, error } = await supabase!
      .from('compliance_mappings')
      .select('requirement_id')
      .in('policy_id', policyIds)
      .eq('framework_id', frameworkId);

    if (error) {
      throw new Error(`Failed to calculate coverage: ${error.message}`);
    }

    // Get unique mapped requirement IDs
    const mappedRequirementIds = new Set(mappings.map(m => m.requirement_id));
    const mappedRequirements = mappedRequirementIds.size;

    // Calculate coverage percentage
    const coveragePercentage = totalRequirements > 0 
      ? Math.round((mappedRequirements / totalRequirements) * 100)
      : 0;

    // Get unmapped requirements
    const unmappedRequirements = framework.requirements.filter(
      req => !mappedRequirementIds.has(req.id)
    );

    return {
      frameworkId,
      totalRequirements,
      mappedRequirements,
      coveragePercentage,
      unmappedRequirements
    };
  }

  /**
   * Lists unmapped requirements
   * Requirements: 8.7
   */
  async getUnmappedRequirements(
    workspaceId: string,
    frameworkId: string
  ): Promise<ComplianceRequirement[]> {
    const coverage = await this.calculateCoverage(workspaceId, frameworkId);
    return coverage.unmappedRequirements;
  }

  /**
   * Loads a custom framework definition
   * Requirements: 8.8
   */
  async loadCustomFramework(
    workspaceId: string,
    definition: ComplianceFramework
  ): Promise<ComplianceFramework> {
    // Validate framework structure
    if (!definition.id || !definition.name || !definition.version) {
      throw new Error('Invalid framework: missing required fields (id, name, version)');
    }

    if (!Array.isArray(definition.requirements) || definition.requirements.length === 0) {
      throw new Error('Invalid framework: requirements must be a non-empty array');
    }

    // Validate each requirement
    for (const req of definition.requirements) {
      if (!req.id || !req.code || !req.title || !req.description || !req.category) {
        throw new Error('Invalid requirement: missing required fields');
      }
      // Ensure frameworkId matches
      req.frameworkId = definition.id;
    }

    // Note: Custom frameworks are stored in-memory for now
    // TODO: Add custom_frameworks table in future migration
    // For now, we just validate and return the framework
    console.warn('Custom frameworks are validated but not persisted. Add custom_frameworks table to persist.');

    return definition;
  }

  /**
   * Exports mappings as CSV or JSON
   * Requirements: 8.9
   */
  async exportMappings(input: ExportMappingsInput): Promise<string> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    const { workspaceId, frameworkId, format } = input;

    // Get all policies in workspace
    const { data: policies, error: policiesError } = await supabase!
      .from('policies')
      .select('id, name, description, current_version, state')
      .eq('workspace_id', workspaceId);

    if (policiesError) {
      throw new Error(`Failed to get workspace policies: ${policiesError.message}`);
    }

    const policyIds = policies.map(p => p.id);

    if (policyIds.length === 0) {
      return format === 'json' ? '[]' : 'No mappings found';
    }

    // Build query
    let query = supabase!
      .from('compliance_mappings')
      .select('*')
      .in('policy_id', policyIds);

    if (frameworkId) {
      query = query.eq('framework_id', frameworkId);
    }

    const { data: mappings, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to export mappings: ${error.message}`);
    }

    // Enrich with framework and requirement details
    const enrichedMappings = mappings.map(m => {
      const policy = policies.find(p => p.id === m.policy_id);
      const framework = getFrameworkById(m.framework_id);
      const requirement = framework?.requirements.find(r => r.id === m.requirement_id);

      return {
        mapping_id: m.id,
        policy_id: m.policy_id,
        policy_name: policy?.name || 'Unknown',
        policy_version: policy?.current_version || 'Unknown',
        policy_state: policy?.state || 'Unknown',
        framework_id: m.framework_id,
        framework_name: framework?.name || 'Unknown',
        requirement_id: m.requirement_id,
        requirement_code: requirement?.code || 'Unknown',
        requirement_title: requirement?.title || 'Unknown',
        requirement_category: requirement?.category || 'Unknown',
        notes: m.notes,
        created_at: m.created_at
      };
    });

    if (format === 'json') {
      return JSON.stringify(enrichedMappings, null, 2);
    } else {
      // CSV format
      if (enrichedMappings.length === 0) {
        return 'No mappings found';
      }

      // CSV header
      const headers = Object.keys(enrichedMappings[0]);
      const csvHeader = headers.join(',');

      // CSV rows
      const csvRows = enrichedMappings.map(mapping => {
        return headers.map(header => {
          const value = mapping[header as keyof typeof mapping];
          // Escape commas and quotes in CSV
          const stringValue = String(value || '');
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(',');
      });

      return [csvHeader, ...csvRows].join('\n');
    }
  }

  /**
   * Gets all built-in frameworks
   */
  getBuiltInFrameworks(): ComplianceFramework[] {
    return BUILT_IN_FRAMEWORKS;
  }

  /**
   * Gets a framework by ID (built-in or custom)
   */
  async getFramework(workspaceId: string, frameworkId: string): Promise<ComplianceFramework | null> {
    // Check built-in frameworks first
    const builtIn = getFrameworkById(frameworkId);
    if (builtIn) {
      return builtIn;
    }

    // Custom frameworks not yet supported (requires custom_frameworks table)
    return null;
  }

  /**
   * Lists all frameworks (built-in + custom) for a workspace
   */
  async listFrameworks(workspaceId: string): Promise<ComplianceFramework[]> {
    // Return only built-in frameworks for now
    // TODO: Add custom frameworks when custom_frameworks table is added
    return [...BUILT_IN_FRAMEWORKS];
  }

  // Helper methods

  private mapComplianceMapping(data: any): ComplianceMapping {
    return {
      id: data.id,
      policyId: data.policy_id,
      frameworkId: data.framework_id,
      requirementId: data.requirement_id,
      notes: data.notes,
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
export const complianceService = new ComplianceService();
