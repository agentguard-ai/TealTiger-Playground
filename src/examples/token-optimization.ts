import type { TestScenario } from '../types';

export const tokenOptimizationPolicy = {
  id: 'token-optimization',
  name: 'Token Optimization',
  category: 'cost' as const,
  difficulty: 'advanced' as const,
  description: 'Analyze and optimize token usage by detecting verbose prompts and suggesting more efficient alternatives.',
  
  code: `// Token Optimization Policy
// Suggests optimizations for token-heavy requests

export default function tokenOptimizationPolicy(request, context, response) {
  const promptTokens = Math.ceil(request.prompt.length / 4);
  const maxOutputTokens = request.parameters.maxTokens || 1000;
  const totalTokens = promptTokens + maxOutputTokens;
  
  // Token efficiency thresholds
  const VERBOSE_THRESHOLD = 500;
  const OPTIMIZATION_THRESHOLD = 2000;
  
  const suggestions = [];
  
  // Check for verbose prompt
  if (promptTokens > VERBOSE_THRESHOLD) {
    suggestions.push('Consider condensing the prompt');
  }
  
  // Check for excessive output tokens
  if (maxOutputTokens > 2000) {
    suggestions.push('Reduce maxTokens parameter');
  }
  
  // Check for repetitive content
  const words = request.prompt.toLowerCase().split(/\\s+/);
  const uniqueWords = new Set(words);
  const repetitionRatio = words.length / uniqueWords.size;
  
  if (repetitionRatio > 1.5) {
    suggestions.push('Remove repetitive content');
  }
  
  // Calculate potential savings
  const optimizedTokens = Math.floor(totalTokens * 0.6);
  const savings = totalTokens - optimizedTokens;
  
  if (totalTokens > OPTIMIZATION_THRESHOLD) {
    return {
      action: 'MONITOR',
      reason: \`High token usage detected (\${totalTokens} tokens)\`,
      metadata: {
        promptTokens,
        maxOutputTokens,
        totalTokens,
        suggestions,
        potentialSavings: savings,
        optimizationOpportunity: true
      }
    };
  }
  
  return {
    action: 'ALLOW',
    reason: 'Token usage is efficient',
    metadata: {
      promptTokens,
      maxOutputTokens,
      totalTokens,
      optimizationOpportunity: false
    }
  };
}`,

  scenarios: [
    {
      id: 'token-1',
      timestamp: Date.now(),
      name: 'Verbose prompt',
      prompt: 'I would like you to please help me understand and explain in great detail with comprehensive examples and thorough explanations about the various different aspects and considerations related to artificial intelligence and machine learning systems and their applications in modern technology.',
      provider: 'openai' as const,
      model: 'gpt-4',
      parameters: {
        temperature: 0.7,
        maxTokens: 3000,
      },
      expectedOutcome: 'MONITOR' as const,
      description: 'Should suggest optimization',
      testType: 'normal' as const,
    },
    {
      id: 'token-2',
      timestamp: Date.now(),
      name: 'Optimized prompt',
      prompt: 'Explain AI and ML applications briefly.',
      provider: 'openai' as const,
      model: 'gpt-4',
      parameters: {
        temperature: 0.7,
        maxTokens: 200,
      },
      expectedOutcome: 'ALLOW' as const,
      description: 'Should allow efficient request',
      testType: 'normal' as const,
    },
  ] as TestScenario[],
};
