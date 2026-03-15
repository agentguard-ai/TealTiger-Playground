import type { ValidationResult, ValidationError } from '@/types';

export class PolicyValidator {
  validatePolicy(policyCode: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Check for default export
    const hasDefaultExport = /export\s+default/.test(policyCode);
    if (!hasDefaultExport) {
      errors.push({
        line: 1,
        column: 1,
        message: 'Policy must have a default export',
        severity: 'error',
      });
    }

    // Check for function definition
    const hasFunction =
      /function/.test(policyCode) ||
      /=>/.test(policyCode) ||
      /class/.test(policyCode);
    if (!hasFunction) {
      errors.push({
        line: 1,
        column: 1,
        message: 'Policy must export a function or class',
        severity: 'error',
      });
    }

    // Check for correct parameters
    const hasCorrectParams =
      /\(request[,\s]*context[,\s]*response?\)/.test(policyCode) ||
      /\(request[,\s]*context\)/.test(policyCode);
    if (hasFunction && !hasCorrectParams) {
      warnings.push({
        line: 1,
        column: 1,
        message:
          'Policy function should accept (request, context, response) parameters',
        severity: 'warning',
      });
    }

    // Check for return statement
    const hasReturn = /return\s+{/.test(policyCode);
    if (hasFunction && !hasReturn) {
      warnings.push({
        line: 1,
        column: 1,
        message: 'Policy function should return a Decision object',
        severity: 'warning',
      });
    }

    // Determine export type
    let exportedType: 'function' | 'class' | 'object' | 'unknown' = 'unknown';
    if (/export\s+default\s+function/.test(policyCode)) {
      exportedType = 'function';
    } else if (/export\s+default\s+class/.test(policyCode)) {
      exportedType = 'class';
    } else if (/export\s+default\s+{/.test(policyCode)) {
      exportedType = 'object';
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      hasDefaultExport,
      exportedType,
    };
  }
}
