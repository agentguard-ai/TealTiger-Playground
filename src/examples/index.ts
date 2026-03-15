import { piiDetectionPolicy } from './pii-detection';
import { costLimitPolicy } from './cost-limit';
import { promptInjectionPolicy } from './prompt-injection';
import { contentModerationPolicy } from './content-moderation';
import { rateLimitingPolicy } from './rate-limiting';
import { multiProviderRoutingPolicy } from './multi-provider-routing';
import { complianceAuditPolicy } from './compliance-audit';
import { tokenOptimizationPolicy } from './token-optimization';
import type { TestScenario } from '../types';

export interface ExamplePolicy {
  id: string;
  name: string;
  category: 'security' | 'cost' | 'routing' | 'compliance';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  description: string;
  code: string;
  scenarios: TestScenario[];
}

export const examples: ExamplePolicy[] = [
  piiDetectionPolicy,
  costLimitPolicy,
  promptInjectionPolicy,
  contentModerationPolicy,
  rateLimitingPolicy,
  multiProviderRoutingPolicy,
  complianceAuditPolicy,
  tokenOptimizationPolicy,
];

export const examplesByCategory = {
  security: examples.filter(e => e.category === 'security'),
  cost: examples.filter(e => e.category === 'cost'),
  routing: examples.filter(e => e.category === 'routing'),
  compliance: examples.filter(e => e.category === 'compliance'),
};

export const examplesByDifficulty = {
  beginner: examples.filter(e => e.difficulty === 'beginner'),
  intermediate: examples.filter(e => e.difficulty === 'intermediate'),
  advanced: examples.filter(e => e.difficulty === 'advanced'),
};
