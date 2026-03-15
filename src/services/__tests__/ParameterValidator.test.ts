/**
 * ParameterValidator Unit Tests
 * 
 * Tests for parameter validation logic including:
 * - Type validation (string, number, boolean, enum, array, object)
 * - Required field validation
 * - Min/max validation
 * - Pattern validation
 * - Custom validators
 */

import { describe, it, expect } from 'vitest';
import { ParameterValidator } from '../ParameterValidator';
import type { BlockParameter } from '../../types/visual-policy';

describe('ParameterValidator', () => {
  const blockId = 'test-block-1';

  describe('Required Field Validation', () => {
    it('should return error for missing required string', () => {
      const param: BlockParameter = {
        name: 'message',
        type: 'string',
        label: 'Message',
        description: 'Test message',
        required: true
      };

      const result = ParameterValidator.validateParameter(param, undefined, blockId);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('required');
    });

    it('should return error for empty required string', () => {
      const param: BlockParameter = {
        name: 'message',
        type: 'string',
        label: 'Message',
        description: 'Test message',
        required: true
      };

      const result = ParameterValidator.validateParameter(param, '', blockId);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it('should return error for empty required array', () => {
      const param: BlockParameter = {
        name: 'items',
        type: 'array',
        label: 'Items',
        description: 'Test items',
        required: true
      };

      const result = ParameterValidator.validateParameter(param, [], blockId);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('at least one');
    });

    it('should pass for valid required field', () => {
      const param: BlockParameter = {
        name: 'message',
        type: 'string',
        label: 'Message',
        description: 'Test message',
        required: true
      };

      const result = ParameterValidator.validateParameter(param, 'Hello', blockId);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('String Validation', () => {
    it('should validate string type', () => {
      const param: BlockParameter = {
        name: 'text',
        type: 'string',
        label: 'Text',
        description: 'Test text',
        required: false
      };

      const result = ParameterValidator.validateParameter(param, 123, blockId);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('must be a string');
    });

    it('should validate string pattern', () => {
      const param: BlockParameter = {
        name: 'email',
        type: 'string',
        label: 'Email',
        description: 'Email address',
        required: true,
        validation: {
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
        }
      };

      const invalidResult = ParameterValidator.validateParameter(param, 'invalid-email', blockId);
      expect(invalidResult.isValid).toBe(false);

      const validResult = ParameterValidator.validateParameter(param, 'test@example.com', blockId);
      expect(validResult.isValid).toBe(true);
    });
  });

  describe('Number Validation', () => {
    it('should validate number type', () => {
      const param: BlockParameter = {
        name: 'count',
        type: 'number',
        label: 'Count',
        description: 'Test count',
        required: false
      };

      const result = ParameterValidator.validateParameter(param, 'not-a-number', blockId);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('valid number');
    });
  });
});
