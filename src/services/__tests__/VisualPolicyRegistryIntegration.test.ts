/**
 * Visual Policy Registry Integration Tests
 * 
 * Tests for integration between visual policies and PolicyRegistryService
 * Requirements: 7.3, 24.1, 24.2
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VisualPolicyRegistryIntegration } from '../VisualPolicyRegistryIntegration';
import type { VisualPolicy } from '../../types/visual-policy';
import type { Policy, PolicyVersion } from '../../types/policy';

// Mock PolicyRegistryService
vi.mock('../PolicyRegistryService', () => ({
  PolicyRegistryService: vi.fn().mockImplementation(() => ({
    createPolicy: vi.fn(),
    saveVersion: vi.fn(),
    getPolicy: vi.fn(),
    listPolicies: vi.fn(),
    listVersions: vi.fn(),
    getVersion: vi.fn(),
  })),
}));

// Mock CodeGenerator
vi.mock('../CodeGenerator', () => ({
  CodeGenerator: vi.fn().mockImplementation(() => ({
    generateCode: vi.fn(),
  })),
}));

// Test data factory
function createTestVisualPolicy(overrides?: Partial<VisualPolicy>): VisualPolicy {
  return {
    id: 'visual-policy-1',
    workspaceId: 'workspace-1',
    name: 'Test Visual Policy',
    description: 'A test visual policy',
    blocks: [
      {
        id: 'block-1',
        definitionId: 'guard-pii-detection',
        position: { x: 100, y: 100 },
        parameters: { types: ['email', 'phone'], threshold: 0.8 },
        selected: false,
        collapsed: false,
        errors: [],
        warnings: [],
      },
    ],
    connections: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    metadata: {
      tags: ['security', 'pii'],
      category: 'security',
      providers: ['openai'],
      models: ['gpt-4'],
      estimatedCost: 0.01,
      testCoverage: 80,
      isVisual: true,
      blockCount: 1,
    },
    version: '1.0.0',
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('VisualPolicyRegistryIntegration', () => {
  let integration: VisualPolicyRegistryIntegration;
  let mockPolicyRegistry: any;
  let mockCodeGenerator: any;

  beforeEach(() => {
    integration = new VisualPolicyRegistryIntegration();
    mockPolicyRegistry = (integration as any).policyRegistry;
    mockCodeGenerator = (integration as any).codeGenerator;
  });

  describe('saveToRegistry', () => {
    it('should save visual policy to registry with generated code', async () => {
      const visualPolicy = createTestVisualPolicy();
      const userId = 'user-1';
      
      // Mock code generation
      mockCodeGenerator.generateCode.mockReturnValue({
        code: 'const policy = () => { /* generated code */ };',
        imports: ['import { TealTiger } from "@tealtiger/core";'],
        exports: ['export default TestVisualPolicy;'],
        blockMapping: [],
        syntaxValid: true,
        errors: [],
        warnings: [],
      });
      
      // Mock policy creation
      const mockPolicy: Policy = {
        id: 'policy-1',
        workspaceId: visualPolicy.workspaceId,
        name: visualPolicy.name,
        description: visualPolicy.description,
        currentVersion: '1.0.0',
        state: 'draft' as any,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPolicyRegistry.createPolicy.mockResolvedValue(mockPolicy);
      
      const result = await integration.saveToRegistry(visualPolicy, userId);
      
      expect(mockCodeGenerator.generateCode).toHaveBeenCalledWith(visualPolicy);
      expect(mockPolicyRegistry.createPolicy).toHaveBeenCalledWith({
        workspaceId: visualPolicy.workspaceId,
        name: visualPolicy.name,
        description: visualPolicy.description,
        code: expect.stringContaining('import { TealTiger }'),
        metadata: {
          tags: visualPolicy.metadata.tags,
          category: visualPolicy.metadata.category,
          providers: visualPolicy.metadata.providers,
          models: visualPolicy.metadata.models,
          estimatedCost: visualPolicy.metadata.estimatedCost,
          testCoverage: visualPolicy.metadata.testCoverage,
        },
        userId,
      });
      expect(result).toEqual(mockPolicy);
    });

    it('should throw error if code generation fails', async () => {
      const visualPolicy = createTestVisualPolicy();
      const userId = 'user-1';
      
      // Mock code generation with errors
      mockCodeGenerator.generateCode.mockReturnValue({
        code: '// Error',
        imports: [],
        exports: [],
        blockMapping: [],
        syntaxValid: false,
        errors: [{ line: 1, column: 1, message: 'Syntax error' }],
        warnings: [],
      });
      
      await expect(integration.saveToRegistry(visualPolicy, userId)).rejects.toThrow(
        'Cannot save policy with code generation errors'
      );
      
      expect(mockPolicyRegistry.createPolicy).not.toHaveBeenCalled();
    });

    it('should assemble full code with imports and exports', async () => {
      const visualPolicy = createTestVisualPolicy();
      const userId = 'user-1';
      
      mockCodeGenerator.generateCode.mockReturnValue({
        code: 'const policy = () => { return true; };',
        imports: [
          'import { TealTiger } from "@tealtiger/core";',
          'import { PIIDetector } from "@tealtiger/guards";',
        ],
        exports: ['export default TestPolicy;'],
        blockMapping: [],
        syntaxValid: true,
        errors: [],
        warnings: [],
      });
      
      mockPolicyRegistry.createPolicy.mockResolvedValue({} as Policy);
      
      await integration.saveToRegistry(visualPolicy, userId);
      
      const createCall = mockPolicyRegistry.createPolicy.mock.calls[0][0];
      const code = createCall.code;
      
      expect(code).toContain('import { TealTiger }');
      expect(code).toContain('import { PIIDetector }');
      expect(code).toContain('const policy = () => { return true; };');
      expect(code).toContain('export default TestPolicy;');
    });
  });

  describe('saveVersion', () => {
    it('should save new version of visual policy', async () => {
      const visualPolicy = createTestVisualPolicy();
      const policyId = 'policy-1';
      const userId = 'user-1';
      const versionType = 'minor';
      
      // Mock code generation
      mockCodeGenerator.generateCode.mockReturnValue({
        code: 'const policy = () => { /* updated code */ };',
        imports: ['import { TealTiger } from "@tealtiger/core";'],
        exports: ['export default TestVisualPolicy;'],
        blockMapping: [],
        syntaxValid: true,
        errors: [],
        warnings: [],
      });
      
      // Mock version creation
      const mockVersion: PolicyVersion = {
        id: 'version-1',
        policyId,
        version: '1.1.0',
        code: 'const policy = () => { /* updated code */ };',
        metadata: {
          tags: [],
          category: 'security',
          providers: [],
          models: [],
          estimatedCost: 0,
          testCoverage: 0,
        },
        createdBy: userId,
        createdAt: new Date(),
      };
      mockPolicyRegistry.saveVersion.mockResolvedValue(mockVersion);
      
      const result = await integration.saveVersion(visualPolicy, policyId, versionType, userId);
      
      expect(mockCodeGenerator.generateCode).toHaveBeenCalledWith(visualPolicy);
      expect(mockPolicyRegistry.saveVersion).toHaveBeenCalledWith({
        policyId,
        code: expect.stringContaining('import { TealTiger }'),
        versionType,
        userId,
        metadata: expect.objectContaining({
          tags: visualPolicy.metadata.tags,
          category: visualPolicy.metadata.category,
        }),
      });
      expect(result).toEqual(mockVersion);
    });

    it('should throw error if code generation fails for version', async () => {
      const visualPolicy = createTestVisualPolicy();
      const policyId = 'policy-1';
      const userId = 'user-1';
      
      // Mock code generation with errors
      mockCodeGenerator.generateCode.mockReturnValue({
        code: '// Error',
        imports: [],
        exports: [],
        blockMapping: [],
        syntaxValid: false,
        errors: [{ line: 1, column: 1, message: 'Syntax error' }],
        warnings: [],
      });
      
      await expect(
        integration.saveVersion(visualPolicy, policyId, 'patch', userId)
      ).rejects.toThrow('Cannot save version with code generation errors');
      
      expect(mockPolicyRegistry.saveVersion).not.toHaveBeenCalled();
    });
  });

  describe('getPolicy', () => {
    it('should get policy from registry', async () => {
      const policyId = 'policy-1';
      const mockPolicy: Policy = {
        id: policyId,
        workspaceId: 'workspace-1',
        name: 'Test Policy',
        description: 'Test',
        currentVersion: '1.0.0',
        state: 'draft' as any,
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      mockPolicyRegistry.getPolicy.mockResolvedValue(mockPolicy);
      
      const result = await integration.getPolicy(policyId);
      
      expect(mockPolicyRegistry.getPolicy).toHaveBeenCalledWith(policyId);
      expect(result).toEqual(mockPolicy);
    });
  });

  describe('listPolicies', () => {
    it('should list policies from registry', async () => {
      const workspaceId = 'workspace-1';
      const mockPolicies: Policy[] = [
        {
          id: 'policy-1',
          workspaceId,
          name: 'Policy 1',
          description: 'Test',
          currentVersion: '1.0.0',
          state: 'draft' as any,
          createdBy: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      
      mockPolicyRegistry.listPolicies.mockResolvedValue(mockPolicies);
      
      const result = await integration.listPolicies(workspaceId);
      
      expect(mockPolicyRegistry.listPolicies).toHaveBeenCalledWith(workspaceId);
      expect(result).toEqual(mockPolicies);
    });
  });

  describe('listVersions', () => {
    it('should list versions from registry', async () => {
      const policyId = 'policy-1';
      const mockVersions: PolicyVersion[] = [
        {
          id: 'version-1',
          policyId,
          version: '1.0.0',
          code: 'const policy = () => {};',
          metadata: {
            tags: [],
            category: 'security',
            providers: [],
            models: [],
            estimatedCost: 0,
            testCoverage: 0,
          },
          createdBy: 'user-1',
          createdAt: new Date(),
        },
      ];
      
      mockPolicyRegistry.listVersions.mockResolvedValue(mockVersions);
      
      const result = await integration.listVersions(policyId);
      
      expect(mockPolicyRegistry.listVersions).toHaveBeenCalledWith(policyId);
      expect(result).toEqual(mockVersions);
    });
  });

  describe('getVersion', () => {
    it('should get version from registry', async () => {
      const versionId = 'version-1';
      const mockVersion: PolicyVersion = {
        id: versionId,
        policyId: 'policy-1',
        version: '1.0.0',
        code: 'const policy = () => {};',
        metadata: {
          tags: [],
          category: 'security',
          providers: [],
          models: [],
          estimatedCost: 0,
          testCoverage: 0,
        },
        createdBy: 'user-1',
        createdAt: new Date(),
      };
      
      mockPolicyRegistry.getVersion.mockResolvedValue(mockVersion);
      
      const result = await integration.getVersion(versionId);
      
      expect(mockPolicyRegistry.getVersion).toHaveBeenCalledWith(versionId);
      expect(result).toEqual(mockVersion);
    });
  });

  describe('metadata conversion', () => {
    it('should convert visual policy metadata to registry format', async () => {
      const visualPolicy = createTestVisualPolicy({
        metadata: {
          tags: ['security', 'pii', 'gdpr'],
          category: 'compliance',
          providers: ['openai', 'anthropic'],
          models: ['gpt-4', 'claude-3'],
          estimatedCost: 0.05,
          testCoverage: 95,
          isVisual: true,
          blockCount: 5,
          customBlockIds: ['custom-1'],
        },
      });
      
      mockCodeGenerator.generateCode.mockReturnValue({
        code: 'const policy = () => {};',
        imports: [],
        exports: [],
        blockMapping: [],
        syntaxValid: true,
        errors: [],
        warnings: [],
      });
      
      mockPolicyRegistry.createPolicy.mockResolvedValue({} as Policy);
      
      await integration.saveToRegistry(visualPolicy, 'user-1');
      
      const createCall = mockPolicyRegistry.createPolicy.mock.calls[0][0];
      const metadata = createCall.metadata;
      
      expect(metadata).toEqual({
        tags: ['security', 'pii', 'gdpr'],
        category: 'compliance',
        providers: ['openai', 'anthropic'],
        models: ['gpt-4', 'claude-3'],
        estimatedCost: 0.05,
        testCoverage: 95,
      });
      
      // Visual-specific metadata should not be in registry metadata
      expect(metadata).not.toHaveProperty('isVisual');
      expect(metadata).not.toHaveProperty('blockCount');
      expect(metadata).not.toHaveProperty('customBlockIds');
    });
  });
});
