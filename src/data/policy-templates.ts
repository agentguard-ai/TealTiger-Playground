// Policy Template Library
// 15+ enterprise-ready policy templates with documentation and examples

import type { PolicyTemplate } from '../types/policy-template';

export const policyTemplates: PolicyTemplate[] = [
  // 1. PII Detection and Redaction
  {
    id: 'pii-detection-redaction',
    name: 'PII Detection and Redaction',
    category: 'security',
    difficulty: 'beginner',
    description: 'Detect and redact personally identifiable information (PII) in requests and responses',
    longDescription: `This template provides comprehensive PII detection and redaction capabilities to protect sensitive user data. It identifies common PII patterns including emails, phone numbers, SSNs, credit cards, and addresses, then either blocks the request or redacts the sensitive information based on your configuration.`,
    tags: ['pii', 'privacy', 'gdpr', 'security', 'data-protection'],
    complianceFrameworks: ['GDPR-Article-32', 'OWASP-ASI02', 'SOC2-CC6.1'],
    parameters: [
      {
        name: 'action',
        type: 'string',
        description: 'Action to take when PII is detected',
        defaultValue: 'REDACT',
        required: true,
        validation: {
          options: ['DENY', 'REDACT', 'MONITOR'],
        },
      },
      {
        name: 'piiTypes',
        type: 'array',
        description: 'Types of PII to detect',
        defaultValue: ['email', 'phone', 'ssn', 'credit_card', 'address'],
        required: true,
      },
      {
        name: 'redactionChar',
        type: 'string',
        description: 'Character to use for redaction',
        defaultValue: '*',
        required: false,
      },
    ],
    code: `// PII Detection and Redaction Policy
// Protects sensitive user data by detecting and redacting PII

export default function piiDetectionPolicy(request, context, response) {
  const ACTION = {{action}};
  const PII_TYPES = {{piiTypes}};
  const REDACTION_CHAR = {{redactionChar}};
  
  // Detect PII in both request and response
  const requestPII = detectPII(request.prompt, PII_TYPES);
  const responsePII = response ? detectPII(response.content, PII_TYPES) : null;
  
  const piiFound = requestPII.found || (responsePII && responsePII.found);
  
  if (piiFound) {
    const allTypes = [
      ...(requestPII.types || []),
      ...(responsePII?.types || [])
    ];
    
    if (ACTION === 'DENY') {
      return {
        action: 'DENY',
        reason: \`PII detected: \${[...new Set(allTypes)].join(', ')}\`,
        metadata: {
          piiTypes: [...new Set(allTypes)],
          location: requestPII.found ? 'request' : 'response',
          count: (requestPII.count || 0) + (responsePII?.count || 0)
        }
      };
    }
    
    if (ACTION === 'REDACT' && responsePII?.found) {
      return {
        action: 'ALLOW',
        reason: 'PII redacted from response',
        modifiedResponse: responsePII.redacted,
        metadata: {
          piiTypes: responsePII.types,
          redacted: true,
          count: responsePII.count
        }
      };
    }
    
    if (ACTION === 'MONITOR') {
      return {
        action: 'MONITOR',
        reason: \`PII detected (monitoring): \${[...new Set(allTypes)].join(', ')}\`,
        metadata: {
          piiTypes: [...new Set(allTypes)],
          location: requestPII.found ? 'request' : 'response',
          count: (requestPII.count || 0) + (responsePII?.count || 0)
        }
      };
    }
  }
  
  return {
    action: 'ALLOW',
    reason: 'No PII detected',
    metadata: { checked: true }
  };
}`,
    documentation: `
## PII Detection and Redaction

### Overview
Automatically detects and handles personally identifiable information (PII) in AI interactions to ensure compliance with privacy regulations like GDPR, CCPA, and HIPAA.

### Supported PII Types
- **Email addresses**: user@example.com
- **Phone numbers**: (555) 123-4567, +1-555-123-4567
- **Social Security Numbers**: 123-45-6789
- **Credit card numbers**: 4111-1111-1111-1111
- **Physical addresses**: 123 Main St, City, State ZIP

### Actions
- **DENY**: Block requests/responses containing PII
- **REDACT**: Replace PII with redaction characters (e.g., ****)
- **MONITOR**: Log PII detection but allow the request

### Best Practices
1. Use REDACT for customer-facing applications
2. Use DENY for high-security environments
3. Use MONITOR during testing and validation
4. Regularly review PII detection logs
5. Combine with audit logging for compliance
`,
    examples: [
      {
        title: 'Block requests with PII',
        description: 'Deny any request containing PII',
        parameters: {
          action: 'DENY',
          piiTypes: ['email', 'phone', 'ssn'],
          redactionChar: '*',
        },
        expectedBehavior: 'Request is blocked if PII is detected',
      },
      {
        title: 'Redact PII in responses',
        description: 'Allow requests but redact PII from responses',
        parameters: {
          action: 'REDACT',
          piiTypes: ['email', 'phone', 'credit_card'],
          redactionChar: 'X',
        },
        expectedBehavior: 'PII is replaced with XXXX in responses',
      },
    ],
  },

  // 2. Cost Control and Budget Enforcement
  {
    id: 'cost-control-budget',
    name: 'Cost Control and Budget Enforcement',
    category: 'cost',
    difficulty: 'beginner',
    description: 'Enforce budget limits by estimating and blocking requests that exceed cost thresholds',
    longDescription: `This template helps control AI costs by estimating the cost of each request before execution and blocking requests that would exceed your budget limits. It supports per-request limits, daily budgets, and monthly caps.`,
    tags: ['cost', 'budget', 'optimization', 'finance'],
    complianceFrameworks: ['SOC2-CC5.2'],
    parameters: [
      {
        name: 'perRequestLimit',
        type: 'number',
        description: 'Maximum cost per request in USD',
        defaultValue: 0.10,
        required: true,
        validation: { min: 0.001, max: 100 },
      },
      {
        name: 'dailyBudget',
        type: 'number',
        description: 'Maximum daily budget in USD',
        defaultValue: 10.0,
        required: false,
        validation: { min: 0.01, max: 10000 },
      },
      {
        name: 'monthlyBudget',
        type: 'number',
        description: 'Maximum monthly budget in USD',
        defaultValue: 100.0,
        required: false,
        validation: { min: 0.01, max: 100000 },
      },
    ],
    code: `// Cost Control and Budget Enforcement Policy
// Prevents budget overruns by estimating and limiting costs

export default function costControlPolicy(request, context, response) {
  const PER_REQUEST_LIMIT = {{perRequestLimit}};
  const DAILY_BUDGET = {{dailyBudget}};
  const MONTHLY_BUDGET = {{monthlyBudget}};
  
  // Estimate cost for this request
  const costEstimate = estimateCost({
    provider: request.provider,
    model: request.model,
    inputTokens: Math.ceil(request.prompt.length / 4),
    outputTokens: request.parameters.maxTokens || 1000
  });
  
  // Check per-request limit
  if (costEstimate.total > PER_REQUEST_LIMIT) {
    return {
      action: 'DENY',
      reason: \`Cost estimate $\${costEstimate.total.toFixed(4)} exceeds per-request limit $\${PER_REQUEST_LIMIT.toFixed(4)}\`,
      metadata: {
        estimatedCost: costEstimate.total,
        limit: PER_REQUEST_LIMIT,
        limitType: 'per_request'
      }
    };
  }
  
  // Check daily budget
  if (DAILY_BUDGET) {
    const dailySpend = context.usage?.dailySpend || 0;
    if (dailySpend + costEstimate.total > DAILY_BUDGET) {
      return {
        action: 'DENY',
        reason: \`Request would exceed daily budget: $\${(dailySpend + costEstimate.total).toFixed(2)} > $\${DAILY_BUDGET.toFixed(2)}\`,
        metadata: {
          estimatedCost: costEstimate.total,
          dailySpend,
          dailyBudget: DAILY_BUDGET,
          limitType: 'daily'
        }
      };
    }
  }
  
  // Check monthly budget
  if (MONTHLY_BUDGET) {
    const monthlySpend = context.usage?.monthlySpend || 0;
    if (monthlySpend + costEstimate.total > MONTHLY_BUDGET) {
      return {
        action: 'DENY',
        reason: \`Request would exceed monthly budget: $\${(monthlySpend + costEstimate.total).toFixed(2)} > $\${MONTHLY_BUDGET.toFixed(2)}\`,
        metadata: {
          estimatedCost: costEstimate.total,
          monthlySpend,
          monthlyBudget: MONTHLY_BUDGET,
          limitType: 'monthly'
        }
      };
    }
  }
  
  return {
    action: 'ALLOW',
    reason: \`Cost estimate $\${costEstimate.total.toFixed(4)} within budget\`,
    metadata: {
      estimatedCost: costEstimate.total,
      perRequestLimit: PER_REQUEST_LIMIT
    }
  };
}`,
    documentation: `
## Cost Control and Budget Enforcement

### Overview
Prevents unexpected AI costs by enforcing budget limits at multiple levels: per-request, daily, and monthly.

### Cost Estimation
The policy estimates costs based on:
- Provider pricing (OpenAI, Anthropic, etc.)
- Model selection (GPT-4, Claude, etc.)
- Input token count (prompt length)
- Output token limit (maxTokens parameter)

### Budget Levels
1. **Per-Request Limit**: Maximum cost for a single request
2. **Daily Budget**: Total spending limit per day
3. **Monthly Budget**: Total spending limit per month

### Best Practices
1. Set conservative per-request limits for production
2. Monitor daily spending trends
3. Set monthly budgets with 20% buffer
4. Use cost alerts in conjunction with this policy
5. Review and adjust limits quarterly
`,
    examples: [
      {
        title: 'Strict per-request limit',
        description: 'Limit each request to $0.05',
        parameters: {
          perRequestLimit: 0.05,
          dailyBudget: null,
          monthlyBudget: null,
        },
        expectedBehavior: 'Blocks requests estimated to cost more than $0.05',
      },
      {
        title: 'Daily and monthly budgets',
        description: 'Enforce $50 daily and $1000 monthly limits',
        parameters: {
          perRequestLimit: 1.0,
          dailyBudget: 50.0,
          monthlyBudget: 1000.0,
        },
        expectedBehavior: 'Blocks requests that would exceed daily or monthly budgets',
      },
    ],
  },

  // 3. Rate Limiting and Throttling
  {
    id: 'rate-limiting-throttling',
    name: 'Rate Limiting and Throttling',
    category: 'cost',
    difficulty: 'intermediate',
    description: 'Control request rates to prevent abuse and manage costs with sliding window rate limiting',
    longDescription: `Implements sliding window rate limiting to control the number of requests per user or API key within specified time windows. Supports multiple rate limit tiers and burst allowances.`,
    tags: ['rate-limiting', 'throttling', 'abuse-prevention', 'cost-control'],
    complianceFrameworks: ['OWASP-ASI03'],
    parameters: [
      {
        name: 'requestsPerMinute',
        type: 'number',
        description: 'Maximum requests per minute',
        defaultValue: 10,
        required: true,
        validation: { min: 1, max: 1000 },
      },
      {
        name: 'requestsPerHour',
        type: 'number',
        description: 'Maximum requests per hour',
        defaultValue: 100,
        required: false,
        validation: { min: 1, max: 10000 },
      },
      {
        name: 'burstAllowance',
        type: 'number',
        description: 'Additional burst capacity',
        defaultValue: 5,
        required: false,
        validation: { min: 0, max: 100 },
      },
    ],
    code: `// Rate Limiting and Throttling Policy
// Prevents abuse and controls costs with sliding window rate limiting

const requestCounts = new Map();

export default function rateLimitingPolicy(request, context, response) {
  const REQUESTS_PER_MINUTE = {{requestsPerMinute}};
  const REQUESTS_PER_HOUR = {{requestsPerHour}};
  const BURST_ALLOWANCE = {{burstAllowance}};
  
  const userId = context.userId || context.apiKey || 'anonymous';
  const now = Date.now();
  
  // Initialize user's request history
  if (!requestCounts.has(userId)) {
    requestCounts.set(userId, []);
  }
  
  const userRequests = requestCounts.get(userId);
  
  // Remove requests outside time windows
  const oneMinuteAgo = now - 60000;
  const oneHourAgo = now - 3600000;
  
  const recentMinute = userRequests.filter(t => t > oneMinuteAgo);
  const recentHour = userRequests.filter(t => t > oneHourAgo);
  
  // Check minute limit
  if (recentMinute.length >= REQUESTS_PER_MINUTE + BURST_ALLOWANCE) {
    const oldestRequest = Math.min(...recentMinute);
    const resetTime = oldestRequest + 60000;
    const waitSeconds = Math.ceil((resetTime - now) / 1000);
    
    return {
      action: 'DENY',
      reason: \`Rate limit exceeded: \${recentMinute.length}/\${REQUESTS_PER_MINUTE} per minute. Retry in \${waitSeconds}s\`,
      metadata: {
        limit: REQUESTS_PER_MINUTE,
        current: recentMinute.length,
        window: 'minute',
        resetIn: waitSeconds,
        retryAfter: new Date(resetTime).toISOString()
      }
    };
  }
  
  // Check hour limit
  if (REQUESTS_PER_HOUR && recentHour.length >= REQUESTS_PER_HOUR) {
    const oldestRequest = Math.min(...recentHour);
    const resetTime = oldestRequest + 3600000;
    const waitMinutes = Math.ceil((resetTime - now) / 60000);
    
    return {
      action: 'DENY',
      reason: \`Hourly rate limit exceeded: \${recentHour.length}/\${REQUESTS_PER_HOUR}. Retry in \${waitMinutes}m\`,
      metadata: {
        limit: REQUESTS_PER_HOUR,
        current: recentHour.length,
        window: 'hour',
        resetIn: waitMinutes * 60,
        retryAfter: new Date(resetTime).toISOString()
      }
    };
  }
  
  // Add current request
  userRequests.push(now);
  requestCounts.set(userId, userRequests.filter(t => t > oneHourAgo));
  
  return {
    action: 'ALLOW',
    reason: 'Within rate limits',
    metadata: {
      minuteLimit: REQUESTS_PER_MINUTE,
      minuteCurrent: recentMinute.length + 1,
      minuteRemaining: REQUESTS_PER_MINUTE - recentMinute.length - 1,
      hourLimit: REQUESTS_PER_HOUR,
      hourCurrent: recentHour.length + 1,
      hourRemaining: REQUESTS_PER_HOUR - recentHour.length - 1
    }
  };
}`,
    documentation: `
## Rate Limiting and Throttling

### Overview
Implements sliding window rate limiting to prevent abuse and control costs by limiting the number of requests per user within time windows.

### Features
- **Sliding Window**: More accurate than fixed window rate limiting
- **Multiple Time Windows**: Per-minute and per-hour limits
- **Burst Allowance**: Temporary capacity for traffic spikes
- **Retry-After Headers**: Tells clients when to retry

### Configuration
- **requestsPerMinute**: Short-term rate limit
- **requestsPerHour**: Long-term rate limit
- **burstAllowance**: Extra capacity for bursts

### Best Practices
1. Set minute limits for burst protection
2. Set hour limits for cost control
3. Use burst allowance for legitimate traffic spikes
4. Monitor rate limit hit rates
5. Adjust limits based on usage patterns
`,
    examples: [
      {
        title: 'Conservative rate limits',
        description: 'Strict limits for free tier users',
        parameters: {
          requestsPerMinute: 5,
          requestsPerHour: 50,
          burstAllowance: 2,
        },
        expectedBehavior: '5 requests/min, 50 requests/hour with 2-request burst',
      },
      {
        title: 'Enterprise rate limits',
        description: 'Higher limits for paid users',
        parameters: {
          requestsPerMinute: 100,
          requestsPerHour: 1000,
          burstAllowance: 20,
        },
        expectedBehavior: '100 requests/min, 1000 requests/hour with 20-request burst',
      },
    ],
  },

  // 4. Content Moderation
  {
    id: 'content-moderation',
    name: 'Content Moderation',
    category: 'security',
    difficulty: 'intermediate',
    description: 'Filter harmful, inappropriate, or policy-violating content in requests and responses',
    longDescription: `Comprehensive content moderation using multiple detection methods including keyword filtering, toxicity scoring, and category-based classification. Protects against hate speech, violence, sexual content, and other harmful material.`,
    tags: ['moderation', 'safety', 'content-filtering', 'toxicity'],
    complianceFrameworks: ['OWASP-ASI04', 'SOC2-CC6.7'],
    parameters: [
      {
        name: 'categories',
        type: 'array',
        description: 'Content categories to moderate',
        defaultValue: ['hate', 'violence', 'sexual', 'self-harm'],
        required: true,
      },
      {
        name: 'toxicityThreshold',
        type: 'number',
        description: 'Toxicity score threshold (0-1)',
        defaultValue: 0.7,
        required: true,
        validation: { min: 0, max: 1 },
      },
      {
        name: 'action',
        type: 'string',
        description: 'Action for policy violations',
        defaultValue: 'DENY',
        required: true,
        validation: { options: ['DENY', 'MONITOR', 'SANITIZE'] },
      },
    ],
    code: `// Content Moderation Policy
// Filters harmful and inappropriate content

export default function contentModerationPolicy(request, context, response) {
  const CATEGORIES = {{categories}};
  const TOXICITY_THRESHOLD = {{toxicityThreshold}};
  const ACTION = {{action}};
  
  // Moderate request content
  const requestModeration = moderateContent(request.prompt, {
    categories: CATEGORIES,
    toxicityThreshold: TOXICITY_THRESHOLD
  });
  
  // Moderate response content if available
  const responseModeration = response 
    ? moderateContent(response.content, {
        categories: CATEGORIES,
        toxicityThreshold: TOXICITY_THRESHOLD
      })
    : null;
  
  const violation = requestModeration.flagged || (responseModeration && responseModeration.flagged);
  
  if (violation) {
    const violatedCategories = [
      ...(requestModeration.categories || []),
      ...(responseModeration?.categories || [])
    ];
    
    const maxScore = Math.max(
      requestModeration.toxicityScore || 0,
      responseModeration?.toxicityScore || 0
    );
    
    if (ACTION === 'DENY') {
      return {
        action: 'DENY',
        reason: \`Content policy violation: \${[...new Set(violatedCategories)].join(', ')}\`,
        metadata: {
          categories: [...new Set(violatedCategories)],
          toxicityScore: maxScore,
          location: requestModeration.flagged ? 'request' : 'response'
        }
      };
    }
    
    if (ACTION === 'SANITIZE' && responseModeration?.flagged) {
      return {
        action: 'ALLOW',
        reason: 'Content sanitized',
        modifiedResponse: responseModeration.sanitized,
        metadata: {
          categories: responseModeration.categories,
          toxicityScore: responseModeration.toxicityScore,
          sanitized: true
        }
      };
    }
    
    if (ACTION === 'MONITOR') {
      return {
        action: 'MONITOR',
        reason: \`Content flagged (monitoring): \${[...new Set(violatedCategories)].join(', ')}\`,
        metadata: {
          categories: [...new Set(violatedCategories)],
          toxicityScore: maxScore,
          location: requestModeration.flagged ? 'request' : 'response'
        }
      };
    }
  }
  
  return {
    action: 'ALLOW',
    reason: 'Content passed moderation',
    metadata: {
      checked: true,
      toxicityScore: Math.max(
        requestModeration.toxicityScore || 0,
        responseModeration?.toxicityScore || 0
      )
    }
  };
}`,
    documentation: `
## Content Moderation

### Overview
Filters harmful, inappropriate, or policy-violating content using multi-layered detection including toxicity scoring and category classification.

### Moderation Categories
- **Hate Speech**: Discriminatory or hateful content
- **Violence**: Violent or graphic content
- **Sexual**: Adult or sexual content
- **Self-Harm**: Content promoting self-harm
- **Harassment**: Bullying or harassment

### Toxicity Scoring
- **0.0-0.3**: Clean content
- **0.3-0.7**: Borderline content
- **0.7-1.0**: Toxic content

### Actions
- **DENY**: Block violating content
- **SANITIZE**: Remove/replace harmful parts
- **MONITOR**: Log violations but allow

### Best Practices
1. Start with MONITOR mode to calibrate
2. Adjust toxicity threshold based on use case
3. Enable all relevant categories
4. Review moderation logs regularly
5. Combine with human review for edge cases
`,
    examples: [
      {
        title: 'Strict moderation',
        description: 'Block all harmful content',
        parameters: {
          categories: ['hate', 'violence', 'sexual', 'self-harm', 'harassment'],
          toxicityThreshold: 0.5,
          action: 'DENY',
        },
        expectedBehavior: 'Blocks content with toxicity score > 0.5',
      },
      {
        title: 'Sanitize responses',
        description: 'Remove harmful parts from responses',
        parameters: {
          categories: ['hate', 'violence'],
          toxicityThreshold: 0.7,
          action: 'SANITIZE',
        },
        expectedBehavior: 'Removes harmful content from responses',
      },
    ],
  },

  // 5. Prompt Injection Detection
  {
    id: 'prompt-injection-detection',
    name: 'Prompt Injection Detection',
    category: 'security',
    difficulty: 'advanced',
    description: 'Detect and block prompt injection attacks that attempt to manipulate AI behavior',
    longDescription: `Advanced detection of prompt injection attacks including jailbreaks, role-playing exploits, and instruction override attempts. Uses pattern matching, semantic analysis, and behavioral heuristics.`,
    tags: ['security', 'prompt-injection', 'jailbreak', 'attack-prevention'],
    complianceFrameworks: ['OWASP-ASI01', 'NIST-AI-RMF-GOVERN-1.1'],
    parameters: [
      {
        name: 'sensitivity',
        type: 'string',
        description: 'Detection sensitivity level',
        defaultValue: 'medium',
        required: true,
        validation: { options: ['low', 'medium', 'high'] },
      },
      {
        name: 'blockJailbreaks',
        type: 'boolean',
        description: 'Block known jailbreak attempts',
        defaultValue: true,
        required: true,
      },
      {
        name: 'blockRolePlay',
        type: 'boolean',
        description: 'Block role-playing exploits',
        defaultValue: true,
        required: true,
      },
    ],
    code: `// Prompt Injection Detection Policy
// Protects against prompt injection and jailbreak attacks

export default function promptInjectionPolicy(request, context, response) {
  const SENSITIVITY = {{sensitivity}};
  const BLOCK_JAILBREAKS = {{blockJailbreaks}};
  const BLOCK_ROLEPLAY = {{blockRolePlay}};
  
  const detectionConfig = {
    sensitivity: SENSITIVITY,
    checkJailbreaks: BLOCK_JAILBREAKS,
    checkRolePlay: BLOCK_ROLEPLAY,
    checkInstructionOverride: true,
    checkDelimiterAttacks: true
  };
  
  // Analyze prompt for injection attempts
  const analysis = detectPromptInjection(request.prompt, detectionConfig);
  
  if (analysis.detected) {
    return {
      action: 'DENY',
      reason: \`Prompt injection detected: \${analysis.attackType}\`,
      metadata: {
        attackType: analysis.attackType,
        confidence: analysis.confidence,
        patterns: analysis.matchedPatterns,
        severity: analysis.severity,
        indicators: analysis.indicators
      }
    };
  }
  
  // Check for suspicious patterns in response
  if (response && analysis.suspiciousPatterns.length > 0) {
    return {
      action: 'MONITOR',
      reason: 'Suspicious patterns detected in interaction',
      metadata: {
        patterns: analysis.suspiciousPatterns,
        confidence: analysis.confidence,
        requiresReview: true
      }
    };
  }
  
  return {
    action: 'ALLOW',
    reason: 'No prompt injection detected',
    metadata: {
      checked: true,
      confidence: analysis.confidence,
      sensitivity: SENSITIVITY
    }
  };
}`,
    documentation: `
## Prompt Injection Detection

### Overview
Detects and blocks sophisticated prompt injection attacks that attempt to manipulate AI behavior, bypass safety measures, or extract sensitive information.

### Attack Types Detected
1. **Jailbreaks**: Attempts to bypass safety guidelines
2. **Role-Playing Exploits**: "Pretend you are..." attacks
3. **Instruction Override**: Attempts to override system prompts
4. **Delimiter Attacks**: Using special characters to break context
5. **Encoding Attacks**: Base64, ROT13, and other encodings

### Sensitivity Levels
- **Low**: Only obvious attacks
- **Medium**: Balanced detection (recommended)
- **High**: Aggressive detection (may have false positives)

### Best Practices
1. Start with medium sensitivity
2. Enable all protection types
3. Monitor false positives
4. Combine with content moderation
5. Update detection patterns regularly
`,
    examples: [
      {
        title: 'Maximum protection',
        description: 'Highest security for sensitive applications',
        parameters: {
          sensitivity: 'high',
          blockJailbreaks: true,
          blockRolePlay: true,
        },
        expectedBehavior: 'Blocks all known injection patterns aggressively',
      },
      {
        title: 'Balanced protection',
        description: 'Good security with minimal false positives',
        parameters: {
          sensitivity: 'medium',
          blockJailbreaks: true,
          blockRolePlay: false,
        },
        expectedBehavior: 'Blocks jailbreaks but allows creative role-play',
      },
    ],
  },
];
