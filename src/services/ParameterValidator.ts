/**
 * Parameter Validator Service
 * 
 * Validates block parameters against their definitions and validation rules.
 * Provides real-time validation with detailed error messages.
 * 
 * @module services/ParameterValidator
 */

import type { BlockParameter, BlockValidationError, BlockValidationWarning } from '../types/visual-policy';

/**
 * Validation result for a single parameter
 */
export interface ParameterValidationResult {
  isValid: boolean;
  errors: BlockValidationError[];
  warnings: BlockValidationWarning[];
}

/**
 * ParameterValidator class
 * 
 * Validates block parameters according to their type and validation rules.
 */
export class ParameterValidator {
  /**
   * Validate a single parameter value
   */
  static validateParameter(
    parameter: BlockParameter,
    value: any,
    blockId: string
  ): ParameterValidationResult {
    const errors: BlockValidationError[] = [];
    const warnings: BlockValidationWarning[] = [];
    
    // Check if required parameter is missing
    if (parameter.required) {
      if (value === undefined || value === null || value === '') {
        errors.push({
          blockId,
          message: `${parameter.label} is required`,
          severity: 'error',
          autoFixable: false
        });
        return { isValid: false, errors, warnings };
      }
      
      // Check for empty arrays
      if (parameter.type === 'array' && Array.isArray(value) && value.length === 0) {
        errors.push({
          blockId,
          message: `${parameter.label} requires at least one selection`,
          severity: 'error',
          autoFixable: false
        });
        return { isValid: false, errors, warnings };
      }
    }
    
    // Skip validation if value is empty and not required
    if (value === undefined || value === null || value === '') {
      return { isValid: true, errors, warnings };
    }
    
    // Type-specific validation
    switch (parameter.type) {
      case 'string':
        this.validateString(parameter, value, blockId, errors, warnings);
        break;
      
      case 'number':
        this.validateNumber(parameter, value, blockId, errors, warnings);
        break;
      
      case 'boolean':
        this.validateBoolean(parameter, value, blockId, errors, warnings);
        break;
      
      case 'enum':
        this.validateEnum(parameter, value, blockId, errors, warnings);
        break;
      
      case 'array':
        this.validateArray(parameter, value, blockId, errors, warnings);
        break;
      
      case 'object':
        this.validateObject(parameter, value, blockId, errors, warnings);
        break;
    }
    
    // Custom validator
    if (parameter.validation?.customValidator) {
      const customError = parameter.validation.customValidator(value);
      if (customError) {
        errors.push(customError);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Validate all parameters for a block
   */
  static validateAllParameters(
    parameters: BlockParameter[],
    values: Record<string, any>,
    blockId: string
  ): ParameterValidationResult {
    const allErrors: BlockValidationError[] = [];
    const allWarnings: BlockValidationWarning[] = [];
    
    for (const parameter of parameters) {
      const result = this.validateParameter(parameter, values[parameter.name], blockId);
      allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);
    }
    
    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings
    };
  }
  
  /**
   * Validate string parameter
   */
  private static validateString(
    parameter: BlockParameter,
    value: any,
    blockId: string,
    errors: BlockValidationError[],
    warnings: BlockValidationWarning[]
  ): void {
    if (typeof value !== 'string') {
      errors.push({
        blockId,
        message: `${parameter.label} must be a string`,
        severity: 'error',
        autoFixable: false
      });
      return;
    }
    
    // Pattern validation
    if (parameter.validation?.pattern) {
      const regex = new RegExp(parameter.validation.pattern);
      if (!regex.test(value)) {
        errors.push({
          blockId,
          message: `${parameter.label} does not match the required pattern`,
          severity: 'error',
          autoFixable: false
        });
      }
    }
    
    // Length warnings
    if (value.length > 1000) {
      warnings.push({
        blockId,
        message: `${parameter.label} is very long (${value.length} characters)`,
        severity: 'warning',
        suggestion: 'Consider using a shorter value'
      });
    }
  }
  
  /**
   * Validate number parameter
   */
  private static validateNumber(
    parameter: BlockParameter,
    value: any,
    blockId: string,
    errors: BlockValidationError[],
    warnings: BlockValidationWarning[]
  ): void {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    if (typeof numValue !== 'number' || isNaN(numValue)) {
      errors.push({
        blockId,
        message: `${parameter.label} must be a valid number`,
        severity: 'error',
        autoFixable: false
      });
      return;
    }
    
    // Min validation
    if (parameter.validation?.min !== undefined && numValue < parameter.validation.min) {
      errors.push({
        blockId,
        message: `${parameter.label} must be at least ${parameter.validation.min}`,
        severity: 'error',
        autoFixable: true,
        autoFix: () => parameter.validation!.min
      });
    }
    
    // Max validation
    if (parameter.validation?.max !== undefined && numValue > parameter.validation.max) {
      errors.push({
        blockId,
        message: `${parameter.label} must be at most ${parameter.validation.max}`,
        severity: 'error',
        autoFixable: true,
        autoFix: () => parameter.validation!.max
      });
    }
    
    // Warning for extreme values
    if (parameter.validation?.max && numValue > parameter.validation.max * 0.9) {
      warnings.push({
        blockId,
        message: `${parameter.label} is close to the maximum allowed value`,
        severity: 'warning',
        suggestion: 'Consider using a lower value for better performance'
      });
    }
  }
  
  /**
   * Validate boolean parameter
   */
  private static validateBoolean(
    parameter: BlockParameter,
    value: any,
    blockId: string,
    errors: BlockValidationError[],
    warnings: BlockValidationWarning[]
  ): void {
    if (typeof value !== 'boolean') {
      errors.push({
        blockId,
        message: `${parameter.label} must be true or false`,
        severity: 'error',
        autoFixable: true,
        autoFix: () => false
      });
    }
  }
  
  /**
   * Validate enum parameter
   */
  private static validateEnum(
    parameter: BlockParameter,
    value: any,
    blockId: string,
    errors: BlockValidationError[],
    warnings: BlockValidationWarning[]
  ): void {
    if (!parameter.options || parameter.options.length === 0) {
      warnings.push({
        blockId,
        message: `${parameter.label} has no available options`,
        severity: 'warning'
      });
      return;
    }
    
    if (!parameter.options.includes(value)) {
      errors.push({
        blockId,
        message: `${parameter.label} must be one of: ${parameter.options.join(', ')}`,
        severity: 'error',
        autoFixable: true,
        autoFix: () => parameter.options![0]
      });
    }
  }
  
  /**
   * Validate array parameter
   */
  private static validateArray(
    parameter: BlockParameter,
    value: any,
    blockId: string,
    errors: BlockValidationError[],
    warnings: BlockValidationWarning[]
  ): void {
    if (!Array.isArray(value)) {
      errors.push({
        blockId,
        message: `${parameter.label} must be an array`,
        severity: 'error',
        autoFixable: true,
        autoFix: () => []
      });
      return;
    }
    
    // Validate array items against options
    if (parameter.options && parameter.options.length > 0) {
      const invalidItems = value.filter(item => !parameter.options!.includes(item));
      if (invalidItems.length > 0) {
        errors.push({
          blockId,
          message: `${parameter.label} contains invalid values: ${invalidItems.join(', ')}`,
          severity: 'error',
          autoFixable: true,
          autoFix: () => value.filter((item: any) => parameter.options!.includes(item))
        });
      }
    }
    
    // Warning for too many selections
    if (value.length > 10) {
      warnings.push({
        blockId,
        message: `${parameter.label} has many selections (${value.length})`,
        severity: 'warning',
        suggestion: 'Consider reducing the number of selections for better performance'
      });
    }
  }
  
  /**
   * Validate object parameter
   */
  private static validateObject(
    parameter: BlockParameter,
    value: any,
    blockId: string,
    errors: BlockValidationError[],
    warnings: BlockValidationWarning[]
  ): void {
    // Try to parse if string
    let objValue = value;
    if (typeof value === 'string') {
      try {
        objValue = JSON.parse(value);
      } catch (e) {
        errors.push({
          blockId,
          message: `${parameter.label} must be valid JSON`,
          severity: 'error',
          autoFixable: false
        });
        return;
      }
    }
    
    if (typeof objValue !== 'object' || objValue === null) {
      errors.push({
        blockId,
        message: `${parameter.label} must be an object`,
        severity: 'error',
        autoFixable: true,
        autoFix: () => ({})
      });
    }
  }
}
