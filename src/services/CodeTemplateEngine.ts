/**
 * Code Template Engine
 * 
 * Handles template variable substitution and code generation for policy blocks.
 * Supports:
 * - Variable substitution ({{variableName}})
 * - Import generation based on block usage
 * - Comment generation for code documentation
 * - Type-safe parameter value formatting
 * 
 * @module services/CodeTemplateEngine
 */

import type { PolicyBlock, BlockDefinition } from '../types/visual-policy';
import { getBlockById } from '../data/blockLibrary';

/**
 * Template context for variable substitution
 */
export interface TemplateContext {
  /** Block instance with configured parameters */
  block: PolicyBlock;
  /** Block definition with template */
  definition: BlockDefinition;
  /** Additional context variables */
  variables?: Record<string, any>;
}

/**
 * Generated import statement
 */
export interface ImportStatement {
  /** Module path */
  module: string;
  /** Named imports */
  imports: string[];
  /** Whether this is a type import */
  isType?: boolean;
}

/**
 * Code Template Engine
 * 
 * Processes code templates with variable substitution and generates
 * properly formatted TypeScript code.
 */
export class CodeTemplateEngine {
  /**
   * Substitute template variables with actual values
   * 
   * Replaces {{variableName}} with the corresponding parameter value
   * from the block configuration.
   */
  substituteVariables(template: string, context: TemplateContext): string {
    let result = template;
    
    // Get all template variables ({{variableName}})
    const variablePattern = /\{\{(\w+)\}\}/g;
    const matches = template.matchAll(variablePattern);
    
    for (const match of matches) {
      const variableName = match[1];
      const value = this.getParameterValue(variableName, context);
      
      // Replace the variable with its formatted value
      result = result.replace(match[0], value);
    }
    
    return result;
  }
  
  /**
   * Get parameter value from block configuration
   * 
   * Formats the value appropriately for TypeScript code.
   */
  private getParameterValue(paramName: string, context: TemplateContext): string {
    const { block, definition, variables } = context;
    
    // Check if it's a custom variable first
    if (variables && paramName in variables) {
      return this.formatValue(variables[paramName]);
    }
    
    // Check if it's a block parameter
    const paramDef = definition.parameters.find(p => p.name === paramName);
    if (!paramDef) {
      return `/* MISSING: ${paramName} */`;
    }
    
    const value = block.parameters[paramName];
    
    // Use default value if not configured
    const actualValue = value !== undefined ? value : paramDef.defaultValue;
    
    if (actualValue === undefined) {
      return `/* UNCONFIGURED: ${paramName} */`;
    }
    
    return this.formatValue(actualValue, paramDef.type);
  }
  
  /**
   * Format a value for TypeScript code
   * 
   * Converts JavaScript values to their TypeScript code representation.
   */
  private formatValue(value: any, type?: string): string {
    if (value === null || value === undefined) {
      return 'undefined';
    }
    
    // Boolean values
    if (typeof value === 'boolean') {
      return value.toString();
    }
    
    // Number values
    if (typeof value === 'number') {
      return value.toString();
    }
    
    // String values
    if (typeof value === 'string') {
      // Escape special characters
      const escaped = value
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
      return `'${escaped}'`;
    }
    
    // Array values
    if (Array.isArray(value)) {
      const items = value.map(item => this.formatValue(item));
      return `[${items.join(', ')}]`;
    }
    
    // Object values
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch (error) {
        return '{}';
      }
    }
    
    return String(value);
  }
  
  /**
   * Generate TypeScript imports based on blocks used
   * 
   * Analyzes blocks and generates necessary import statements.
   */
  generateImports(blocks: PolicyBlock[]): string[] {
    const imports = new Set<string>();
    
    // Always import core TealTiger types
    imports.add("import type { TealTigerPolicy, PolicyContext, PolicyDecision } from '@tealtiger/core';");
    
    // Analyze blocks for specific imports
    const blockDefinitions = blocks
      .map(block => getBlockById(block.definitionId))
      .filter((def): def is BlockDefinition => def !== undefined);
    
    // Check for guard blocks (need detection functions)
    const hasGuards = blockDefinitions.some(def => def.category === 'guards');
    if (hasGuards) {
      imports.add("import { detectPII, detectPromptInjection, moderateContent, detectToxicity, detectJailbreak, checkDataLeakage, checkSensitiveTopics } from '@tealtiger/guards';");
    }
    
    // Check for routing blocks (need routing utilities)
    const hasRouting = blockDefinitions.some(def => def.category === 'routing');
    if (hasRouting) {
      imports.add("import { selectProvider, callModel } from '@tealtiger/routing';");
    }
    
    // Check for cost control blocks (need cost tracking)
    const hasCostControl = blockDefinitions.some(def => def.category === 'cost-control');
    if (hasCostControl) {
      imports.add("import { getCurrentCost, optimizeTokens, checkRateLimit, getRateLimitKey } from '@tealtiger/cost';");
    }
    
    // Check for compliance blocks (need compliance utilities)
    const hasCompliance = blockDefinitions.some(def => def.category === 'compliance');
    if (hasCompliance) {
      imports.add("import { auditLog, getProviderRegion, verifyConsent } from '@tealtiger/compliance';");
    }
    
    // Check for action blocks (need action utilities)
    const hasActions = blockDefinitions.some(def => def.category === 'actions');
    if (hasActions) {
      imports.add("import { logEvent, sendAlert, transformRequest, transformResponse } from '@tealtiger/actions';");
    }
    
    return Array.from(imports);
  }
  
  /**
   * Generate explanatory comment for a block
   * 
   * Creates a human-readable comment explaining what the block does.
   */
  generateBlockComment(block: PolicyBlock, definition: BlockDefinition): string {
    const lines: string[] = [];
    
    // Block name and description
    lines.push(`// ${definition.name}`);
    if (definition.description) {
      lines.push(`// ${definition.description}`);
    }
    
    // Show configured parameters
    const configuredParams = Object.entries(block.parameters)
      .filter(([_, value]) => value !== undefined);
    
    if (configuredParams.length > 0) {
      lines.push('// Parameters:');
      for (const [key, value] of configuredParams) {
        const paramDef = definition.parameters.find(p => p.name === key);
        const label = paramDef?.label || key;
        lines.push(`//   ${label}: ${this.formatValueForComment(value)}`);
      }
    }
    
    return lines.join('\n');
  }
  
  /**
   * Format a value for display in comments
   */
  private formatValueForComment(value: any): string {
    if (value === null || value === undefined) {
      return 'undefined';
    }
    
    if (typeof value === 'string') {
      return `"${value}"`;
    }
    
    if (Array.isArray(value)) {
      return `[${value.map(v => this.formatValueForComment(v)).join(', ')}]`;
    }
    
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return '[object]';
      }
    }
    
    return String(value);
  }
  
  /**
   * Process a block's code template
   * 
   * Main entry point for generating code from a single block.
   */
  processTemplate(block: PolicyBlock, definition: BlockDefinition, variables?: Record<string, any>): string {
    const context: TemplateContext = {
      block,
      definition,
      variables,
    };
    
    // Generate comment
    const comment = this.generateBlockComment(block, definition);
    
    // Process template
    const code = this.substituteVariables(definition.codeTemplate, context);
    
    // Combine comment and code
    return `${comment}\n${code}`;
  }
  
  /**
   * Generate proper indentation for code
   */
  indent(code: string, level: number = 1): string {
    const indentation = '  '.repeat(level);
    return code
      .split('\n')
      .map(line => line.trim() ? indentation + line : line)
      .join('\n');
  }
  
  /**
   * Clean up generated code
   * 
   * Removes extra blank lines and formats code properly.
   */
  cleanupCode(code: string): string {
    return code
      // Remove multiple consecutive blank lines
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      // Remove trailing whitespace
      .replace(/[ \t]+$/gm, '')
      // Ensure file ends with newline
      .replace(/\n*$/, '\n');
  }
}

/**
 * Singleton instance
 */
export const codeTemplateEngine = new CodeTemplateEngine();
