/**
 * Visual Policy Storage Service Tests
 * 
 * Tests for localStorage-based visual policy storage
 * Requirements: 1.10, 18.1-18.10
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  LocalStorageVisualPolicyStorage,
  createVisualPolicyStorage,
} from '../VisualPolicyStorageService';
import type { VisualPolicy, CustomBlockDefinition } from '../../types/visual-policy';

// Mock localStorage
class LocalStorageMock {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] || null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = value;
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

// Setup localStorage mock
const localStorageMock = new LocalStorageMock();
global.localStorage = localStorageMock as any;

// Test data factory
function createTestPolicy(overrides?: Partial<VisualPolicy>): VisualPolicy {
  return {
    id: 'test-policy-1',
    workspaceId: 'workspace-1',
    name: 'Test Policy',
    description: 'A test visual policy',
    blocks: [],
    connections: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    metadata: {
      tags: [],
      category: 'security',
      providers: ['openai'],
      models: ['gpt-4'],
      estimatedCost: 0,
      testCoverage: 0,
      isVisual: true,
      blockCount: 0,
    },
    version: '1.0.0',
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createTestCustomBlock(overrides?: Partial<CustomBlockDefinition>): CustomBlockDefinition {
  return {
    id: 'custom-block-1',
    workspaceId: 'workspace-1',
    name: 'Custom PII Detector',
    category: 'guards',
    description: 'Custom PII detection block',
    icon: 'shield',
    parameters: [],
    inputs: [],
    outputs: [],
    codeTemplate: '// Custom code',
    tags: [],
    providers: [],
    complianceFrameworks: [],
    estimatedCost: 0,
    isCustom: true,
    createdBy: 'user-1',
    version: '1.0.0',
    ...overrides,
  };
}

describe('LocalStorageVisualPolicyStorage', () => {
  let storage: LocalStorageVisualPolicyStorage;

  beforeEach(() => {
    localStorageMock.clear();
    storage = new LocalStorageVisualPolicyStorage();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe('Visual Policy Operations', () => {
    it('should save a visual policy', async () => {
      const policy = createTestPolicy();
      
      await storage.saveVisualPolicy(policy);
      
      const saved = await storage.loadVisualPolicy(policy.id);
      expect(saved).toBeTruthy();
      expect(saved?.id).toBe(policy.id);
      expect(saved?.name).toBe(policy.name);
    });

    it('should update an existing policy', async () => {
      const policy = createTestPolicy();
      await storage.saveVisualPolicy(policy);
      
      const updated = { ...policy, name: 'Updated Policy' };
      await storage.saveVisualPolicy(updated);
      
      const loaded = await storage.loadVisualPolicy(policy.id);
      expect(loaded?.name).toBe('Updated Policy');
    });

    it('should load a visual policy', async () => {
      const policy = createTestPolicy();
      await storage.saveVisualPolicy(policy);
      
      const loaded = await storage.loadVisualPolicy(policy.id);
      
      expect(loaded).toBeTruthy();
      expect(loaded?.id).toBe(policy.id);
      expect(loaded?.workspaceId).toBe(policy.workspaceId);
    });

    it('should return null for non-existent policy', async () => {
      const loaded = await storage.loadVisualPolicy('non-existent');
      expect(loaded).toBeNull();
    });

    it('should delete a visual policy', async () => {
      const policy = createTestPolicy();
      await storage.saveVisualPolicy(policy);
      
      await storage.deleteVisualPolicy(policy.id);
      
      const loaded = await storage.loadVisualPolicy(policy.id);
      expect(loaded).toBeNull();
    });

    it('should list policies by workspace', async () => {
      const policy1 = createTestPolicy({ id: 'policy-1', workspaceId: 'workspace-1' });
      const policy2 = createTestPolicy({ id: 'policy-2', workspaceId: 'workspace-1' });
      const policy3 = createTestPolicy({ id: 'policy-3', workspaceId: 'workspace-2' });
      
      await storage.saveVisualPolicy(policy1);
      await storage.saveVisualPolicy(policy2);
      await storage.saveVisualPolicy(policy3);
      
      const workspace1Policies = await storage.listVisualPolicies('workspace-1');
      
      expect(workspace1Policies).toHaveLength(2);
      expect(workspace1Policies.map(p => p.id)).toContain('policy-1');
      expect(workspace1Policies.map(p => p.id)).toContain('policy-2');
      expect(workspace1Policies.map(p => p.id)).not.toContain('policy-3');
    });

    it('should return empty array for workspace with no policies', async () => {
      const policies = await storage.listVisualPolicies('empty-workspace');
      expect(policies).toEqual([]);
    });
  });

  describe('Custom Block Operations', () => {
    it('should save a custom block', async () => {
      const block = createTestCustomBlock();
      
      await storage.saveCustomBlock(block);
      
      const saved = await storage.loadCustomBlock(block.id);
      expect(saved).toBeTruthy();
      expect(saved?.id).toBe(block.id);
      expect(saved?.name).toBe(block.name);
    });

    it('should update an existing custom block', async () => {
      const block = createTestCustomBlock();
      await storage.saveCustomBlock(block);
      
      const updated = { ...block, name: 'Updated Block' };
      await storage.saveCustomBlock(updated);
      
      const loaded = await storage.loadCustomBlock(block.id);
      expect(loaded?.name).toBe('Updated Block');
    });

    it('should load a custom block', async () => {
      const block = createTestCustomBlock();
      await storage.saveCustomBlock(block);
      
      const loaded = await storage.loadCustomBlock(block.id);
      
      expect(loaded).toBeTruthy();
      expect(loaded?.id).toBe(block.id);
      expect(loaded?.workspaceId).toBe(block.workspaceId);
    });

    it('should return null for non-existent block', async () => {
      const loaded = await storage.loadCustomBlock('non-existent');
      expect(loaded).toBeNull();
    });

    it('should delete a custom block', async () => {
      const block = createTestCustomBlock();
      await storage.saveCustomBlock(block);
      
      await storage.deleteCustomBlock(block.id);
      
      const loaded = await storage.loadCustomBlock(block.id);
      expect(loaded).toBeNull();
    });

    it('should list custom blocks by workspace', async () => {
      const block1 = createTestCustomBlock({ id: 'block-1', workspaceId: 'workspace-1' });
      const block2 = createTestCustomBlock({ id: 'block-2', workspaceId: 'workspace-1' });
      const block3 = createTestCustomBlock({ id: 'block-3', workspaceId: 'workspace-2' });
      
      await storage.saveCustomBlock(block1);
      await storage.saveCustomBlock(block2);
      await storage.saveCustomBlock(block3);
      
      const workspace1Blocks = await storage.listCustomBlocks('workspace-1');
      
      expect(workspace1Blocks).toHaveLength(2);
      expect(workspace1Blocks.map(b => b.id)).toContain('block-1');
      expect(workspace1Blocks.map(b => b.id)).toContain('block-2');
      expect(workspace1Blocks.map(b => b.id)).not.toContain('block-3');
    });
  });

  describe('Export/Import Operations', () => {
    it('should export a policy as JSON', async () => {
      const policy = createTestPolicy();
      await storage.saveVisualPolicy(policy);
      
      const exported = await storage.exportPolicy(policy.id);
      
      expect(exported).toBeTruthy();
      const parsed = JSON.parse(exported);
      expect(parsed.version).toBe('1.0.0');
      expect(parsed.policy.id).toBe(policy.id);
      expect(parsed.exportedAt).toBeTruthy();
    });

    it('should export policy with custom blocks', async () => {
      const block = createTestCustomBlock();
      await storage.saveCustomBlock(block);
      
      const policy = createTestPolicy();
      policy.metadata.customBlockIds = [block.id];
      await storage.saveVisualPolicy(policy);
      
      const exported = await storage.exportPolicy(policy.id);
      const parsed = JSON.parse(exported);
      
      expect(parsed.customBlocks).toHaveLength(1);
      expect(parsed.customBlocks[0].id).toBe(block.id);
    });

    it('should throw error when exporting non-existent policy', async () => {
      await expect(storage.exportPolicy('non-existent')).rejects.toThrow();
    });

    it('should import a policy from JSON', async () => {
      const policy = createTestPolicy();
      const exportData = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        policy,
        customBlocks: [],
      };
      
      const imported = await storage.importPolicy(JSON.stringify(exportData));
      
      expect(imported).toBeTruthy();
      expect(imported.name).toBe(policy.name);
      expect(imported.id).not.toBe(policy.id); // Should generate new ID
    });

    it('should import policy with custom blocks', async () => {
      const block = createTestCustomBlock();
      const policy = createTestPolicy();
      const exportData = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        policy,
        customBlocks: [block],
      };
      
      const imported = await storage.importPolicy(JSON.stringify(exportData));
      
      expect(imported).toBeTruthy();
      
      // Custom blocks should be imported
      const blocks = await storage.listCustomBlocks(imported.workspaceId);
      expect(blocks.length).toBeGreaterThan(0);
    });

    it('should throw error for invalid import data', async () => {
      await expect(storage.importPolicy('invalid json')).rejects.toThrow();
      await expect(storage.importPolicy('{}')).rejects.toThrow();
    });
  });

  describe('Data Persistence', () => {
    it('should persist policies across storage instances', async () => {
      const policy = createTestPolicy();
      await storage.saveVisualPolicy(policy);
      
      // Create new storage instance
      const newStorage = new LocalStorageVisualPolicyStorage();
      const loaded = await newStorage.loadVisualPolicy(policy.id);
      
      expect(loaded).toBeTruthy();
      expect(loaded?.id).toBe(policy.id);
    });

    it('should handle date serialization correctly', async () => {
      const policy = createTestPolicy({
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      });
      
      await storage.saveVisualPolicy(policy);
      const loaded = await storage.loadVisualPolicy(policy.id);
      
      expect(loaded?.createdAt).toBeInstanceOf(Date);
      expect(loaded?.updatedAt).toBeInstanceOf(Date);
    });
  });
});

describe('Storage Factory', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should create localStorage storage by default', () => {
    const storage = createVisualPolicyStorage();
    expect(storage).toBeInstanceOf(LocalStorageVisualPolicyStorage);
  });

  it('should create localStorage storage when specified', () => {
    const storage = createVisualPolicyStorage('localStorage');
    expect(storage).toBeInstanceOf(LocalStorageVisualPolicyStorage);
  });

  it('should throw error for Supabase without client', () => {
    expect(() => createVisualPolicyStorage('supabase')).toThrow();
  });
});
