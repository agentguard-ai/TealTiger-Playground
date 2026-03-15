/**
 * Code Template Engine Tests
 * 
 * Tests for template variable substitution, import generation,
 * comment generation, and code formatting.
 * 
 * @module services/__tests__/CodeTemplateEngine
 */

import { describe, it, expect } from 'vitest';
import { CodeTemplateEngine } from '../CodeTemplateEngine';
import type { PolicyBlock, BlockDefinition } from '../../types/visual-policy';

describe('CodeTemplateEngine', () => {
  const engine = new CodeTemplateEngine();
  
  /**
   * Helper to create a test block
   */
  const createTestBlock = (
    parameters: Record<string, any> = {}
  ): PolicyBlock => ({
    id: 'test-block',
    definitionId: 'guard-pii-detection',
    position: { x: 0, y: 0 },
    parameters,
    selected: false,
    collapsed: false,
    errors: [],
    warnings: [],
  });
  
  /**
   * Helper to create a test definition
   */
  const createTestDefinition = (): BlockDefinition => ({
    id: 'guard-pii-detection',
    name: 'PII Detection',
    category: 'guards',
    description: 'Detects PII in requests',
    icon: '🔒',
    parameters: [
      {
        name: 'piiTypes',
        type: 'array',
        label: 'PII Types',
        description: 'Types to detect',
        required: true,
        defaultValue: ['email', 'phone'],
      },
      {
        name: 'threshold',
        type: 'number',
        label: 'Threshold',
        description: 'Detection threshold',
        required: true,
        defaultValue: 0.8,
      },
      {
        name: 'redactEnabled',
        type: 'boolean',
        label: 'Redact',
        description: 'Enable redaction',
        required: false,
        defaultValue: false,
      },
    ],
    inputs: [{ id: 'in', label: 'Input', type: 'flow', required: true }],
    outputs: [{ id: 'out', label: 'Output', type: 'flow', required: true }],
    codeTemplate: 'detectPII({{piiTypes}}, {{threshold}}, {{redactEnabled}})',
    tags: [],
    providers: [],
    complianceFrameworks: [],
    estimatedCost: 0,
    isCustom: false,
  });
  
  describe('substituteVariables', () => {
    it('should substitute array parameters', () => {
      const block = createTestBlock({ piiTypes: ['email', 'phone'] });
      const definition = createTestDefinition();
      
      const result = engine.substituteVariables(
        'types: {{piiTypes}}',
        { block, definition }
      );
      
      expect(result).toBe("types: ['email', 'phone']");
    });
    
    it('should substitute number parameters', () => {
      const block = createTestBlock({ threshold: 0.8 });
      const definition = createTestDefinition();
      
      const result = engine.substituteVariables(
        'threshold: {{threshold}}',
        { block, definition }
      );
      
      expect(result).toBe('threshold: 0.8');
    });
    
    it('should substitute boolean parameters', () => {
      const block = createTestBlock({ redactEnabled: true });
      const definition = createTestDefinition();
      
      const result = engine.substituteVariables(
        'redact: {{redactEnabled}}',
        { block, definition }
      );
      
      expect(result).toBe('redact: true');
    });
    
    it('should use default values when parameter not configured', () => {
      const block = createTestBlock({}); // No parameters set
      const definition = createTestDefinition();
      
      const result = engine.substituteVariables(
        'threshold: {{threshold}}',
        { block, definition }
      );
      
      expect(result).toBe('threshold: 0.8');
    });
    
    it('should mark missing parameters', () => {
      const block = createTestBlock({});
      const definition = createTestDefinition();
      // Remove default value
      definition.parameters[1].defaultValue = undefined;
      
      const result = engine.substituteVariables(
        'value: {{threshold}}',
        { block, definition }
      );
      
      expect(result).toContain('UNCONFIGURED');
    });
    
    it('should handle string parameters with special characters', () => {
      const block = createTestBlock({ reason: "It's a \"test\" with\nnewline" });
      const definition: BlockDefinition = {
        ...createTestDefinition(),
        parameters: [
          {
            name: 'reason',
            type: 'string',
            label: 'Reason',
            description: 'Reason',
            required: true,
          },
        ],
      };
      
      const result = engine.substituteVariables(
        'reason: {{reason}}',
        { block, definition }
      );
      
      expect(result).toContain("It\\'s a");
      expect(result).toContain('\\n');
    });
    
    it('should substitute custom variables', () => {
      const block = createTestBlock({});
      const definition = createTestDefinition();
      
      const result = engine.substituteVariables(
        'action: {{customAction}}',
        { block, definition, variables: { customAction: 'deny' } }
      );
      
      expect(result).toBe("action: 'deny'");
    });
    
    it('should handle multiple variables in one template', () => {
      const block = createTestBlock({
        piiTypes: ['email'],
        threshold: 0.9,
        redactEnabled: true,
      });
      const definition = createTestDefinition();
      
      const result = engine.substituteVariables(
        'detectPII({{piiTypes}}, {{threshold}}, {{redactEnabled}})',
        { block, definition }
      );
      
      expect(result).toBe("detectPII(['email'], 0.9, true)");
    });
  });
  
  describe('generateImports', () => {
    it('should always include core TealTiger imports', () => {
      const imports = engine.generateImports([]);
      
      expect(imports.some(imp => imp.includes('@tealtiger/core'))).toBe(true);
    });
    
    it('should include guard imports for guard blocks', () => {
      const blocks = [createTestBlock()]; // guard-pii-detection
      
      const imports = engine.generateImports(blocks);
      
      expect(imports.some(imp => imp.includes('@tealtiger/guards'))).toBe(true);
    });
    
    it('should include routing imports for routing blocks', () => {
      const blocks = [{
        ...createTestBlock(),
        definitionId: 'routing-provider-selection',
      }];
      
      const imports = engine.generateImports(blocks);
      
      expect(imports.some(imp => imp.includes('@tealtiger/routing'))).toBe(true);
    });
    
    it('should include cost imports for cost control blocks', () => {
      const blocks = [{
        ...createTestBlock(),
        definitionId: 'cost-budget-limit',
      }];
      
      const imports = engine.generateImports(blocks);
      
      expect(imports.some(imp => imp.includes('@tealtiger/cost'))).toBe(true);
    });
    
    it('should include compliance imports for compliance blocks', () => {
      const blocks = [{
        ...createTestBlock(),
        definitionId: 'compliance-audit-logging',
      }];
      
      const imports = engine.generateImports(blocks);
      
      expect(imports.some(imp => imp.includes('@tealtiger/compliance'))).toBe(true);
    });
    
    it('should include action imports for action blocks', () => {
      const blocks = [{
        ...createTestBlock(),
        definitionId: 'action-allow',
      }];
      
      const imports = engine.generateImports(blocks);
      
      expect(imports.some(imp => imp.includes('@tealtiger/actions'))).toBe(true);
    });
  });
  
  describe('generateBlockComment', () => {
    it('should include block name', () => {
      const block = createTestBlock();
      const definition = createTestDefinition();
      
      const comment = engine.generateBlockComment(block, definition);
      
      expect(comment).toContain('PII Detection');
    });
    
    it('should include block description', () => {
      const block = createTestBlock();
      const definition = createTestDefinition();
      
      const comment = engine.generateBlockComment(block, definition);
      
      expect(comment).toContain('Detects PII in requests');
    });
    
    it('should include configured parameters', () => {
      const block = createTestBlock({ threshold: 0.9 });
      const definition = createTestDefinition();
      
      const comment = engine.generateBlockComment(block, definition);
      
      expect(comment).toContain('Threshold');
      expect(comment).toContain('0.9');
    });
  });
  
  describe('processTemplate', () => {
    it('should combine comment and code', () => {
      const block = createTestBlock({
        piiTypes: ['email'],
        threshold: 0.8,
        redactEnabled: false,
      });
      const definition = createTestDefinition();
      
      const result = engine.processTemplate(block, definition);
      
      // Should have comment
      expect(result).toContain('// PII Detection');
      // Should have code
      expect(result).toContain("detectPII(['email'], 0.8, false)");
    });
  });
  
  describe('indent', () => {
    it('should indent code by specified level', () => {
      const code = 'const x = 1;\nconst y = 2;';
      
      const result = engine.indent(code, 2);
      
      expect(result).toContain('    const x = 1;');
      expect(result).toContain('    const y = 2;');
    });
    
    it('should not indent empty lines', () => {
      const code = 'const x = 1;\n\nconst y = 2;';
      
      const result = engine.indent(code, 1);
      const lines = result.split('\n');
      
      expect(lines[1]).toBe('');
    });
  });
  
  describe('cleanupCode', () => {
    it('should remove multiple consecutive blank lines', () => {
      const code = 'line1\n\n\n\nline2';
      
      const result = engine.cleanupCode(code);
      
      expect(result).not.toContain('\n\n\n');
    });
    
    it('should remove trailing whitespace', () => {
      const code = 'line1   \nline2  ';
      
      const result = engine.cleanupCode(code);
      
      expect(result).not.toMatch(/[ \t]+$/m);
    });
    
    it('should ensure file ends with newline', () => {
      const code = 'line1\nline2';
      
      const result = engine.cleanupCode(code);
      
      expect(result.endsWith('\n')).toBe(true);
    });
  });
});
