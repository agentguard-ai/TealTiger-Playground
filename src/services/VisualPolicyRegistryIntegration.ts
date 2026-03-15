/**
 * Visual Policy Registry Integration
 * 
 * Integrates visual policies with the PolicyRegistryService for versioning,
 * governance, and deployment workflows.
 * 
 * Requirements: 7.3, 24.1, 24.2
 */

import type { VisualPolicy } from '../types/visual-policy';
import type { Policy, PolicyVersion, CreatePolicyInput, SaveVersionInput, PolicyMetadata } from '../types/policy';
import { PolicyRegistryService } from './PolicyRegistryService';
import { CodeGenerator } from './CodeGenerator';

/**
 * Integration service for saving visual policies to the policy registry
 */
export class VisualPolicyRegistryIntegration {
  private policyRegistry: PolicyRegistryService;
  private codeGenerator: CodeGenerator;
  
  constructor() {
    this.policyRegistry = new PolicyRegistryService();
    this.codeGenerator = new CodeGenerator();
  }
  
  /**
   * Save a visual policy to the policy registry
   * Generates code from the visual policy and creates a new policy in the registry
   */
  async saveToRegistry(visualPolicy: VisualPolicy, userId: string): Promise<Policy> {
    // Generate code from visual policy
    const generatedCode = this.codeGenerator.generateCode(visualPolicy);
    
    // Check for code generation errors
    if (!generatedCode.syntaxValid || generatedCode.errors.length > 0) {
      throw new Error(
        `Cannot save policy with code generation errors: ${generatedCode.errors.map(e => e.message).join(', ')}`
      );
    }
    
    // Assemble full code with imports
    const fullCode = this.assembleFullCode(generatedCode.imports, generatedCode.code, generatedCode.exports);
    
    // Convert visual policy metadata to registry metadata
    const registryMetadata = this.convertMetadata(visualPolicy);
    
    // Create policy in registry
    const input: CreatePolicyInput = {
      workspaceId: visualPolicy.workspaceId,
      name: visualPolicy.name,
      description: visualPolicy.description,
      code: fullCode,
      metadata: registryMetadata,
      userId,
    };
    
    return await this.policyRegistry.createPolicy(input);
  }
  
  /**
   * Save a new version of an existing visual policy to the registry
   */
  async saveVersion(
    visualPolicy: VisualPolicy,
    policyId: string,
    versionType: 'major' | 'minor' | 'patch',
    userId: string
  ): Promise<PolicyVersion> {
    // Generate code from visual policy
    const generatedCode = this.codeGenerator.generateCode(visualPolicy);
    
    // Check for code generation errors
    if (!generatedCode.syntaxValid || generatedCode.errors.length > 0) {
      throw new Error(
        `Cannot save version with code generation errors: ${generatedCode.errors.map(e => e.message).join(', ')}`
      );
    }
    
    // Assemble full code with imports
    const fullCode = this.assembleFullCode(generatedCode.imports, generatedCode.code, generatedCode.exports);
    
    // Convert visual policy metadata to registry metadata
    const registryMetadata = this.convertMetadata(visualPolicy);
    
    // Save version in registry
    const input: SaveVersionInput = {
      policyId,
      code: fullCode,
      versionType,
      userId,
      metadata: registryMetadata,
    };
    
    return await this.policyRegistry.saveVersion(input);
  }
  
  /**
   * Get a policy from the registry
   */
  async getPolicy(policyId: string): Promise<Policy> {
    return await this.policyRegistry.getPolicy(policyId);
  }
  
  /**
   * List all policies in a workspace
   */
  async listPolicies(workspaceId: string): Promise<Policy[]> {
    return await this.policyRegistry.listPolicies(workspaceId);
  }
  
  /**
   * Get all versions of a policy
   */
  async listVersions(policyId: string): Promise<PolicyVersion[]> {
    return await this.policyRegistry.listVersions(policyId);
  }
  
  /**
   * Get a specific version of a policy
   */
  async getVersion(versionId: string): Promise<PolicyVersion> {
    return await this.policyRegistry.getVersion(versionId);
  }
  
  // ============================================================================
  // Private Helper Methods
  // ============================================================================
  
  /**
   * Assemble full code with imports and exports
   */
  private assembleFullCode(imports: string[], code: string, exports: string[]): string {
    const parts: string[] = [];
    
    // Add imports
    if (imports.length > 0) {
      parts.push(imports.join('\n'));
      parts.push('');
    }
    
    // Add main code
    parts.push(code);
    parts.push('');
    
    // Add exports
    if (exports.length > 0) {
      parts.push(exports.join('\n'));
    }
    
    return parts.join('\n');
  }
  
  /**
   * Convert visual policy metadata to registry metadata format
   */
  private convertMetadata(visualPolicy: VisualPolicy): PolicyMetadata {
    const metadata = visualPolicy.metadata;
    
    return {
      tags: metadata.tags || [],
      category: metadata.category || 'security',
      providers: metadata.providers || [],
      models: metadata.models || [],
      estimatedCost: metadata.estimatedCost || 0,
      testCoverage: metadata.testCoverage || 0,
    };
  }
}

// Export singleton instance
export const visualPolicyRegistryIntegration = new VisualPolicyRegistryIntegration();
