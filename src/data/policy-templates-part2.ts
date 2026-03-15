// Policy Template Library - Part 2
// Additional enterprise-ready policy templates

import type { PolicyTemplate } from '../types/policy-template';

export const policyTemplatesPart2: PolicyTemplate[] = [
  // 6. Multi-Provider Routing
  {
    id: 'multi-provider-routing',
    name: 'Multi-Provider Routing',
    category: 'routing',
    difficulty: 'intermediate',
    description: 'Intelligently route requests across multiple AI providers based on cost, latency, and availability',
    longDescription: `Smart routing logic that distributes requests across OpenAI, Anthropic, Google, and other providers based on configurable criteria including cost optimization, latency requirements, and provider availability.`,
    tags: ['routing', 'multi-provider', 'optimization', 'failover'],
    complianceFrameworks: ['SOC2-CC5.2'],
    parameters: [
      {
        name: 'strategy',
        type: 'string',
        description: 'Routing strategy',
        defaultValue: 'cost-optimized',
        required: true,
        validation: { options: ['cost-optimized', 'latency-optimized', 'round-robin', 'weighted'] },
      },
      {
        name: 'providers',
        type: 'array',
        description: 'Enabled providers',
        defaultValue: ['openai', 'anthropic', 'gemini'],
        required: true,
      },
      {
        name: 'fallbackEnabled',
        type: 'boolean',
        description: 'Enable automatic fallback',
        defaultValue: true,
        required: true,
      },
    ],
    code: `// Multi-Provider Routing Policy
// Routes requests to optimal provider based on strategy

export default function multiProviderRoutingPolicy(request, context, response) {
  const STRATEGY = {{strategy}};
  const PROVIDERS = {{providers}};
  const FALLBACK_ENABLED = {{fallbackEnabled}};
  
  // Get provider availability and metrics
  const providerMetrics = PROVIDERS.map(provider => ({
    provider,
    available: checkProviderAvailability(provider),
    avgLatency: getProviderLatency(provider),
    costPerToken: getProviderCost(provider, request.model),
    currentLoad: getProviderLoad(provider)
  })).filter(p => p.available);
  
  if (providerMetrics.length === 0) {
    return {
      action: 'DENY',
      reason: 'No providers available',
      metadata: { providers: PROVIDERS, allDown: true }
    };
  }
  
  let selectedProvider;
  
  if (STRATEGY === 'cost-optimized') {
    selectedProvider = providerMetrics.reduce((min, p) => 
      p.costPerToken < min.costPerToken ? p : min
    );
  } else if (STRATEGY === 'latency-optimized') {
    selectedProvider = providerMetrics.reduce((min, p) => 
      p.avgLatency < min.avgLatency ? p : min
    );
  } else if (STRATEGY === 'round-robin') {
    const index = (context.requestCount || 0) % providerMetrics.length;
    selectedProvider = providerMetrics[index];
  } else if (STRATEGY === 'weighted') {
    // Weighted by inverse load
    const weights = providerMetrics.map(p => 1 / (p.currentLoad + 1));
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const random = Math.random() * totalWeight;
    let cumulative = 0;
    for (let i = 0; i < providerMetrics.length; i++) {
      cumulative += weights[i];
      if (random <= cumulative) {
        selectedProvider = providerMetrics[i];
        break;
      }
    }
  }
  
  return {
    action: 'ALLOW',
    reason: \`Routed to \${selectedProvider.provider} via \${STRATEGY} strategy\`,
    routeTo: selectedProvider.provider,
    metadata: {
      strategy: STRATEGY,
      selectedProvider: selectedProvider.provider,
      estimatedCost: selectedProvider.costPerToken,
      estimatedLatency: selectedProvider.avgLatency,
      fallbackEnabled: FALLBACK_ENABLED,
      alternativeProviders: providerMetrics
        .filter(p => p.provider !== selectedProvider.provider)
        .map(p => p.provider)
    }
  };
}`,
    documentation: `
## Multi-Provider Routing

### Overview
Intelligently routes AI requests across multiple providers to optimize for cost, latency, or load distribution.

### Routing Strategies
- **cost-optimized**: Route to cheapest provider
- **latency-optimized**: Route to fastest provider
- **round-robin**: Distribute evenly across providers
- **weighted**: Load-based distribution

### Supported Providers
- OpenAI (GPT-4, GPT-3.5)
- Anthropic (Claude)
- Google (Gemini)
- AWS Bedrock
- Azure OpenAI

### Best Practices
1. Enable fallback for high availability
2. Use cost-optimized for batch processing
3. Use latency-optimized for real-time apps
4. Monitor provider performance metrics
5. Set up health checks for all providers
`,
    examples: [
      {
        title: 'Cost optimization',
        description: 'Always route to cheapest provider',
        parameters: {
          strategy: 'cost-optimized',
          providers: ['openai', 'anthropic', 'gemini'],
          fallbackEnabled: true,
        },
        expectedBehavior: 'Routes to provider with lowest cost per token',
      },
      {
        title: 'Low latency routing',
        description: 'Optimize for response time',
        parameters: {
          strategy: 'latency-optimized',
          providers: ['openai', 'anthropic'],
          fallbackEnabled: true,
        },
        expectedBehavior: 'Routes to provider with lowest average latency',
      },
    ],
  },

  // 7. Compliance Audit Logging
  {
    id: 'compliance-audit-logging',
    name: 'Compliance Audit Logging',
    category: 'compliance',
    difficulty: 'intermediate',
    description: 'Comprehensive audit logging for compliance with GDPR, HIPAA, SOC2, and other regulations',
    longDescription: `Captures detailed audit logs of all AI interactions with automatic PII redaction, tamper-proof logging, and compliance-ready export formats. Supports GDPR, HIPAA, SOC2, and ISO 27001 requirements.`,
    tags: ['audit', 'compliance', 'logging', 'gdpr', 'hipaa', 'soc2'],
    complianceFrameworks: ['GDPR-Article-30', 'HIPAA-164.312', 'SOC2-CC5.2', 'ISO-27001-A.12.4'],
    parameters: [
      {
        name: 'logLevel',
        type: 'string',
        description: 'Logging detail level',
        defaultValue: 'detailed',
        required: true,
        validation: { options: ['minimal', 'standard', 'detailed'] },
      },
      {
        name: 'redactPII',
        type: 'boolean',
        description: 'Automatically redact PII from logs',
        defaultValue: true,
        required: true,
      },
      {
        name: 'retentionDays',
        type: 'number',
        description: 'Log retention period in days',
        defaultValue: 90,
        required: true,
        validation: { min: 1, max: 2555 },
      },
    ],
    code: `// Compliance Audit Logging Policy
// Comprehensive audit logging for regulatory compliance

export default function complianceAuditPolicy(request, context, response) {
  const LOG_LEVEL = {{logLevel}};
  const REDACT_PII = {{redactPII}};
  const RETENTION_DAYS = {{retentionDays}};
  
  // Build audit log entry
  const auditEntry = {
    timestamp: new Date().toISOString(),
    requestId: context.requestId || generateUUID(),
    userId: context.userId || 'anonymous',
    action: 'ai_request',
    provider: request.provider,
    model: request.model,
    metadata: {}
  };
  
  // Add details based on log level
  if (LOG_LEVEL === 'minimal') {
    auditEntry.metadata = {
      provider: request.provider,
      model: request.model,
      timestamp: auditEntry.timestamp
    };
  } else if (LOG_LEVEL === 'standard') {
    auditEntry.metadata = {
      provider: request.provider,
      model: request.model,
      promptLength: request.prompt.length,
      responseLength: response?.content?.length || 0,
      parameters: request.parameters,
      cost: response?.cost || 0
    };
  } else if (LOG_LEVEL === 'detailed') {
    auditEntry.metadata = {
      provider: request.provider,
      model: request.model,
      prompt: REDACT_PII ? redactPII(request.prompt) : request.prompt,
      response: REDACT_PII && response ? redactPII(response.content) : response?.content,
      parameters: request.parameters,
      cost: response?.cost || 0,
      latency: response?.latency || 0,
      tokensUsed: response?.tokensUsed || 0,
      userAgent: context.userAgent,
      ipAddress: REDACT_PII ? hashIP(context.ipAddress) : context.ipAddress
    };
  }
  
  // Add compliance metadata
  auditEntry.compliance = {
    retentionUntil: new Date(Date.now() + RETENTION_DAYS * 86400000).toISOString(),
    piiRedacted: REDACT_PII,
    frameworks: ['GDPR', 'SOC2', 'ISO27001']
  };
  
  // Store audit log (immutable)
  storeAuditLog(auditEntry);
  
  return {
    action: 'ALLOW',
    reason: 'Request logged for compliance',
    metadata: {
      auditId: auditEntry.requestId,
      logLevel: LOG_LEVEL,
      retentionDays: RETENTION_DAYS,
      piiRedacted: REDACT_PII
    }
  };
}`,
    documentation: `
## Compliance Audit Logging

### Overview
Provides comprehensive, tamper-proof audit logging to meet regulatory compliance requirements including GDPR, HIPAA, SOC2, and ISO 27001.

### Log Levels
- **Minimal**: Basic metadata only
- **Standard**: Includes parameters and metrics
- **Detailed**: Full request/response with PII redaction

### Compliance Features
- Automatic PII redaction
- Immutable log storage
- Configurable retention periods
- Tamper-proof timestamps
- Export in compliance-ready formats

### Supported Regulations
- **GDPR**: Article 30 (Records of processing)
- **HIPAA**: 164.312 (Technical safeguards)
- **SOC2**: CC5.2 (Logging and monitoring)
- **ISO 27001**: A.12.4 (Logging and monitoring)

### Best Practices
1. Always enable PII redaction
2. Set retention based on regulatory requirements
3. Use detailed logging for high-risk operations
4. Regularly export logs for external storage
5. Implement log integrity verification
`,
    examples: [
      {
        title: 'GDPR compliance',
        description: 'GDPR-compliant logging with PII redaction',
        parameters: {
          logLevel: 'detailed',
          redactPII: true,
          retentionDays: 90,
        },
        expectedBehavior: 'Logs all interactions with PII redacted, 90-day retention',
      },
      {
        title: 'HIPAA compliance',
        description: 'HIPAA-compliant logging for healthcare',
        parameters: {
          logLevel: 'detailed',
          redactPII: true,
          retentionDays: 2555,
        },
        expectedBehavior: 'Detailed logs with 7-year retention for HIPAA',
      },
    ],
  },

  // 8. RBAC Enforcement
  {
    id: 'rbac-enforcement',
    name: 'RBAC Enforcement',
    category: 'security',
    difficulty: 'advanced',
    description: 'Role-based access control for AI features based on user roles and permissions',
    longDescription: `Implements fine-grained role-based access control (RBAC) for AI features, models, and capabilities. Supports hierarchical roles, permission inheritance, and dynamic permission evaluation.`,
    tags: ['rbac', 'access-control', 'permissions', 'authorization'],
    complianceFrameworks: ['SOC2-CC6.1', 'ISO-27001-A.9.2', 'NIST-AI-RMF-GOVERN-1.2'],
    parameters: [
      {
        name: 'roleHierarchy',
        type: 'object',
        description: 'Role hierarchy definition',
        defaultValue: { admin: ['editor', 'viewer'], editor: ['viewer'], viewer: [] },
        required: true,
      },
      {
        name: 'modelPermissions',
        type: 'object',
        description: 'Model access by role',
        defaultValue: { admin: ['*'], editor: ['gpt-4', 'claude-3'], viewer: ['gpt-3.5-turbo'] },
        required: true,
      },
      {
        name: 'strictMode',
        type: 'boolean',
        description: 'Deny access if role not found',
        defaultValue: true,
        required: true,
      },
    ],
    code: `// RBAC Enforcement Policy
// Role-based access control for AI features

export default function rbacEnforcementPolicy(request, context, response) {
  const ROLE_HIERARCHY = {{roleHierarchy}};
  const MODEL_PERMISSIONS = {{modelPermissions}};
  const STRICT_MODE = {{strictMode}};
  
  const userRole = context.userRole || 'viewer';
  const requestedModel = request.model;
  
  // Check if role exists
  if (STRICT_MODE && !MODEL_PERMISSIONS[userRole]) {
    return {
      action: 'DENY',
      reason: \`Unknown role: \${userRole}\`,
      metadata: {
        userRole,
        availableRoles: Object.keys(MODEL_PERMISSIONS),
        strictMode: STRICT_MODE
      }
    };
  }
  
  // Get effective permissions (including inherited)
  const effectivePermissions = new Set();
  const addPermissions = (role) => {
    const permissions = MODEL_PERMISSIONS[role] || [];
    permissions.forEach(p => effectivePermissions.add(p));
    
    // Add inherited permissions
    const inherits = ROLE_HIERARCHY[role] || [];
    inherits.forEach(inheritedRole => addPermissions(inheritedRole));
  };
  
  addPermissions(userRole);
  
  // Check model access
  const hasAccess = effectivePermissions.has('*') || 
                   effectivePermissions.has(requestedModel);
  
  if (!hasAccess) {
    return {
      action: 'DENY',
      reason: \`Role '\${userRole}' does not have access to model '\${requestedModel}'\`,
      metadata: {
        userRole,
        requestedModel,
        allowedModels: Array.from(effectivePermissions),
        suggestion: 'Contact administrator for access'
      }
    };
  }
  
  return {
    action: 'ALLOW',
    reason: \`Access granted for role '\${userRole}'\`,
    metadata: {
      userRole,
      requestedModel,
      effectivePermissions: Array.from(effectivePermissions),
      inheritedFrom: ROLE_HIERARCHY[userRole] || []
    }
  };
}`,
    documentation: `
## RBAC Enforcement

### Overview
Implements role-based access control (RBAC) to restrict AI model and feature access based on user roles and permissions.

### Role Hierarchy
Roles can inherit permissions from other roles:
- **Admin**: Full access to all models
- **Editor**: Access to production models
- **Viewer**: Access to basic models only

### Permission Model
- **Wildcard (*)**: Access to all models
- **Specific Models**: Access to named models
- **Inheritance**: Roles inherit permissions from child roles

### Configuration
- **roleHierarchy**: Defines role inheritance
- **modelPermissions**: Maps roles to allowed models
- **strictMode**: Deny unknown roles vs. default to viewer

### Best Practices
1. Use role hierarchy for permission inheritance
2. Grant least privilege by default
3. Regularly audit role assignments
4. Use strict mode in production
5. Log all access denials for security monitoring
`,
    examples: [
      {
        title: 'Standard RBAC',
        description: 'Three-tier role hierarchy',
        parameters: {
          roleHierarchy: { admin: ['editor', 'viewer'], editor: ['viewer'], viewer: [] },
          modelPermissions: { admin: ['*'], editor: ['gpt-4', 'claude-3'], viewer: ['gpt-3.5-turbo'] },
          strictMode: true,
        },
        expectedBehavior: 'Admins access all, editors access GPT-4/Claude, viewers access GPT-3.5',
      },
      {
        title: 'Permissive RBAC',
        description: 'Allow unknown roles with default permissions',
        parameters: {
          roleHierarchy: { admin: ['user'], user: [] },
          modelPermissions: { admin: ['*'], user: ['gpt-3.5-turbo'] },
          strictMode: false,
        },
        expectedBehavior: 'Unknown roles default to viewer permissions',
      },
    ],
  },

  // 9. Data Residency Compliance
  {
    id: 'data-residency-compliance',
    name: 'Data Residency Compliance',
    category: 'compliance',
    difficulty: 'intermediate',
    description: 'Ensure data processing complies with regional data residency requirements',
    longDescription: `Enforces data residency requirements by routing requests to region-specific AI providers and endpoints. Supports GDPR, CCPA, and other regional data protection regulations.`,
    tags: ['data-residency', 'gdpr', 'compliance', 'regional'],
    complianceFrameworks: ['GDPR-Article-44', 'CCPA', 'ISO-27001-A.18.1'],
    parameters: [
      {
        name: 'allowedRegions',
        type: 'array',
        description: 'Allowed data processing regions',
        defaultValue: ['eu-west', 'eu-central'],
        required: true,
      },
      {
        name: 'userRegion',
        type: 'string',
        description: 'User data region',
        defaultValue: 'eu-west',
        required: true,
      },
      {
        name: 'strictMode',
        type: 'boolean',
        description: 'Block cross-region requests',
        defaultValue: true,
        required: true,
      },
    ],
    code: `// Data Residency Compliance Policy
// Ensures data processing complies with regional requirements

export default function dataResidencyPolicy(request, context, response) {
  const ALLOWED_REGIONS = {{allowedRegions}};
  const USER_REGION = {{userRegion}};
  const STRICT_MODE = {{strictMode}};
  
  // Determine provider region
  const providerRegion = getProviderRegion(request.provider, request.endpoint);
  
  // Check if provider region is allowed
  const isAllowed = ALLOWED_REGIONS.includes(providerRegion);
  
  if (!isAllowed && STRICT_MODE) {
    return {
      action: 'DENY',
      reason: \`Data residency violation: Provider region '\${providerRegion}' not in allowed regions\`,
      metadata: {
        providerRegion,
        allowedRegions: ALLOWED_REGIONS,
        userRegion: USER_REGION,
        compliance: ['GDPR-Article-44', 'Data-Localization']
      }
    };
  }
  
  // Check for cross-region data transfer
  if (providerRegion !== USER_REGION) {
    if (STRICT_MODE) {
      return {
        action: 'DENY',
        reason: \`Cross-region data transfer not allowed: \${USER_REGION} -> \${providerRegion}\`,
        metadata: {
          userRegion: USER_REGION,
          providerRegion,
          violation: 'cross-region-transfer'
        }
      };
    } else {
      return {
        action: 'MONITOR',
        reason: \`Cross-region data transfer detected: \${USER_REGION} -> \${providerRegion}\`,
        metadata: {
          userRegion: USER_REGION,
          providerRegion,
          warning: 'cross-region-transfer'
        }
      };
    }
  }
  
  return {
    action: 'ALLOW',
    reason: \`Data residency compliant: \${providerRegion}\`,
    metadata: {
      providerRegion,
      userRegion: USER_REGION,
      compliant: true,
      frameworks: ['GDPR', 'CCPA']
    }
  };
}`,
    documentation: `
## Data Residency Compliance

### Overview
Ensures AI data processing complies with regional data protection laws by enforcing geographic restrictions on data processing locations.

### Supported Regions
- **EU**: eu-west, eu-central, eu-north
- **US**: us-east, us-west, us-central
- **APAC**: ap-southeast, ap-northeast
- **Other**: ca-central, uk-south

### Compliance Frameworks
- **GDPR**: Article 44 (International transfers)
- **CCPA**: California data protection
- **Data Localization**: Country-specific requirements

### Modes
- **Strict**: Block all cross-region transfers
- **Permissive**: Monitor but allow transfers

### Best Practices
1. Use strict mode for GDPR compliance
2. Configure region based on user location
3. Use regional provider endpoints
4. Monitor cross-region transfers
5. Document data transfer agreements
`,
    examples: [
      {
        title: 'EU GDPR compliance',
        description: 'Strict EU data residency',
        parameters: {
          allowedRegions: ['eu-west', 'eu-central'],
          userRegion: 'eu-west',
          strictMode: true,
        },
        expectedBehavior: 'Only allows EU-based AI providers',
      },
      {
        title: 'Multi-region with monitoring',
        description: 'Allow multiple regions with monitoring',
        parameters: {
          allowedRegions: ['us-east', 'us-west', 'eu-west'],
          userRegion: 'us-east',
          strictMode: false,
        },
        expectedBehavior: 'Allows cross-region but logs transfers',
      },
    ],
  },

  // 10. Model Fallback Strategy
  {
    id: 'model-fallback-strategy',
    name: 'Model Fallback Strategy',
    category: 'reliability',
    difficulty: 'intermediate',
    description: 'Automatic fallback to alternative models when primary model fails or is unavailable',
    longDescription: `Implements intelligent fallback logic to ensure high availability by automatically switching to alternative models when the primary model fails, is rate-limited, or unavailable.`,
    tags: ['fallback', 'reliability', 'high-availability', 'resilience'],
    complianceFrameworks: ['SOC2-CC5.1'],
    parameters: [
      {
        name: 'fallbackChain',
        type: 'array',
        description: 'Ordered list of fallback models',
        defaultValue: ['gpt-4', 'gpt-3.5-turbo', 'claude-3-sonnet'],
        required: true,
      },
      {
        name: 'maxRetries',
        type: 'number',
        description: 'Maximum fallback attempts',
        defaultValue: 3,
        required: true,
        validation: { min: 1, max: 10 },
      },
      {
        name: 'fallbackOnRateLimit',
        type: 'boolean',
        description: 'Fallback on rate limit errors',
        defaultValue: true,
        required: true,
      },
    ],
    code: `// Model Fallback Strategy Policy
// Ensures high availability with automatic model fallback

export default function modelFallbackPolicy(request, context, response) {
  const FALLBACK_CHAIN = {{fallbackChain}};
  const MAX_RETRIES = {{maxRetries}};
  const FALLBACK_ON_RATE_LIMIT = {{fallbackOnRateLimit}};
  
  const currentModel = request.model;
  const attemptCount = context.attemptCount || 0;
  const lastError = context.lastError;
  
  // Check if we should fallback
  const shouldFallback = lastError && (
    lastError.type === 'model_unavailable' ||
    lastError.type === 'timeout' ||
    (FALLBACK_ON_RATE_LIMIT && lastError.type === 'rate_limit')
  );
  
  if (shouldFallback && attemptCount < MAX_RETRIES) {
    // Find current model in chain
    const currentIndex = FALLBACK_CHAIN.indexOf(currentModel);
    
    if (currentIndex === -1 || currentIndex >= FALLBACK_CHAIN.length - 1) {
      return {
        action: 'DENY',
        reason: 'All fallback models exhausted',
        metadata: {
          originalModel: FALLBACK_CHAIN[0],
          attemptedModels: FALLBACK_CHAIN.slice(0, attemptCount + 1),
          lastError: lastError.message
        }
      };
    }
    
    // Get next model in chain
    const nextModel = FALLBACK_CHAIN[currentIndex + 1];
    
    return {
      action: 'ALLOW',
      reason: \`Falling back from \${currentModel} to \${nextModel}\`,
      fallbackTo: nextModel,
      metadata: {
        originalModel: FALLBACK_CHAIN[0],
        currentModel,
        nextModel,
        attemptCount: attemptCount + 1,
        maxRetries: MAX_RETRIES,
        reason: lastError.type
      }
    };
  }
  
  if (attemptCount >= MAX_RETRIES) {
    return {
      action: 'DENY',
      reason: \`Maximum fallback attempts (\${MAX_RETRIES}) exceeded\`,
      metadata: {
        originalModel: FALLBACK_CHAIN[0],
        attemptCount,
        maxRetries: MAX_RETRIES
      }
    };
  }
  
  return {
    action: 'ALLOW',
    reason: 'Primary model available',
    metadata: {
      currentModel,
      fallbackChain: FALLBACK_CHAIN,
      fallbackAvailable: FALLBACK_CHAIN.length > 1
    }
  };
}`,
    documentation: `
## Model Fallback Strategy

### Overview
Provides automatic failover to alternative AI models when the primary model fails, ensuring high availability and resilience.

### Fallback Triggers
- **Model Unavailable**: Provider outage or maintenance
- **Timeout**: Request exceeds timeout threshold
- **Rate Limit**: API rate limit exceeded (optional)
- **Error**: Model-specific errors

### Fallback Chain
Models are tried in order until one succeeds:
1. Primary model (e.g., GPT-4)
2. Secondary model (e.g., GPT-3.5-Turbo)
3. Tertiary model (e.g., Claude-3-Sonnet)

### Configuration
- **fallbackChain**: Ordered list of models to try
- **maxRetries**: Maximum fallback attempts
- **fallbackOnRateLimit**: Whether to fallback on rate limits

### Best Practices
1. Order models by capability (best to good)
2. Include models from different providers
3. Set reasonable retry limits (2-3)
4. Monitor fallback frequency
5. Alert on repeated fallbacks
`,
    examples: [
      {
        title: 'Multi-provider fallback',
        description: 'Fallback across different providers',
        parameters: {
          fallbackChain: ['gpt-4', 'claude-3-opus', 'gemini-pro'],
          maxRetries: 3,
          fallbackOnRateLimit: true,
        },
        expectedBehavior: 'Tries GPT-4, then Claude, then Gemini',
      },
      {
        title: 'Same-provider fallback',
        description: 'Fallback within OpenAI models',
        parameters: {
          fallbackChain: ['gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
          maxRetries: 2,
          fallbackOnRateLimit: false,
        },
        expectedBehavior: 'Tries GPT-4 variants, skips rate limit fallback',
      },
    ],
  },
];
