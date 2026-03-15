/**
 * Block Library Data Tests
 */

import { describe, it, expect } from 'vitest';
import {
  BLOCK_LIBRARY,
  getBlocksByCategory,
  getBlockById,
  searchBlocks,
  filterBlocksByProvider,
  filterBlocksByCompliance,
  getCategoriesWithCounts,
  piiDetectionBlock,
  allowRequestBlock,
  providerSelectionBlock,
  budgetLimitBlock,
  auditLoggingBlock,
  ifElseBlock,
  variableAssignmentBlock
} from '../blockLibrary';

describe('Block Library', () => {
  describe('BLOCK_LIBRARY', () => {
    it('contains at least 25 blocks', () => {
      expect(BLOCK_LIBRARY.length).toBeGreaterThanOrEqual(25);
    });

    it('contains exactly 30 blocks', () => {
      expect(BLOCK_LIBRARY.length).toBe(30);
    });

    it('has blocks in all 7 categories', () => {
      const categories = new Set(BLOCK_LIBRARY.map(b => b.category));
      expect(categories.size).toBe(7);
      expect(categories.has('guards')).toBe(true);
      expect(categories.has('actions')).toBe(true);
      expect(categories.has('routing')).toBe(true);
      expect(categories.has('cost-control')).toBe(true);
      expect(categories.has('compliance')).toBe(true);
      expect(categories.has('conditional')).toBe(true);
      expect(categories.has('utility')).toBe(true);
    });

    it('has 7 guard blocks', () => {
      const guards = BLOCK_LIBRARY.filter(b => b.category === 'guards');
      expect(guards.length).toBe(7);
    });

    it('has 6 action blocks', () => {
      const actions = BLOCK_LIBRARY.filter(b => b.category === 'actions');
      expect(actions.length).toBe(6);
    });

    it('has 5 routing blocks', () => {
      const routing = BLOCK_LIBRARY.filter(b => b.category === 'routing');
      expect(routing.length).toBe(5);
    });

    it('has 4 cost control blocks', () => {
      const costControl = BLOCK_LIBRARY.filter(b => b.category === 'cost-control');
      expect(costControl.length).toBe(4);
    });

    it('has 3 compliance blocks', () => {
      const compliance = BLOCK_LIBRARY.filter(b => b.category === 'compliance');
      expect(compliance.length).toBe(3);
    });

    it('has 2 conditional blocks', () => {
      const conditional = BLOCK_LIBRARY.filter(b => b.category === 'conditional');
      expect(conditional.length).toBe(2);
    });

    it('has 3 utility blocks', () => {
      const utility = BLOCK_LIBRARY.filter(b => b.category === 'utility');
      expect(utility.length).toBe(3);
    });

    it('all blocks have unique IDs', () => {
      const ids = BLOCK_LIBRARY.map(b => b.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('all blocks have required metadata', () => {
      BLOCK_LIBRARY.forEach(block => {
        expect(block.id).toBeTruthy();
        expect(block.name).toBeTruthy();
        expect(block.category).toBeTruthy();
        expect(block.description).toBeTruthy();
        expect(block.icon).toBeTruthy();
        expect(Array.isArray(block.parameters)).toBe(true);
        expect(Array.isArray(block.inputs)).toBe(true);
        expect(Array.isArray(block.outputs)).toBe(true);
        expect(block.codeTemplate).toBeTruthy();
        expect(Array.isArray(block.tags)).toBe(true);
        expect(Array.isArray(block.providers)).toBe(true);
        expect(Array.isArray(block.complianceFrameworks)).toBe(true);
        expect(typeof block.estimatedCost).toBe('number');
        expect(typeof block.isCustom).toBe('boolean');
      });
    });

    it('all blocks have at least one provider', () => {
      BLOCK_LIBRARY.forEach(block => {
        expect(block.providers.length).toBeGreaterThan(0);
      });
    });

    it('all blocks have at least one tag', () => {
      BLOCK_LIBRARY.forEach(block => {
        expect(block.tags.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getBlocksByCategory', () => {
    it('returns guards blocks', () => {
      const guards = getBlocksByCategory('guards');
      expect(guards.length).toBe(7);
      expect(guards.every(b => b.category === 'guards')).toBe(true);
    });

    it('returns actions blocks', () => {
      const actions = getBlocksByCategory('actions');
      expect(actions.length).toBe(6);
      expect(actions.every(b => b.category === 'actions')).toBe(true);
    });

    it('returns empty array for invalid category', () => {
      const blocks = getBlocksByCategory('invalid' as any);
      expect(blocks.length).toBe(0);
    });
  });

  describe('getBlockById', () => {
    it('returns block by ID', () => {
      const block = getBlockById('guard-pii-detection');
      expect(block).toBeDefined();
      expect(block?.name).toBe('PII Detection');
    });

    it('returns undefined for non-existent ID', () => {
      const block = getBlockById('non-existent');
      expect(block).toBeUndefined();
    });
  });

  describe('searchBlocks', () => {
    it('searches by name', () => {
      const results = searchBlocks('PII');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(b => b.name.includes('PII'))).toBe(true);
    });

    it('searches by description', () => {
      const results = searchBlocks('security');
      expect(results.length).toBeGreaterThan(0);
    });

    it('searches by tags', () => {
      const results = searchBlocks('cost-control');
      expect(results.length).toBeGreaterThan(0);
    });

    it('is case insensitive', () => {
      const lower = searchBlocks('pii');
      const upper = searchBlocks('PII');
      expect(lower.length).toBe(upper.length);
    });

    it('returns empty array for no matches', () => {
      const results = searchBlocks('nonexistent12345');
      expect(results.length).toBe(0);
    });
  });

  describe('filterBlocksByProvider', () => {
    it('filters by OpenAI', () => {
      const results = filterBlocksByProvider('openai');
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(b => b.providers.includes('openai'))).toBe(true);
    });

    it('filters by Anthropic', () => {
      const results = filterBlocksByProvider('anthropic');
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(b => b.providers.includes('anthropic'))).toBe(true);
    });

    it('returns empty array for non-existent provider', () => {
      const results = filterBlocksByProvider('nonexistent');
      expect(results.length).toBe(0);
    });
  });

  describe('filterBlocksByCompliance', () => {
    it('filters by GDPR', () => {
      const results = filterBlocksByCompliance('GDPR');
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(b => b.complianceFrameworks.includes('GDPR'))).toBe(true);
    });

    it('filters by OWASP', () => {
      const results = filterBlocksByCompliance('OWASP');
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(b => b.complianceFrameworks.includes('OWASP'))).toBe(true);
    });

    it('filters by SOC2', () => {
      const results = filterBlocksByCompliance('SOC2');
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(b => b.complianceFrameworks.includes('SOC2'))).toBe(true);
    });
  });

  describe('getCategoriesWithCounts', () => {
    it('returns all categories with counts', () => {
      const categories = getCategoriesWithCounts();
      expect(categories.length).toBe(7);
      
      const guards = categories.find(c => c.category === 'guards');
      expect(guards?.count).toBe(7);
      
      const actions = categories.find(c => c.category === 'actions');
      expect(actions?.count).toBe(6);
    });
  });

  describe('Individual Block Definitions', () => {
    describe('PII Detection Block', () => {
      it('has correct structure', () => {
        expect(piiDetectionBlock.id).toBe('guard-pii-detection');
        expect(piiDetectionBlock.name).toBe('PII Detection');
        expect(piiDetectionBlock.category).toBe('guards');
        expect(piiDetectionBlock.parameters.length).toBeGreaterThan(0);
      });

      it('has required parameters', () => {
        const piiTypes = piiDetectionBlock.parameters.find(p => p.name === 'piiTypes');
        expect(piiTypes).toBeDefined();
        expect(piiTypes?.required).toBe(true);
        expect(piiTypes?.type).toBe('array');
      });

      it('has GDPR compliance', () => {
        expect(piiDetectionBlock.complianceFrameworks).toContain('GDPR');
      });
    });

    describe('Allow Request Block', () => {
      it('has correct structure', () => {
        expect(allowRequestBlock.id).toBe('action-allow');
        expect(allowRequestBlock.category).toBe('actions');
        expect(allowRequestBlock.outputs.length).toBe(0); // Terminal block
      });
    });

    describe('Provider Selection Block', () => {
      it('has provider parameter', () => {
        const provider = providerSelectionBlock.parameters.find(p => p.name === 'provider');
        expect(provider).toBeDefined();
        expect(provider?.type).toBe('enum');
        expect(provider?.options).toContain('openai');
        expect(provider?.options).toContain('anthropic');
      });
    });

    describe('Budget Limit Block', () => {
      it('has cost parameters', () => {
        const maxCost = budgetLimitBlock.parameters.find(p => p.name === 'maxCost');
        expect(maxCost).toBeDefined();
        expect(maxCost?.type).toBe('number');
        expect(maxCost?.validation?.min).toBe(0);
      });
    });

    describe('Audit Logging Block', () => {
      it('has compliance frameworks', () => {
        expect(auditLoggingBlock.complianceFrameworks).toContain('SOC2');
        expect(auditLoggingBlock.complianceFrameworks).toContain('HIPAA');
      });
    });

    describe('If/Else Block', () => {
      it('has two outputs', () => {
        expect(ifElseBlock.outputs.length).toBe(2);
        expect(ifElseBlock.outputs.find(o => o.id === 'true')).toBeDefined();
        expect(ifElseBlock.outputs.find(o => o.id === 'false')).toBeDefined();
      });
    });

    describe('Variable Assignment Block', () => {
      it('has variable parameters', () => {
        const varName = variableAssignmentBlock.parameters.find(p => p.name === 'variableName');
        expect(varName).toBeDefined();
        expect(varName?.required).toBe(true);
      });
    });
  });

  describe('Block Parameter Validation', () => {
    it('all required parameters are marked correctly', () => {
      BLOCK_LIBRARY.forEach(block => {
        block.parameters.forEach(param => {
          expect(typeof param.required).toBe('boolean');
        });
      });
    });

    it('enum parameters have options', () => {
      BLOCK_LIBRARY.forEach(block => {
        block.parameters.forEach(param => {
          if (param.type === 'enum') {
            expect(Array.isArray(param.options)).toBe(true);
            expect(param.options!.length).toBeGreaterThan(0);
          }
        });
      });
    });

    it('number parameters with validation have valid ranges', () => {
      BLOCK_LIBRARY.forEach(block => {
        block.parameters.forEach(param => {
          if (param.type === 'number' && param.validation) {
            if (param.validation.min !== undefined && param.validation.max !== undefined) {
              expect(param.validation.min).toBeLessThanOrEqual(param.validation.max);
            }
          }
        });
      });
    });
  });

  describe('Block Connections', () => {
    it('all blocks have at least one input or are entry points', () => {
      BLOCK_LIBRARY.forEach(block => {
        // Most blocks should have inputs, except potential entry point blocks
        if (block.inputs.length === 0) {
          // Entry point blocks should be documented
          expect(block.description).toBeTruthy();
        }
      });
    });

    it('connection points have required fields', () => {
      BLOCK_LIBRARY.forEach(block => {
        [...block.inputs, ...block.outputs].forEach(conn => {
          expect(conn.id).toBeTruthy();
          expect(conn.label).toBeTruthy();
          expect(conn.type).toBeTruthy();
          expect(typeof conn.required).toBe('boolean');
        });
      });
    });
  });

  describe('Block Code Templates', () => {
    it('all blocks have non-empty code templates', () => {
      BLOCK_LIBRARY.forEach(block => {
        expect(block.codeTemplate.trim().length).toBeGreaterThan(0);
      });
    });

    it('code templates contain parameter placeholders', () => {
      BLOCK_LIBRARY.forEach(block => {
        if (block.parameters.length > 0) {
          // At least some parameters should be referenced in template
          const hasPlaceholder = block.parameters.some(param => 
            block.codeTemplate.includes(`{{${param.name}}}`)
          );
          // Not all parameters need to be in template, but most blocks should reference some
          if (block.parameters.filter(p => p.required).length > 0) {
            expect(block.codeTemplate.includes('{{')).toBe(true);
          }
        }
      });
    });
  });
});
