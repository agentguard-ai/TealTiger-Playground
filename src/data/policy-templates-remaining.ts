// Policy Template Library - Remaining Templates (11-15)
import type { PolicyTemplate } from '../types/policy-template';

export const policyTemplatesRemaining: PolicyTemplate[] = [
  // 11. Token Optimization
  {
    id: 'token-optimization',
    name: 'Token Optimization',
    category: 'cost',
    difficulty: 'intermediate',
    description: 'Optimize token usage to reduce costs while maintaining quality',
    longDescription: 'Automatically optimizes prompts and responses to minimize token usage without sacrificing output quality. Includes prompt compression, response truncation, and smart caching.',
    tags: ['tokens', 'optimization', 'cost', 'efficiency'],
    complianceFrameworks: ['SOC2-CC5.2'],
    parameters: [
      { name: 'maxInputTokens', type: 'number', description: 'Maximum input tokens', defaultValue: 2000, required: true, validation: { min: 100, max: 100000 } },
      { name: 'maxOutputTokens', type: 'number', description: 'Maximum output tokens', defaultValue: 1000, required: true, validation: { min: 50, max: 100000 } },
      { name: 'compressionEnabled', type: 'boolean', description: 'Enable prompt compression', defaultValue: true, required: true }
    ],
    code: `// Token Optimization Policy
export default function tokenOptimizationPolicy(request, context, response) {
  const MAX_INPUT = {{maxInputTokens}};
  const MAX_OUTPUT = {{maxOutputTokens}};
  const COMPRESSION = {{compressionEnabled}};
  
  const inputTokens = Math.ceil(request.prompt.length / 4);
  
  if (inputTokens > MAX_INPUT) {
    if (COMPRESSION) {
      const compressed = compressPrompt(request.prompt, MAX_INPUT);
      return {
        action: 'ALLOW',
        reason: 'Prompt compressed to fit token limit',
        modifiedPrompt: compressed,
        metadata: { originalTokens: inputTokens, compressedTokens: Math.ceil(compressed.length / 4), saved: inputTokens - Math.ceil(compressed.length / 4) }
      };
    }
    return {
      action: 'DENY',
      reason: 'Input exceeds token limit: ' + inputTokens + ' > ' + MAX_INPUT,
      metadata: { inputTokens, limit: MAX_INPUT }
    };
  }
  
  if (request.parameters.maxTokens > MAX_OUTPUT) {
    return {
      action: 'ALLOW',
      reason: 'Output tokens capped',
      modifiedParameters: { ...request.parameters, maxTokens: MAX_OUTPUT },
      metadata: { requested: request.parameters.maxTokens, capped: MAX_OUTPUT }
    };
  }
  
  return { action: 'ALLOW', reason: 'Within token limits', metadata: { inputTokens, outputLimit: MAX_OUTPUT } };
}`,
    documentation: '## Token Optimization\\n\\nReduces AI costs by optimizing token usage through prompt compression and output limiting.\\n\\n### Features\\n- Prompt compression\\n- Output token capping\\n- Smart truncation\\n\\n### Best Practices\\n1. Set realistic token limits\\n2. Enable compression for long prompts\\n3. Monitor compression quality\\n4. Adjust limits based on use case',
    examples: [
      { title: 'Aggressive optimization', description: 'Minimize costs', parameters: { maxInputTokens: 1000, maxOutputTokens: 500, compressionEnabled: true }, expectedBehavior: 'Compresses prompts and caps outputs' },
      { title: 'Balanced optimization', description: 'Balance cost and quality', parameters: { maxInputTokens: 3000, maxOutputTokens: 1500, compressionEnabled: false }, expectedBehavior: 'Caps tokens without compression' }
    ]
  },

  // 12. Semantic Cache
  {
    id: 'semantic-cache',
    name: 'Semantic Cache',
    category: 'performance',
    difficulty: 'advanced',
    description: 'Cache semantically similar requests to reduce costs and latency',
    longDescription: 'Uses semantic similarity to cache and reuse AI responses for similar queries, dramatically reducing costs and improving response times.',
    tags: ['cache', 'performance', 'cost', 'similarity'],
    complianceFrameworks: [],
    parameters: [
      { name: 'similarityThreshold', type: 'number', description: 'Similarity threshold (0-1)', defaultValue: 0.85, required: true, validation: { min: 0, max: 1 } },
      { name: 'cacheTTL', type: 'number', description: 'Cache TTL in seconds', defaultValue: 3600, required: true, validation: { min: 60, max: 86400 } },
      { name: 'maxCacheSize', type: 'number', description: 'Maximum cache entries', defaultValue: 1000, required: true, validation: { min: 10, max: 100000 } }
    ],
    code: `// Semantic Cache Policy
export default function semanticCachePolicy(request, context, response) {
  const THRESHOLD = {{similarityThreshold}};
  const TTL = {{cacheTTL}};
  const MAX_SIZE = {{maxCacheSize}};
  
  const cacheKey = generateEmbedding(request.prompt);
  const cached = searchCache(cacheKey, THRESHOLD);
  
  if (cached && !cached.expired) {
    return {
      action: 'ALLOW',
      reason: 'Cache hit - returning cached response',
      cachedResponse: cached.response,
      metadata: { similarity: cached.similarity, age: Date.now() - cached.timestamp, costSaved: cached.estimatedCost }
    };
  }
  
  if (response) {
    addToCache({ key: cacheKey, prompt: request.prompt, response: response.content, timestamp: Date.now(), ttl: TTL, cost: response.cost });
    pruneCache(MAX_SIZE);
  }
  
  return { action: 'ALLOW', reason: 'Cache miss - executing request', metadata: { cached: false, cacheSize: getCacheSize() } };
}`,
    documentation: '## Semantic Cache\\n\\nCaches AI responses based on semantic similarity to reduce costs and improve performance.\\n\\n### Features\\n- Semantic similarity matching\\n- Configurable TTL\\n- Automatic cache pruning\\n\\n### Best Practices\\n1. Set threshold based on use case (0.85-0.95)\\n2. Use shorter TTL for dynamic content\\n3. Monitor cache hit rates\\n4. Adjust cache size based on memory',
    examples: [
      { title: 'High similarity cache', description: 'Only cache very similar queries', parameters: { similarityThreshold: 0.95, cacheTTL: 1800, maxCacheSize: 500 }, expectedBehavior: 'Strict matching, 30min TTL' },
      { title: 'Aggressive caching', description: 'Cache more queries', parameters: { similarityThreshold: 0.80, cacheTTL: 7200, maxCacheSize: 5000 }, expectedBehavior: 'Loose matching, 2hr TTL' }
    ]
  },

  // 13. Circuit Breaker
  {
    id: 'circuit-breaker',
    name: 'Circuit Breaker',
    category: 'reliability',
    difficulty: 'advanced',
    description: 'Prevent cascading failures with circuit breaker pattern',
    longDescription: 'Implements circuit breaker pattern to protect against cascading failures when AI providers experience issues. Automatically opens circuit after threshold failures and closes after recovery.',
    tags: ['circuit-breaker', 'reliability', 'resilience', 'fault-tolerance'],
    complianceFrameworks: ['SOC2-CC5.1'],
    parameters: [
      { name: 'failureThreshold', type: 'number', description: 'Failures before opening', defaultValue: 5, required: true, validation: { min: 1, max: 100 } },
      { name: 'timeout', type: 'number', description: 'Circuit open duration (ms)', defaultValue: 60000, required: true, validation: { min: 1000, max: 600000 } },
      { name: 'halfOpenRequests', type: 'number', description: 'Test requests in half-open', defaultValue: 3, required: true, validation: { min: 1, max: 10 } }
    ],
    code: `// Circuit Breaker Policy
const circuitState = { state: 'CLOSED', failures: 0, lastFailure: null, halfOpenAttempts: 0 };

export default function circuitBreakerPolicy(request, context, response) {
  const THRESHOLD = {{failureThreshold}};
  const TIMEOUT = {{timeout}};
  const HALF_OPEN_REQUESTS = {{halfOpenRequests}};
  
  const now = Date.now();
  
  if (circuitState.state === 'OPEN') {
    if (now - circuitState.lastFailure > TIMEOUT) {
      circuitState.state = 'HALF_OPEN';
      circuitState.halfOpenAttempts = 0;
    } else {
      return {
        action: 'DENY',
        reason: 'Circuit breaker OPEN - provider unavailable',
        metadata: { state: 'OPEN', failures: circuitState.failures, reopensIn: Math.ceil((TIMEOUT - (now - circuitState.lastFailure)) / 1000) }
      };
    }
  }
  
  if (circuitState.state === 'HALF_OPEN') {
    if (circuitState.halfOpenAttempts >= HALF_OPEN_REQUESTS) {
      return { action: 'DENY', reason: 'Circuit breaker HALF_OPEN - testing in progress', metadata: { state: 'HALF_OPEN' } };
    }
    circuitState.halfOpenAttempts++;
  }
  
  if (response && response.error) {
    circuitState.failures++;
    circuitState.lastFailure = now;
    if (circuitState.failures >= THRESHOLD) {
      circuitState.state = 'OPEN';
      return { action: 'DENY', reason: 'Circuit breaker OPENED due to failures', metadata: { state: 'OPEN', failures: circuitState.failures } };
    }
  } else if (response && !response.error && circuitState.state === 'HALF_OPEN') {
    circuitState.state = 'CLOSED';
    circuitState.failures = 0;
  }
  
  return { action: 'ALLOW', reason: 'Circuit breaker ' + circuitState.state, metadata: { state: circuitState.state, failures: circuitState.failures } };
}`,
    documentation: '## Circuit Breaker\\n\\nProtects against cascading failures using the circuit breaker pattern.\\n\\n### States\\n- **CLOSED**: Normal operation\\n- **OPEN**: Blocking requests\\n- **HALF_OPEN**: Testing recovery\\n\\n### Best Practices\\n1. Set threshold based on expected failure rate\\n2. Use appropriate timeout for recovery\\n3. Monitor circuit state changes\\n4. Combine with fallback strategies',
    examples: [
      { title: 'Sensitive circuit', description: 'Quick failure detection', parameters: { failureThreshold: 3, timeout: 30000, halfOpenRequests: 2 }, expectedBehavior: 'Opens after 3 failures, 30s timeout' },
      { title: 'Tolerant circuit', description: 'Allow more failures', parameters: { failureThreshold: 10, timeout: 120000, halfOpenRequests: 5 }, expectedBehavior: 'Opens after 10 failures, 2min timeout' }
    ]
  },

  // 14. Retry Strategy
  {
    id: 'retry-strategy',
    name: 'Retry Strategy',
    category: 'reliability',
    difficulty: 'intermediate',
    description: 'Intelligent retry logic with exponential backoff for transient failures',
    longDescription: 'Implements smart retry logic with exponential backoff, jitter, and configurable retry conditions to handle transient failures gracefully.',
    tags: ['retry', 'reliability', 'resilience', 'backoff'],
    complianceFrameworks: [],
    parameters: [
      { name: 'maxRetries', type: 'number', description: 'Maximum retry attempts', defaultValue: 3, required: true, validation: { min: 1, max: 10 } },
      { name: 'initialDelay', type: 'number', description: 'Initial delay in ms', defaultValue: 1000, required: true, validation: { min: 100, max: 10000 } },
      { name: 'maxDelay', type: 'number', description: 'Maximum delay in ms', defaultValue: 30000, required: true, validation: { min: 1000, max: 300000 } }
    ],
    code: `// Retry Strategy Policy
export default function retryStrategyPolicy(request, context, response) {
  const MAX_RETRIES = {{maxRetries}};
  const INITIAL_DELAY = {{initialDelay}};
  const MAX_DELAY = {{maxDelay}};
  
  const attempt = context.retryAttempt || 0;
  const lastError = context.lastError;
  
  const retryableErrors = ['timeout', 'rate_limit', 'server_error', 'network_error'];
  const shouldRetry = lastError && retryableErrors.includes(lastError.type);
  
  if (shouldRetry && attempt < MAX_RETRIES) {
    const delay = Math.min(INITIAL_DELAY * Math.pow(2, attempt), MAX_DELAY);
    const jitter = Math.random() * delay * 0.1;
    const totalDelay = delay + jitter;
    
    return {
      action: 'RETRY',
      reason: 'Retrying after ' + lastError.type + ' (attempt ' + (attempt + 1) + '/' + MAX_RETRIES + ')',
      retryAfter: totalDelay,
      metadata: { attempt: attempt + 1, maxRetries: MAX_RETRIES, delay: Math.ceil(totalDelay), errorType: lastError.type }
    };
  }
  
  if (attempt >= MAX_RETRIES) {
    return {
      action: 'DENY',
      reason: 'Max retries (' + MAX_RETRIES + ') exceeded',
      metadata: { attempts: attempt, lastError: lastError?.message }
    };
  }
  
  return { action: 'ALLOW', reason: 'Request proceeding', metadata: { attempt, retriesAvailable: MAX_RETRIES } };
}`,
    documentation: '## Retry Strategy\\n\\nHandles transient failures with intelligent retry logic and exponential backoff.\\n\\n### Features\\n- Exponential backoff\\n- Jitter to prevent thundering herd\\n- Configurable retry conditions\\n\\n### Retryable Errors\\n- Timeouts\\n- Rate limits\\n- Server errors (5xx)\\n- Network errors\\n\\n### Best Practices\\n1. Use 3-5 retries for most cases\\n2. Set reasonable max delay\\n3. Monitor retry rates\\n4. Combine with circuit breaker',
    examples: [
      { title: 'Aggressive retry', description: 'Quick retries for transient issues', parameters: { maxRetries: 5, initialDelay: 500, maxDelay: 10000 }, expectedBehavior: '5 retries, 0.5s-10s delays' },
      { title: 'Conservative retry', description: 'Fewer retries with longer delays', parameters: { maxRetries: 2, initialDelay: 2000, maxDelay: 60000 }, expectedBehavior: '2 retries, 2s-60s delays' }
    ]
  },

  // 15. Load Balancing
  {
    id: 'load-balancing',
    name: 'Load Balancing',
    category: 'performance',
    difficulty: 'advanced',
    description: 'Distribute requests across multiple endpoints for optimal performance',
    longDescription: 'Implements intelligent load balancing across multiple AI provider endpoints using various algorithms including round-robin, least-connections, and weighted distribution.',
    tags: ['load-balancing', 'performance', 'distribution', 'scaling'],
    complianceFrameworks: ['SOC2-CC5.2'],
    parameters: [
      { name: 'algorithm', type: 'string', description: 'Load balancing algorithm', defaultValue: 'least-connections', required: true, validation: { options: ['round-robin', 'least-connections', 'weighted', 'random'] } },
      { name: 'endpoints', type: 'array', description: 'Available endpoints', defaultValue: ['endpoint-1', 'endpoint-2', 'endpoint-3'], required: true },
      { name: 'healthCheckEnabled', type: 'boolean', description: 'Enable health checks', defaultValue: true, required: true }
    ],
    code: `// Load Balancing Policy
const endpointStats = new Map();

export default function loadBalancingPolicy(request, context, response) {
  const ALGORITHM = {{algorithm}};
  const ENDPOINTS = {{endpoints}};
  const HEALTH_CHECK = {{healthCheckEnabled}};
  
  const availableEndpoints = HEALTH_CHECK 
    ? ENDPOINTS.filter(ep => checkEndpointHealth(ep))
    : ENDPOINTS;
  
  if (availableEndpoints.length === 0) {
    return { action: 'DENY', reason: 'No healthy endpoints available', metadata: { totalEndpoints: ENDPOINTS.length } };
  }
  
  let selectedEndpoint;
  
  if (ALGORITHM === 'round-robin') {
    const index = (context.requestCount || 0) % availableEndpoints.length;
    selectedEndpoint = availableEndpoints[index];
  } else if (ALGORITHM === 'least-connections') {
    selectedEndpoint = availableEndpoints.reduce((min, ep) => {
      const connections = endpointStats.get(ep)?.connections || 0;
      const minConnections = endpointStats.get(min)?.connections || 0;
      return connections < minConnections ? ep : min;
    });
  } else if (ALGORITHM === 'weighted') {
    const weights = availableEndpoints.map(ep => endpointStats.get(ep)?.weight || 1);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;
    for (let i = 0; i < availableEndpoints.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        selectedEndpoint = availableEndpoints[i];
        break;
      }
    }
  } else if (ALGORITHM === 'random') {
    selectedEndpoint = availableEndpoints[Math.floor(Math.random() * availableEndpoints.length)];
  }
  
  if (!endpointStats.has(selectedEndpoint)) {
    endpointStats.set(selectedEndpoint, { connections: 0, requests: 0, weight: 1 });
  }
  const stats = endpointStats.get(selectedEndpoint);
  stats.connections++;
  stats.requests++;
  
  return {
    action: 'ALLOW',
    reason: 'Routed to ' + selectedEndpoint + ' via ' + ALGORITHM,
    routeTo: selectedEndpoint,
    metadata: { algorithm: ALGORITHM, endpoint: selectedEndpoint, availableEndpoints: availableEndpoints.length, connections: stats.connections }
  };
}`,
    documentation: '## Load Balancing\\n\\nDistributes requests across multiple endpoints for optimal performance and reliability.\\n\\n### Algorithms\\n- **Round-Robin**: Even distribution\\n- **Least-Connections**: Route to least busy\\n- **Weighted**: Capacity-based distribution\\n- **Random**: Random selection\\n\\n### Features\\n- Health checking\\n- Connection tracking\\n- Automatic failover\\n\\n### Best Practices\\n1. Use least-connections for varying workloads\\n2. Enable health checks\\n3. Monitor endpoint performance\\n4. Set appropriate weights',
    examples: [
      { title: 'Round-robin distribution', description: 'Even distribution across endpoints', parameters: { algorithm: 'round-robin', endpoints: ['us-east', 'us-west', 'eu-west'], healthCheckEnabled: true }, expectedBehavior: 'Distributes evenly across 3 endpoints' },
      { title: 'Least-connections', description: 'Route to least busy endpoint', parameters: { algorithm: 'least-connections', endpoints: ['endpoint-1', 'endpoint-2'], healthCheckEnabled: true }, expectedBehavior: 'Routes to endpoint with fewest connections' }
    ]
  }
];
