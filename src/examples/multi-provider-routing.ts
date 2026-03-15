import type { TestScenario } from '../types';

export const multiProviderRoutingPolicy = {
  id: 'multi-provider-routing',
  name: 'Multi-Provider Routing',
  category: 'routing' as const,
  difficulty: 'advanced' as const,
  description: 'Intelligently route requests to the most cost-effective provider while maintaining quality requirements.',
  
  code: `// Multi-Provider Routing Policy
// Routes to cost-optimal provider based on requirements

export default function multiProviderRoutingPolicy(request, context, response) {
  const providers = [
    { name: 'openai', model: 'gpt-3.5-turbo' },
    { name: 'anthropic', model: 'claude-instant-1' },
    { name: 'gemini', model: 'gemini-pro' }
  ];
  
  // Estimate cost for each provider
  const costs = providers.map(provider => {
    const estimate = estimateCost({
      provider: provider.name,
      model: provider.model,
      inputTokens: request.prompt.length / 4,
      outputTokens: request.parameters.maxTokens || 1000
    });
    
    return {
      provider: provider.name,
      model: provider.model,
      cost: estimate.total
    };
  });
  
  // Sort by cost (ascending)
  costs.sort((a, b) => a.cost - b.cost);
  
  const optimal = costs[0];
  const current = {
    provider: request.provider,
    model: request.model
  };
  
  // Check if current choice is optimal
  const currentCost = costs.find(
    c => c.provider === current.provider
  )?.cost || 0;
  
  if (currentCost > optimal.cost * 1.5) {
    return {
      action: 'MONITOR',
      reason: \`Consider using \${optimal.provider}/\${optimal.model} for 50% cost savings\`,
      metadata: {
        currentCost,
        optimalCost: optimal.cost,
        savings: currentCost - optimal.cost,
        recommendation: optimal
      }
    };
  }
  
  return {
    action: 'ALLOW',
    reason: 'Using cost-effective provider',
    metadata: {
      currentCost,
      optimalCost: optimal.cost,
      alternatives: costs
    }
  };
}`,

  scenarios: [
    {
      id: 'routing-1',
      timestamp: Date.now(),
      name: 'Expensive model',
      prompt: 'What is the capital of France?',
      provider: 'openai' as const,
      model: 'gpt-4',
      parameters: {
        temperature: 0.7,
        maxTokens: 100,
      },
      expectedOutcome: 'MONITOR' as const,
      description: 'Should suggest cheaper alternative',
      testType: 'normal' as const,
    },
    {
      id: 'routing-2',
      timestamp: Date.now(),
      name: 'Cost-optimal model',
      prompt: 'What is 2+2?',
      provider: 'openai' as const,
      model: 'gpt-3.5-turbo',
      parameters: {
        temperature: 0.7,
        maxTokens: 50,
      },
      expectedOutcome: 'ALLOW' as const,
      description: 'Should allow cost-effective choice',
      testType: 'normal' as const,
    },
  ] as TestScenario[],
};
