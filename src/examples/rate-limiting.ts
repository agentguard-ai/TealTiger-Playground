import type { TestScenario } from '../types';

export const rateLimitingPolicy = {
  id: 'rate-limiting',
  name: 'Rate Limiting',
  category: 'cost' as const,
  difficulty: 'intermediate' as const,
  description: 'Enforce rate limits to prevent abuse and control costs by tracking requests per user within time windows.',
  
  code: `// Rate Limiting Policy
// Limits requests per user within time windows

// In-memory store (in production, use Redis or similar)
const requestCounts = new Map();

export default function rateLimitingPolicy(request, context, response) {
  const RATE_LIMIT = 10; // requests per window
  const WINDOW_MS = 60000; // 1 minute
  
  const userId = context.userId || 'anonymous';
  const now = Date.now();
  
  // Get or initialize user's request history
  if (!requestCounts.has(userId)) {
    requestCounts.set(userId, []);
  }
  
  const userRequests = requestCounts.get(userId);
  
  // Remove requests outside the time window
  const recentRequests = userRequests.filter(
    timestamp => now - timestamp < WINDOW_MS
  );
  
  // Check if limit exceeded
  if (recentRequests.length >= RATE_LIMIT) {
    const oldestRequest = Math.min(...recentRequests);
    const resetTime = oldestRequest + WINDOW_MS;
    const waitSeconds = Math.ceil((resetTime - now) / 1000);
    
    return {
      action: 'DENY',
      reason: \`Rate limit exceeded. Try again in \${waitSeconds} seconds.\`,
      metadata: {
        limit: RATE_LIMIT,
        current: recentRequests.length,
        windowMs: WINDOW_MS,
        resetIn: waitSeconds
      }
    };
  }
  
  // Add current request
  recentRequests.push(now);
  requestCounts.set(userId, recentRequests);
  
  return {
    action: 'ALLOW',
    reason: 'Within rate limit',
    metadata: {
      limit: RATE_LIMIT,
      current: recentRequests.length,
      remaining: RATE_LIMIT - recentRequests.length
    }
  };
}`,

  scenarios: [
    {
      id: 'rate-1',
      timestamp: Date.now(),
      name: 'Within limit',
      prompt: 'What is the weather today?',
      provider: 'openai' as const,
      model: 'gpt-3.5-turbo',
      parameters: {
        temperature: 0.7,
        maxTokens: 100,
      },
      expectedOutcome: 'ALLOW' as const,
      description: 'Should allow request within rate limit',
      testType: 'normal' as const,
    },
    {
      id: 'rate-2',
      timestamp: Date.now(),
      name: 'Exceeds limit',
      prompt: 'Another request',
      provider: 'openai' as const,
      model: 'gpt-3.5-turbo',
      parameters: {
        temperature: 0.7,
        maxTokens: 100,
      },
      expectedOutcome: 'DENY' as const,
      description: 'Should deny when limit exceeded (simulated)',
      testType: 'normal' as const,
    },
  ] as TestScenario[],
};
