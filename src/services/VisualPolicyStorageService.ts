/**
 * Visual Policy Storage Service
 * 
 * MVP Implementation: localStorage-based storage
 * Future: Swappable to Supabase backend
 * 
 * This service provides a storage abstraction for visual policies that can be
 * easily upgraded from localStorage to Supabase without changing the API.
 * 
 * Requirements: 1.10, 18.1-18.10
 */

import type { VisualPolicy, CustomBlockDefinition } from '../types/visual-policy';

// Storage keys
const STORAGE_KEYS = {
  VISUAL_POLICIES: 'tealtiger_visual_policies',
  CUSTOM_BLOCKS: 'tealtiger_custom_blocks',
  POLICY_INDEX: 'tealtiger_policy_index',
} as const;

// Storage interface for future swappability
export interface IVisualPolicyStorage {
  // Visual Policy Operations
  saveVisualPolicy(policy: VisualPolicy): Promise<void>;
  loadVisualPolicy(policyId: string): Promise<VisualPolicy | null>;
  deleteVisualPolicy(policyId: string): Promise<void>;
  listVisualPolicies(workspaceId: string): Promise<VisualPolicy[]>;
  
  // Custom Block Operations
  saveCustomBlock(block: CustomBlockDefinition): Promise<void>;
  loadCustomBlock(blockId: string): Promise<CustomBlockDefinition | null>;
  deleteCustomBlock(blockId: string): Promise<void>;
  listCustomBlocks(workspaceId: string): Promise<CustomBlockDefinition[]>;
  
  // Utility
  exportPolicy(policyId: string): Promise<string>;
  importPolicy(jsonData: string): Promise<VisualPolicy>;
}

/**
 * LocalStorage-based implementation for MVP
 * Provides immediate functionality without backend setup
 */
export class LocalStorageVisualPolicyStorage implements IVisualPolicyStorage {
  
  // ============================================================================
  // Visual Policy Operations
  // ============================================================================
  
  async saveVisualPolicy(policy: VisualPolicy): Promise<void> {
    try {
      // Get existing policies
      const policies = this.getAllPolicies();
      
      // Update or add policy
      const existingIndex = policies.findIndex(p => p.id === policy.id);
      if (existingIndex >= 0) {
        policies[existingIndex] = {
          ...policy,
          updatedAt: new Date(),
        };
      } else {
        policies.push({
          ...policy,
          createdAt: policy.createdAt || new Date(),
          updatedAt: new Date(),
        });
      }
      
      // Save back to localStorage
      localStorage.setItem(STORAGE_KEYS.VISUAL_POLICIES, JSON.stringify(policies));
      
      // Update index for fast lookups
      this.updatePolicyIndex(policy);
      
    } catch (error) {
      console.error('Failed to save visual policy:', error);
      throw new Error('Failed to save visual policy to storage');
    }
  }
  
  async loadVisualPolicy(policyId: string): Promise<VisualPolicy | null> {
    try {
      const policies = this.getAllPolicies();
      const policy = policies.find(p => p.id === policyId);
      return policy || null;
    } catch (error) {
      console.error('Failed to load visual policy:', error);
      return null;
    }
  }
  
  async deleteVisualPolicy(policyId: string): Promise<void> {
    try {
      const policies = this.getAllPolicies();
      const filtered = policies.filter(p => p.id !== policyId);
      localStorage.setItem(STORAGE_KEYS.VISUAL_POLICIES, JSON.stringify(filtered));
      
      // Update index
      this.removePolicyFromIndex(policyId);
      
    } catch (error) {
      console.error('Failed to delete visual policy:', error);
      throw new Error('Failed to delete visual policy from storage');
    }
  }
  
  async listVisualPolicies(workspaceId: string): Promise<VisualPolicy[]> {
    try {
      const policies = this.getAllPolicies();
      return policies.filter(p => p.workspaceId === workspaceId);
    } catch (error) {
      console.error('Failed to list visual policies:', error);
      return [];
    }
  }
  
  // ============================================================================
  // Custom Block Operations
  // ============================================================================
  
  async saveCustomBlock(block: CustomBlockDefinition): Promise<void> {
    try {
      const blocks = this.getAllCustomBlocks();
      
      // Update or add block
      const existingIndex = blocks.findIndex(b => b.id === block.id);
      if (existingIndex >= 0) {
        blocks[existingIndex] = {
          ...block,
          updatedAt: new Date(),
        };
      } else {
        blocks.push({
          ...block,
          createdAt: block.createdAt || new Date(),
          updatedAt: new Date(),
        });
      }
      
      localStorage.setItem(STORAGE_KEYS.CUSTOM_BLOCKS, JSON.stringify(blocks));
      
    } catch (error) {
      console.error('Failed to save custom block:', error);
      throw new Error('Failed to save custom block to storage');
    }
  }
  
  async loadCustomBlock(blockId: string): Promise<CustomBlockDefinition | null> {
    try {
      const blocks = this.getAllCustomBlocks();
      const block = blocks.find(b => b.id === blockId);
      return block || null;
    } catch (error) {
      console.error('Failed to load custom block:', error);
      return null;
    }
  }
  
  async deleteCustomBlock(blockId: string): Promise<void> {
    try {
      const blocks = this.getAllCustomBlocks();
      const filtered = blocks.filter(b => b.id !== blockId);
      localStorage.setItem(STORAGE_KEYS.CUSTOM_BLOCKS, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to delete custom block:', error);
      throw new Error('Failed to delete custom block from storage');
    }
  }
  
  async listCustomBlocks(workspaceId: string): Promise<CustomBlockDefinition[]> {
    try {
      const blocks = this.getAllCustomBlocks();
      return blocks.filter(b => b.workspaceId === workspaceId);
    } catch (error) {
      console.error('Failed to list custom blocks:', error);
      return [];
    }
  }
  
  // ============================================================================
  // Export/Import Operations
  // ============================================================================
  
  async exportPolicy(policyId: string): Promise<string> {
    try {
      const policy = await this.loadVisualPolicy(policyId);
      if (!policy) {
        throw new Error('Policy not found');
      }
      
      // Get custom blocks used in this policy
      const customBlockIds = policy.metadata?.customBlockIds || [];
      const customBlocks: CustomBlockDefinition[] = [];
      
      for (const blockId of customBlockIds) {
        const block = await this.loadCustomBlock(blockId);
        if (block) {
          customBlocks.push(block);
        }
      }
      
      // Create export object
      const exportData = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        policy,
        customBlocks,
      };
      
      return JSON.stringify(exportData, null, 2);
      
    } catch (error) {
      console.error('Failed to export policy:', error);
      throw new Error('Failed to export policy');
    }
  }
  
  async importPolicy(jsonData: string): Promise<VisualPolicy> {
    try {
      const importData = JSON.parse(jsonData);
      
      // Validate import data
      if (!importData.policy) {
        throw new Error('Invalid import data: missing policy');
      }
      
      // Generate new IDs to avoid conflicts
      const newPolicyId = this.generateId();
      const policy: VisualPolicy = {
        ...importData.policy,
        id: newPolicyId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // Import custom blocks if present
      if (importData.customBlocks && Array.isArray(importData.customBlocks)) {
        for (const block of importData.customBlocks) {
          const newBlockId = this.generateId();
          const customBlock: CustomBlockDefinition = {
            ...block,
            id: newBlockId,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          await this.saveCustomBlock(customBlock);
        }
      }
      
      // Save imported policy
      await this.saveVisualPolicy(policy);
      
      return policy;
      
    } catch (error) {
      console.error('Failed to import policy:', error);
      throw new Error('Failed to import policy');
    }
  }
  
  // ============================================================================
  // Private Helper Methods
  // ============================================================================
  
  private getAllPolicies(): VisualPolicy[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.VISUAL_POLICIES);
      if (!data) return [];
      
      const policies = JSON.parse(data);
      
      // Convert date strings back to Date objects
      return policies.map((p: any) => ({
        ...p,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt),
      }));
    } catch (error) {
      console.error('Failed to parse policies from localStorage:', error);
      return [];
    }
  }
  
  private getAllCustomBlocks(): CustomBlockDefinition[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CUSTOM_BLOCKS);
      if (!data) return [];
      
      const blocks = JSON.parse(data);
      
      // Convert date strings back to Date objects
      return blocks.map((b: any) => ({
        ...b,
        createdAt: new Date(b.createdAt),
        updatedAt: new Date(b.updatedAt),
      }));
    } catch (error) {
      console.error('Failed to parse custom blocks from localStorage:', error);
      return [];
    }
  }
  
  private updatePolicyIndex(policy: VisualPolicy): void {
    try {
      const indexData = localStorage.getItem(STORAGE_KEYS.POLICY_INDEX);
      const index = indexData ? JSON.parse(indexData) : {};
      
      index[policy.id] = {
        id: policy.id,
        name: policy.name,
        workspaceId: policy.workspaceId,
        updatedAt: policy.updatedAt,
      };
      
      localStorage.setItem(STORAGE_KEYS.POLICY_INDEX, JSON.stringify(index));
    } catch (error) {
      console.error('Failed to update policy index:', error);
    }
  }
  
  private removePolicyFromIndex(policyId: string): void {
    try {
      const indexData = localStorage.getItem(STORAGE_KEYS.POLICY_INDEX);
      if (!indexData) return;
      
      const index = JSON.parse(indexData);
      delete index[policyId];
      
      localStorage.setItem(STORAGE_KEYS.POLICY_INDEX, JSON.stringify(index));
    } catch (error) {
      console.error('Failed to remove policy from index:', error);
    }
  }
  
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Supabase-based implementation (for future use)
 * Uncomment and implement when ready to migrate to Supabase
 */
export class SupabaseVisualPolicyStorage implements IVisualPolicyStorage {
  
  constructor(private supabaseClient: any) {}
  
  async saveVisualPolicy(policy: VisualPolicy): Promise<void> {
    // TODO: Implement Supabase storage
    throw new Error('Supabase storage not yet implemented');
  }
  
  async loadVisualPolicy(policyId: string): Promise<VisualPolicy | null> {
    // TODO: Implement Supabase storage
    throw new Error('Supabase storage not yet implemented');
  }
  
  async deleteVisualPolicy(policyId: string): Promise<void> {
    // TODO: Implement Supabase storage
    throw new Error('Supabase storage not yet implemented');
  }
  
  async listVisualPolicies(workspaceId: string): Promise<VisualPolicy[]> {
    // TODO: Implement Supabase storage
    throw new Error('Supabase storage not yet implemented');
  }
  
  async saveCustomBlock(block: CustomBlockDefinition): Promise<void> {
    // TODO: Implement Supabase storage
    throw new Error('Supabase storage not yet implemented');
  }
  
  async loadCustomBlock(blockId: string): Promise<CustomBlockDefinition | null> {
    // TODO: Implement Supabase storage
    throw new Error('Supabase storage not yet implemented');
  }
  
  async deleteCustomBlock(blockId: string): Promise<void> {
    // TODO: Implement Supabase storage
    throw new Error('Supabase storage not yet implemented');
  }
  
  async listCustomBlocks(workspaceId: string): Promise<CustomBlockDefinition[]> {
    // TODO: Implement Supabase storage
    throw new Error('Supabase storage not yet implemented');
  }
  
  async exportPolicy(policyId: string): Promise<string> {
    // TODO: Implement Supabase storage
    throw new Error('Supabase storage not yet implemented');
  }
  
  async importPolicy(jsonData: string): Promise<VisualPolicy> {
    // TODO: Implement Supabase storage
    throw new Error('Supabase storage not yet implemented');
  }
}

// ============================================================================
// Storage Factory
// ============================================================================

/**
 * Factory function to create the appropriate storage implementation
 * For MVP: Returns localStorage implementation
 * Future: Can switch to Supabase based on configuration
 */
export function createVisualPolicyStorage(
  storageType: 'localStorage' | 'supabase' = 'localStorage',
  supabaseClient?: any
): IVisualPolicyStorage {
  
  if (storageType === 'supabase') {
    if (!supabaseClient) {
      throw new Error('Supabase client required for Supabase storage');
    }
    return new SupabaseVisualPolicyStorage(supabaseClient);
  }
  
  return new LocalStorageVisualPolicyStorage();
}

// ============================================================================
// Default Export
// ============================================================================

// Export singleton instance for MVP
export const visualPolicyStorage = createVisualPolicyStorage('localStorage');
