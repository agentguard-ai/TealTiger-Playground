// Policy Template Library - Consolidated Export
// Merges all 15+ enterprise-ready policy templates

import type { PolicyTemplate } from '../types/policy-template';
import { policyTemplates as part1 } from './policy-templates';
import { policyTemplatesPart2 as part2 } from './policy-templates-part2';
import { policyTemplatesRemaining as part3 } from './policy-templates-remaining';

// Export all templates as a single array
export const policyTemplates: PolicyTemplate[] = [
  ...part1,
  ...part2,
  ...part3,
];

// Export by category for easy filtering
export const templatesByCategory = {
  security: policyTemplates.filter(t => t.category === 'security'),
  cost: policyTemplates.filter(t => t.category === 'cost'),
  compliance: policyTemplates.filter(t => t.category === 'compliance'),
  performance: policyTemplates.filter(t => t.category === 'performance'),
  routing: policyTemplates.filter(t => t.category === 'routing'),
  reliability: policyTemplates.filter(t => t.category === 'reliability'),
};

// Export template count
export const templateCount = policyTemplates.length;
