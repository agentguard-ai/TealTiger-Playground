// Policy Template Service
// Manages policy template library with customization and validation

import type {
  PolicyTemplate,
  CustomizedTemplate,
  TemplateValidationResult,
} from '../types/policy-template';
import { policyTemplates } from '../data/policy-templates-index';

export class PolicyTemplateService {
  /**
   * Lists all available policy templates
   */
  listTemplates(): PolicyTemplate[] {
    return policyTemplates;
  }

  /**
   * Gets templates filtered by category
   */
  getTemplatesByCategory(category: string): PolicyTemplate[] {
    return policyTemplates.filter((template) => template.category === category);
  }

  /**
   * Gets templates filtered by tags
   */
  getTemplatesByTags(tags: string[]): PolicyTemplate[] {
    return policyTemplates.filter((template) =>
      tags.some((tag) => template.tags.includes(tag))
    );
  }

  /**
   * Gets a specific template by ID
   */
  getTemplate(templateId: string): PolicyTemplate | undefined {
    return policyTemplates.find((template) => template.id === templateId);
  }

  /**
   * Searches templates by name or description
   */
  searchTemplates(query: string): PolicyTemplate[] {
    const lowerQuery = query.toLowerCase();
    return policyTemplates.filter(
      (template) =>
        template.name.toLowerCase().includes(lowerQuery) ||
        template.description.toLowerCase().includes(lowerQuery) ||
        template.longDescription.toLowerCase().includes(lowerQuery) ||
        template.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Customizes a template with user-provided parameters
   */
  customizeTemplate(
    templateId: string,
    parameters: Record<string, unknown>
  ): string {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Validate parameters
    const validation = this.validateParameters(templateId, parameters);
    if (!validation.isValid) {
      throw new Error(
        `Invalid parameters: ${validation.errors.join(', ')}`
      );
    }

    // Replace parameter placeholders in code
    let customizedCode = template.code;

    template.parameters.forEach((param) => {
      const value = parameters[param.name] ?? param.defaultValue;
      const placeholder = `{{${param.name}}}`;

      // Convert value to string representation based on type
      let valueStr: string;
      if (param.type === 'string') {
        valueStr = `'${value}'`;
      } else if (param.type === 'array' || param.type === 'object') {
        valueStr = JSON.stringify(value);
      } else {
        valueStr = String(value);
      }

      customizedCode = customizedCode.replace(
        new RegExp(placeholder, 'g'),
        valueStr
      );
    });

    return customizedCode;
  }

  /**
   * Validates template parameters
   */
  validateParameters(
    templateId: string,
    parameters: Record<string, unknown>
  ): TemplateValidationResult {
    const template = this.getTemplate(templateId);
    if (!template) {
      return {
        isValid: false,
        errors: [`Template not found: ${templateId}`],
        warnings: [],
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required parameters
    template.parameters.forEach((param) => {
      const value = parameters[param.name];

      if (param.required && (value === undefined || value === null)) {
        errors.push(`Required parameter missing: ${param.name}`);
        return;
      }

      if (value === undefined || value === null) {
        return; // Skip validation for optional missing parameters
      }

      // Type validation
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== param.type && param.type !== 'object') {
        errors.push(
          `Parameter ${param.name} must be of type ${param.type}, got ${actualType}`
        );
      }

      // Range validation for numbers
      if (param.type === 'number' && typeof value === 'number') {
        if (param.validation?.min !== undefined && value < param.validation.min) {
          errors.push(
            `Parameter ${param.name} must be >= ${param.validation.min}`
          );
        }
        if (param.validation?.max !== undefined && value > param.validation.max) {
          errors.push(
            `Parameter ${param.name} must be <= ${param.validation.max}`
          );
        }
      }

      // Pattern validation for strings
      if (param.type === 'string' && typeof value === 'string') {
        if (param.validation?.pattern) {
          const regex = new RegExp(param.validation.pattern);
          if (!regex.test(value)) {
            errors.push(
              `Parameter ${param.name} does not match required pattern`
            );
          }
        }
      }

      // Options validation
      if (param.validation?.options && param.validation.options.length > 0) {
        if (!param.validation.options.includes(value)) {
          errors.push(
            `Parameter ${param.name} must be one of: ${param.validation.options.join(', ')}`
          );
        }
      }
    });

    // Check for unknown parameters
    Object.keys(parameters).forEach((key) => {
      const paramDef = template.parameters.find((p) => p.name === key);
      if (!paramDef) {
        warnings.push(`Unknown parameter: ${key}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Saves a customized template to workspace
   */
  async saveCustomizedTemplate(
    customized: Omit<CustomizedTemplate, 'createdAt'>
  ): Promise<CustomizedTemplate> {
    const template: CustomizedTemplate = {
      ...customized,
      createdAt: new Date(),
    };

    // In a real implementation, this would save to Supabase
    // For now, we'll just return the template
    // TODO: Implement Supabase storage when workspace integration is ready

    return template;
  }

  /**
   * Gets all template categories
   */
  getCategories(): string[] {
    const categories = new Set(policyTemplates.map((t) => t.category));
    return Array.from(categories);
  }

  /**
   * Gets all template tags
   */
  getTags(): string[] {
    const tags = new Set(policyTemplates.flatMap((t) => t.tags));
    return Array.from(tags);
  }

  /**
   * Gets template count by category
   */
  getTemplateCountByCategory(): Record<string, number> {
    const counts: Record<string, number> = {};
    policyTemplates.forEach((template) => {
      counts[template.category] = (counts[template.category] || 0) + 1;
    });
    return counts;
  }
}

// Export singleton instance
export const policyTemplateService = new PolicyTemplateService();
