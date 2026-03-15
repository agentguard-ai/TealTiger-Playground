/**
 * Code Generator Service Tests
 * 
 * Tests for code generation from visual policies including:
 * - Dependency analysis
 * - Topological sorting
 * - Cycle detection
 * - Entry/exit point identification
 * - Code generation for simple and complex policies
 * 
 * @module services/__tests__/CodeGenerator
 */

import { describe, it, expect } from 'vitest';
import { CodeGenerator } from '../CodeGenerator';
import type { VisualPolicy, PolicyBlock, BlockConnection } from '../../types/visual-policy';

describe('CodeGenerator', () => {
  const generator = new CodeGenerator();
  
  /**
   * Helper to create a test policy
   */
  const createTestPolicy = (
    blocks: PolicyBlock[],
    connections: BlockConnection[]
  ): VisualPolicy => ({
    id: 'test-policy',
    workspaceId: 'test-workspace',
    name: 'TestPolicy',
    description: 'Test policy for code generation',
    blocks,
    connections,
    viewport: { x: 0, y: 0, zoom: 1 },
    metadata: {
      tags: [],
      category: 'test',
      providers: ['openai'],
      models: [],
      estimatedCost: 0,
      testCoverage: 0,
      isVisual: true,
    },
    version: '1.0.0',
    createdBy: 'test-user',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  
  /**
   * Helper to create a test block
   */
  const createTestBlock = (
    id: string,
    definitionId: string,
    parameters: Record<string, any> = {}
  ): PolicyBlock => ({
    id,
    definitionId,
    position: { x: 0, y: 0 },
    parameters,
    selected: false,
    collapsed: false,
    errors: [],
    warnings: [],
  });
  
  /**
   * Helper to create a test connection
   */
  const createTestConnection = (
    id: string,
    sourceBlockId: string,
    targetBlockId: string
  ): BlockConnection => ({
    id,
    sourceBlockId,
    sourceOutputId: 'out',
    targetBlockId,
    targetInputId: 'in',
    isValid: true,
  });
  
  describe('analyzeDependencies', () => {
    it('should identify entry points (blocks with no incoming connections)', () => {
      const blocks = [
        createTestBlock('block1', 'guard-pii-detection'),
        createTestBlock('block2', 'action-allow'),
      ];
      const connections = [
        createTestConnection('conn1', 'block1', 'block2'),
      ];
      const policy = createTestPolicy(blocks, connections);
      
      const graph = generator.analyzeDependencies(policy);
      
      expect(graph.entryPoints).toEqual(['block1']);
      expect(graph.entryPoints.length).toBe(1);
    });
    
    it('should identify exit points (blocks with no outgoing connections)', () => {
      const blocks = [
        createTestBlock('block1', 'guard-pii-detection'),
        createTestBlock('block2', 'action-allow'),
      ];
      const connections = [
        createTestConnection('conn1', 'block1', 'block2'),
      ];
      const policy = createTestPolicy(blocks, connections);
      
      const graph = generator.analyzeDependencies(policy);
      
      expect(graph.exitPoints).toEqual(['block2']);
      expect(graph.exitPoints.length).toBe(1);
    });
    
    it('should build correct adjacency list', () => {
      const blocks = [
        createTestBlock('block1', 'guard-pii-detection'),
        createTestBlock('block2', 'action-allow'),
        createTestBlock('block3', 'action-log-event'),
      ];
      const connections = [
        createTestConnection('conn1', 'block1', 'block2'),
        createTestConnection('conn2', 'block1', 'block3'),
      ];
      const policy = createTestPolicy(blocks, connections);
      
      const graph = generator.analyzeDependencies(policy);
      
      expect(graph.edges.get('block1')).toEqual(['block2', 'block3']);
      expect(graph.edges.get('block2')).toEqual([]);
      expect(graph.edges.get('block3')).toEqual([]);
    });
  });
  
  describe('topologicalSort', () => {
    it('should sort blocks in correct execution order', () => {
      const blocks = [
        createTestBlock('block1', 'guard-pii-detection'),
        createTestBlock('block2', 'action-log-event'),
        createTestBlock('block3', 'action-allow'),
      ];
      const connections = [
        createTestConnection('conn1', 'block1', 'block2'),
        createTestConnection('conn2', 'block2', 'block3'),
      ];
      const policy = createTestPolicy(blocks, connections);
      
      const graph = generator.analyzeDependencies(policy);
      const result = generator.topologicalSort(graph);
      
      expect(result.success).toBe(true);
      expect(result.orderedBlocks.map(b => b.id)).toEqual(['block1', 'block2', 'block3']);
    });
    
    it('should handle multiple entry points', () => {
      const blocks = [
        createTestBlock('block1', 'guard-pii-detection'),
        createTestBlock('block2', 'guard-prompt-injection'),
        createTestBlock('block3', 'action-allow'),
      ];
      const connections = [
        createTestConnection('conn1', 'block1', 'block3'),
        createTestConnection('conn2', 'block2', 'block3'),
      ];
      const policy = createTestPolicy(blocks, connections);
      
      const graph = generator.analyzeDependencies(policy);
      const result = generator.topologicalSort(graph);
      
      expect(result.success).toBe(true);
      expect(result.orderedBlocks.length).toBe(3);
      // block3 should come after both block1 and block2
      const block3Index = result.orderedBlocks.findIndex(b => b.id === 'block3');
      const block1Index = result.orderedBlocks.findIndex(b => b.id === 'block1');
      const block2Index = result.orderedBlocks.findIndex(b => b.id === 'block2');
      expect(block3Index).toBeGreaterThan(block1Index);
      expect(block3Index).toBeGreaterThan(block2Index);
    });
    
    it('should detect cycles and fail', () => {
      const blocks = [
        createTestBlock('block1', 'guard-pii-detection'),
        createTestBlock('block2', 'action-log-event'),
      ];
      const connections = [
        createTestConnection('conn1', 'block1', 'block2'),
        createTestConnection('conn2', 'block2', 'block1'), // Creates cycle
      ];
      const policy = createTestPolicy(blocks, connections);
      
      const graph = generator.analyzeDependencies(policy);
      const result = generator.topologicalSort(graph);
      
      expect(result.success).toBe(false);
      expect(result.cycles.length).toBeGreaterThan(0);
    });
  });
  
  describe('detectCycles', () => {
    it('should detect simple cycle', () => {
      const blocks = [
        createTestBlock('block1', 'guard-pii-detection'),
        createTestBlock('block2', 'action-log-event'),
      ];
      const connections = [
        createTestConnection('conn1', 'block1', 'block2'),
        createTestConnection('conn2', 'block2', 'block1'),
      ];
      const policy = createTestPolicy(blocks, connections);
      
      const graph = generator.analyzeDependencies(policy);
      const cycles = generator.detectCycles(graph);
      
      expect(cycles.length).toBeGreaterThan(0);
      expect(cycles[0].error).toContain('Circular dependency');
    });
    
    it('should detect complex cycle', () => {
      const blocks = [
        createTestBlock('block1', 'guard-pii-detection'),
        createTestBlock('block2', 'action-log-event'),
        createTestBlock('block3', 'action-allow'),
      ];
      const connections = [
        createTestConnection('conn1', 'block1', 'block2'),
        createTestConnection('conn2', 'block2', 'block3'),
        createTestConnection('conn3', 'block3', 'block1'), // Creates cycle
      ];
      const policy = createTestPolicy(blocks, connections);
      
      const graph = generator.analyzeDependencies(policy);
      const cycles = generator.detectCycles(graph);
      
      expect(cycles.length).toBeGreaterThan(0);
    });
    
    it('should not detect cycles in acyclic graph', () => {
      const blocks = [
        createTestBlock('block1', 'guard-pii-detection'),
        createTestBlock('block2', 'action-log-event'),
        createTestBlock('block3', 'action-allow'),
      ];
      const connections = [
        createTestConnection('conn1', 'block1', 'block2'),
        createTestConnection('conn2', 'block2', 'block3'),
      ];
      const policy = createTestPolicy(blocks, connections);
      
      const graph = generator.analyzeDependencies(policy);
      const cycles = generator.detectCycles(graph);
      
      expect(cycles.length).toBe(0);
    });
  });
  
  describe('generateCode', () => {
    it('should generate code for simple policy', () => {
      const blocks = [
        createTestBlock('block1', 'guard-pii-detection', {
          piiTypes: ['email', 'phone'],
          threshold: 0.8,
          redactEnabled: false,
        }),
        createTestBlock('block2', 'action-allow', {
          logDecision: true,
          metadata: 'PII check passed',
        }),
      ];
      const connections = [
        createTestConnection('conn1', 'block1', 'block2'),
      ];
      const policy = createTestPolicy(blocks, connections);
      
      const result = generator.generateCode(policy);
      
      expect(result.syntaxValid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.code).toContain('TealTigerPolicy');
      expect(result.code).toContain('PolicyContext');
      expect(result.code).toContain('PolicyDecision');
      expect(result.imports.length).toBeGreaterThan(0);
    });
    
    it('should generate imports based on blocks used', () => {
      const blocks = [
        createTestBlock('block1', 'guard-pii-detection'),
        createTestBlock('block2', 'action-allow'),
      ];
      const connections = [
        createTestConnection('conn1', 'block1', 'block2'),
      ];
      const policy = createTestPolicy(blocks, connections);
      
      const result = generator.generateCode(policy);
      
      expect(result.imports.some(imp => imp.includes('@tealtiger/core'))).toBe(true);
      expect(result.imports.some(imp => imp.includes('@tealtiger/guards'))).toBe(true);
    });
    
    it('should include error handling in generated code', () => {
      const blocks = [
        createTestBlock('block1', 'guard-pii-detection'),
        createTestBlock('block2', 'action-allow'),
      ];
      const connections = [
        createTestConnection('conn1', 'block1', 'block2'),
      ];
      const policy = createTestPolicy(blocks, connections);
      
      const result = generator.generateCode(policy);
      
      expect(result.code).toContain('try');
      expect(result.code).toContain('catch');
      expect(result.code).toContain('error');
    });
    
    it('should generate proper return statement', () => {
      const blocks = [
        createTestBlock('block1', 'guard-pii-detection'),
        createTestBlock('block2', 'action-allow'),
      ];
      const connections = [
        createTestConnection('conn1', 'block1', 'block2'),
      ];
      const policy = createTestPolicy(blocks, connections);
      
      const result = generator.generateCode(policy);
      
      expect(result.code).toContain('return');
      expect(result.code).toContain('decision');
    });
    
    it('should report error for policy with no entry point', () => {
      const blocks = [
        createTestBlock('block1', 'guard-pii-detection'),
        createTestBlock('block2', 'action-allow'),
      ];
      const connections = [
        createTestConnection('conn1', 'block1', 'block2'),
        createTestConnection('conn2', 'block2', 'block1'), // Creates cycle, no entry point
      ];
      const policy = createTestPolicy(blocks, connections);
      
      const result = generator.generateCode(policy);
      
      expect(result.syntaxValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.code === 'CIRCULAR_DEPENDENCY')).toBe(true);
    });
    
    it('should generate block mapping for debugging', () => {
      const blocks = [
        createTestBlock('block1', 'guard-pii-detection'),
        createTestBlock('block2', 'action-allow'),
      ];
      const connections = [
        createTestConnection('conn1', 'block1', 'block2'),
      ];
      const policy = createTestPolicy(blocks, connections);
      
      const result = generator.generateCode(policy);
      
      expect(result.blockMapping.length).toBeGreaterThan(0);
      expect(result.blockMapping[0]).toHaveProperty('blockId');
      expect(result.blockMapping[0]).toHaveProperty('startLine');
      expect(result.blockMapping[0]).toHaveProperty('endLine');
      expect(result.blockMapping[0]).toHaveProperty('code');
    });
    
    it('should format code with proper indentation', () => {
      const blocks = [
        createTestBlock('block1', 'guard-pii-detection'),
        createTestBlock('block2', 'action-allow'),
      ];
      const connections = [
        createTestConnection('conn1', 'block1', 'block2'),
      ];
      const policy = createTestPolicy(blocks, connections);
      
      const result = generator.generateCode(policy);
      
      // Check for consistent indentation
      const lines = result.code.split('\n');
      const indentedLines = lines.filter(line => line.startsWith('  '));
      expect(indentedLines.length).toBeGreaterThan(0);
    });
  });
  
  describe('conditional logic generation', () => {
    it('should generate if/else code for conditional blocks', () => {
      const blocks = [
        createTestBlock('block1', 'conditional-if-else', {
          condition: 'context.cost > 10',
        }),
        createTestBlock('block2', 'action-deny', {
          reason: 'Cost too high',
        }),
        createTestBlock('block3', 'action-allow'),
      ];
      const connections = [
        { ...createTestConnection('conn1', 'block1', 'block2'), sourceOutputId: 'true' },
        { ...createTestConnection('conn2', 'block1', 'block3'), sourceOutputId: 'false' },
      ];
      const policy = createTestPolicy(blocks, connections);
      
      const result = generator.generateCode(policy);
      
      expect(result.code).toContain('if');
      expect(result.code).toContain('else');
      expect(result.code).toContain('context.cost > 10');
    });
  });
  
  describe('edge cases', () => {
    it('should handle empty policy', () => {
      const policy = createTestPolicy([], []);
      
      const result = generator.generateCode(policy);
      
      expect(result.errors.some(e => e.code === 'NO_ENTRY_POINT')).toBe(true);
    });
    
    it('should handle disconnected blocks', () => {
      const blocks = [
        createTestBlock('block1', 'guard-pii-detection'),
        createTestBlock('block2', 'action-allow'),
        createTestBlock('block3', 'action-deny'), // Disconnected
      ];
      const connections = [
        createTestConnection('conn1', 'block1', 'block2'),
      ];
      const policy = createTestPolicy(blocks, connections);
      
      const graph = generator.analyzeDependencies(policy);
      
      // block3 should be an entry point and exit point (disconnected)
      expect(graph.entryPoints).toContain('block3');
      expect(graph.exitPoints).toContain('block3');
    });
  });
});
