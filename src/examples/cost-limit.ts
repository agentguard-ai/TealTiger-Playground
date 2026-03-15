import type { TestScenario } from '../types';

export const costLimitPolicy = {
  id: 'cost-limit',
  name: 'Cost Limit Enforcement',
  category: 'cost' as const,
  difficulty: 'beginner' as const,
  description: 'Enforce budget limits by estimating and blocking requests that would exceed cost thresholds.',
  
  code: `// Cost Limit Enforcement Policy
// Blocks requests that exceed budget thresholds

export default function costLimitPolicy(request, context, response) {
  const BUDGET_LIMIT = 0.10; // $0.10 per request
  
  // Estimate cost for this request
  const costEstimate = estimateCost({
    provider: request.provider,
    model: request.model,
    inputTokens: request.prompt.length / 4, // Rough estimate
    outputTokens: request.parameters.maxTokens || 1000
  });
  
  if (costEstimate.total > BUDGET_LIMIT) {
    return {
      action: 'DENY',
      reason: \`Cost estimate $\${costEstimate.total.toFixed(4)} exceeds budget limit $\${BUDGET_LIMIT.toFixed(4)}\`,
      metadata: {
        estimatedCost: costEstimate.total,
        budgetLimit: BUDGET_LIMIT,
        inputCost: costEstimate.input,
        outputCost: costEstimate.output
      }
    };
  }
  
  return {
    action: 'ALLOW',
    reason: \`Cost estimate $\${costEstimate.total.toFixed(4)} within budget\`,
    metadata: {
      estimatedCost: costEstimate.total,
      budgetLimit: BUDGET_LIMIT
    }
  };
}`,

  scenarios: [
    {
      id: 'cost-1',
      timestamp: Date.now(),
      name: 'High cost request',
      prompt: 'Write a comprehensive 10,000 word essay on artificial intelligence.',
      provider: 'openai' as const,
      model: 'gpt-4',
      parameters: {
        temperature: 0.7,
        maxTokens: 4000,
      },
      expectedOutcome: 'DENY' as const,
      description: 'Should block high-cost request',
      testType: 'normal' as const,
    },
    {
      id: 'cost-2',
      timestamp: Date.now(),
      name: 'Low cost request',
      prompt: 'What is 2+2?',
      provider: 'openai' as const,
      model: 'gpt-3.5-turbo',
      parameters: {
        temperature: 0.7,
        maxTokens: 50,
      },
      expectedOutcome: 'ALLOW' as const,
      description: 'Should allow low-cost request',
      testType: 'normal' as const,
    },
  ] as TestScenario[],
};
