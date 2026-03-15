/**
 * Block Library - Pre-built Policy Blocks
 * 
 * This file contains 30+ pre-built policy blocks organized into 7 categories:
 * - Guards (7 blocks): Security and content detection
 * - Actions (6 blocks): Policy decisions and modifications
 * - Routing (5 blocks): Provider and model selection
 * - Cost Control (4 blocks): Budget and rate limiting
 * - Compliance (3 blocks): Regulatory requirements
 * - Conditional (2 blocks): Logic and branching
 * - Utility (3 blocks): Helper functions
 */

import type { BlockDefinition } from '../types/visual-policy';

/**
 * Guard Blocks - Security and Content Detection (7 blocks)
 */

export const piiDetectionBlock: BlockDefinition = {
  id: 'guard-pii-detection',
  name: 'PII Detection',
  category: 'guards',
  description: 'Detects and optionally redacts personally identifiable information (PII) in requests',
  icon: '🔒',
  parameters: [
    {
      name: 'piiTypes',
      type: 'array',
      label: 'PII Types to Detect',
      description: 'Select which types of PII to detect',
      required: true,
      defaultValue: ['email', 'phone', 'ssn'],
      options: ['email', 'phone', 'ssn', 'credit_card', 'address', 'name', 'date_of_birth'],
      helpText: 'Choose one or more PII types to scan for'
    },
    {
      name: 'threshold',
      type: 'number',
      label: 'Detection Threshold',
      description: 'Confidence threshold for PII detection (0-1)',
      required: true,
      defaultValue: 0.8,
      validation: { min: 0, max: 1 },
      helpText: 'Higher values reduce false positives'
    },
    {
      name: 'redactEnabled',
      type: 'boolean',
      label: 'Enable Redaction',
      description: 'Automatically redact detected PII',
      required: false,
      defaultValue: false,
      helpText: 'When enabled, PII will be replaced with [REDACTED]'
    }
  ],
  inputs: [
    { id: 'in', label: 'Input', type: 'flow', required: true }
  ],
  outputs: [
    { id: 'out', label: 'Output', type: 'flow', required: true },
    { id: 'detected', label: 'PII Detected', type: 'data', dataType: 'boolean', required: false }
  ],
  codeTemplate: `
    // PII Detection
    const piiResult = await detectPII(context.request.content, {
      types: {{piiTypes}},
      threshold: {{threshold}},
      redact: {{redactEnabled}}
    });
    
    if (piiResult.detected) {
      {{onDetectedAction}}
    }
  `,
  tags: ['security', 'pii', 'privacy', 'gdpr'],
  providers: ['openai', 'anthropic', 'gemini', 'bedrock', 'azure', 'cohere', 'mistral'],
  complianceFrameworks: ['GDPR', 'HIPAA', 'SOC2', 'OWASP'],
  estimatedCost: 0.001,
  isCustom: false
};

export const promptInjectionBlock: BlockDefinition = {
  id: 'guard-prompt-injection',
  name: 'Prompt Injection Detection',
  category: 'guards',
  description: 'Detects and blocks prompt injection attacks',
  icon: '🛡️',
  parameters: [
    {
      name: 'sensitivity',
      type: 'enum',
      label: 'Detection Sensitivity',
      description: 'How aggressive the detection should be',
      required: true,
      defaultValue: 'medium',
      options: ['low', 'medium', 'high'],
      helpText: 'Higher sensitivity may increase false positives'
    },
    {
      name: 'blockOnDetection',
      type: 'boolean',
      label: 'Block on Detection',
      description: 'Automatically deny requests with injection attempts',
      required: false,
      defaultValue: true
    }
  ],
  inputs: [
    { id: 'in', label: 'Input', type: 'flow', required: true }
  ],
  outputs: [
    { id: 'out', label: 'Output', type: 'flow', required: true },
    { id: 'threat', label: 'Threat Level', type: 'data', dataType: 'string', required: false }
  ],
  codeTemplate: `
    // Prompt Injection Detection
    const injectionCheck = await detectPromptInjection(context.request.prompt, {
      sensitivity: '{{sensitivity}}'
    });
    
    if (injectionCheck.detected && {{blockOnDetection}}) {
      return { decision: 'deny', reason: 'Prompt injection detected' };
    }
  `,
  tags: ['security', 'injection', 'attack-prevention'],
  providers: ['openai', 'anthropic', 'gemini', 'bedrock', 'azure', 'cohere', 'mistral'],
  complianceFrameworks: ['OWASP', 'SOC2'],
  estimatedCost: 0.002,
  isCustom: false
};

export const contentModerationBlock: BlockDefinition = {
  id: 'guard-content-moderation',
  name: 'Content Moderation',
  category: 'guards',
  description: 'Moderates content for inappropriate or harmful material',
  icon: '🚫',
  parameters: [
    {
      name: 'categories',
      type: 'array',
      label: 'Moderation Categories',
      description: 'Content categories to check',
      required: true,
      defaultValue: ['hate', 'violence', 'sexual'],
      options: ['hate', 'violence', 'sexual', 'self-harm', 'harassment', 'illegal'],
      helpText: 'Select categories to moderate'
    },
    {
      name: 'threshold',
      type: 'number',
      label: 'Threshold',
      description: 'Confidence threshold (0-1)',
      required: true,
      defaultValue: 0.7,
      validation: { min: 0, max: 1 }
    }
  ],
  inputs: [
    { id: 'in', label: 'Input', type: 'flow', required: true }
  ],
  outputs: [
    { id: 'out', label: 'Output', type: 'flow', required: true },
    { id: 'flagged', label: 'Flagged', type: 'data', dataType: 'boolean', required: false }
  ],
  codeTemplate: `
    // Content Moderation
    const moderation = await moderateContent(context.request.content, {
      categories: {{categories}},
      threshold: {{threshold}}
    });
    
    if (moderation.flagged) {
      return { decision: 'deny', reason: 'Content policy violation' };
    }
  `,
  tags: ['security', 'moderation', 'content-safety'],
  providers: ['openai', 'anthropic', 'azure'],
  complianceFrameworks: ['OWASP', 'SOC2'],
  estimatedCost: 0.001,
  isCustom: false
};

export const toxicityDetectionBlock: BlockDefinition = {
  id: 'guard-toxicity-detection',
  name: 'Toxicity Detection',
  category: 'guards',
  description: 'Detects toxic or offensive language in requests',
  icon: '☠️',
  parameters: [
    {
      name: 'threshold',
      type: 'number',
      label: 'Toxicity Threshold',
      description: 'Minimum toxicity score to flag (0-1)',
      required: true,
      defaultValue: 0.75,
      validation: { min: 0, max: 1 }
    },
    {
      name: 'checkResponse',
      type: 'boolean',
      label: 'Check Response',
      description: 'Also check model responses for toxicity',
      required: false,
      defaultValue: false
    }
  ],
  inputs: [
    { id: 'in', label: 'Input', type: 'flow', required: true }
  ],
  outputs: [
    { id: 'out', label: 'Output', type: 'flow', required: true },
    { id: 'score', label: 'Toxicity Score', type: 'data', dataType: 'number', required: false }
  ],
  codeTemplate: `
    // Toxicity Detection
    const toxicity = await detectToxicity(context.request.content, {
      threshold: {{threshold}}
    });
    
    if (toxicity.score > {{threshold}}) {
      return { decision: 'deny', reason: 'Toxic content detected' };
    }
  `,
  tags: ['security', 'toxicity', 'content-safety'],
  providers: ['openai', 'anthropic', 'gemini', 'azure'],
  complianceFrameworks: ['OWASP', 'SOC2'],
  estimatedCost: 0.001,
  isCustom: false
};

export const jailbreakDetectionBlock: BlockDefinition = {
  id: 'guard-jailbreak-detection',
  name: 'Jailbreak Detection',
  category: 'guards',
  description: 'Detects attempts to bypass model safety guardrails',
  icon: '🔓',
  parameters: [
    {
      name: 'patterns',
      type: 'array',
      label: 'Detection Patterns',
      description: 'Jailbreak patterns to detect',
      required: true,
      defaultValue: ['role-play', 'hypothetical', 'ignore-instructions'],
      options: ['role-play', 'hypothetical', 'ignore-instructions', 'dan', 'developer-mode'],
      helpText: 'Common jailbreak techniques'
    }
  ],
  inputs: [
    { id: 'in', label: 'Input', type: 'flow', required: true }
  ],
  outputs: [
    { id: 'out', label: 'Output', type: 'flow', required: true },
    { id: 'detected', label: 'Detected', type: 'data', dataType: 'boolean', required: false }
  ],
  codeTemplate: `
    // Jailbreak Detection
    const jailbreak = await detectJailbreak(context.request.prompt, {
      patterns: {{patterns}}
    });
    
    if (jailbreak.detected) {
      return { decision: 'deny', reason: 'Jailbreak attempt detected' };
    }
  `,
  tags: ['security', 'jailbreak', 'attack-prevention'],
  providers: ['openai', 'anthropic', 'gemini', 'bedrock', 'azure', 'cohere', 'mistral'],
  complianceFrameworks: ['OWASP', 'SOC2'],
  estimatedCost: 0.002,
  isCustom: false
};

export const dataLeakagePreventionBlock: BlockDefinition = {
  id: 'guard-data-leakage',
  name: 'Data Leakage Prevention',
  category: 'guards',
  description: 'Prevents sensitive data from being exposed in responses',
  icon: '🔐',
  parameters: [
    {
      name: 'sensitivePatterns',
      type: 'array',
      label: 'Sensitive Patterns',
      description: 'Data patterns to protect',
      required: true,
      defaultValue: ['api-keys', 'passwords', 'tokens'],
      options: ['api-keys', 'passwords', 'tokens', 'secrets', 'credentials', 'internal-urls'],
      helpText: 'Patterns that should never appear in responses'
    },
    {
      name: 'scanResponses',
      type: 'boolean',
      label: 'Scan Responses',
      description: 'Check model responses for data leakage',
      required: true,
      defaultValue: true
    }
  ],
  inputs: [
    { id: 'in', label: 'Input', type: 'flow', required: true }
  ],
  outputs: [
    { id: 'out', label: 'Output', type: 'flow', required: true },
    { id: 'leaked', label: 'Leakage Detected', type: 'data', dataType: 'boolean', required: false }
  ],
  codeTemplate: `
    // Data Leakage Prevention
    const leakage = await checkDataLeakage(context.response?.content, {
      patterns: {{sensitivePatterns}},
      enabled: {{scanResponses}}
    });
    
    if (leakage.detected) {
      return { decision: 'modify', modifiedResponse: leakage.redactedContent };
    }
  `,
  tags: ['security', 'data-protection', 'privacy'],
  providers: ['openai', 'anthropic', 'gemini', 'bedrock', 'azure', 'cohere', 'mistral'],
  complianceFrameworks: ['GDPR', 'HIPAA', 'SOC2', 'OWASP'],
  estimatedCost: 0.001,
  isCustom: false
};

export const sensitiveTopicFilterBlock: BlockDefinition = {
  id: 'guard-sensitive-topics',
  name: 'Sensitive Topic Filter',
  category: 'guards',
  description: 'Filters requests about sensitive or restricted topics',
  icon: '⚠️',
  parameters: [
    {
      name: 'blockedTopics',
      type: 'array',
      label: 'Blocked Topics',
      description: 'Topics to filter',
      required: true,
      defaultValue: ['politics', 'religion'],
      options: ['politics', 'religion', 'medical-advice', 'legal-advice', 'financial-advice', 'adult-content'],
      helpText: 'Requests about these topics will be blocked'
    },
    {
      name: 'customTopics',
      type: 'string',
      label: 'Custom Topics',
      description: 'Additional topics to block (comma-separated)',
      required: false,
      defaultValue: '',
      placeholder: 'e.g., internal-projects, confidential-data'
    }
  ],
  inputs: [
    { id: 'in', label: 'Input', type: 'flow', required: true }
  ],
  outputs: [
    { id: 'out', label: 'Output', type: 'flow', required: true },
    { id: 'topic', label: 'Detected Topic', type: 'data', dataType: 'string', required: false }
  ],
  codeTemplate: `
    // Sensitive Topic Filter
    const topicCheck = await checkSensitiveTopics(context.request.content, {
      blockedTopics: {{blockedTopics}},
      customTopics: '{{customTopics}}'.split(',').filter(t => t.trim())
    });
    
    if (topicCheck.isBlocked) {
      return { decision: 'deny', reason: \`Sensitive topic detected: \${topicCheck.topic}\` };
    }
  `,
  tags: ['security', 'content-filtering', 'compliance'],
  providers: ['openai', 'anthropic', 'gemini', 'bedrock', 'azure', 'cohere', 'mistral'],
  complianceFrameworks: ['SOC2', 'OWASP'],
  estimatedCost: 0.001,
  isCustom: false
};

/**
 * Action Blocks - Policy Decisions and Modifications (6 blocks)
 */

export const allowRequestBlock: BlockDefinition = {
  id: 'action-allow',
  name: 'Allow Request',
  category: 'actions',
  description: 'Allows the request to proceed',
  icon: '✅',
  parameters: [
    {
      name: 'logDecision',
      type: 'boolean',
      label: 'Log Decision',
      description: 'Log this allow decision',
      required: false,
      defaultValue: true
    },
    {
      name: 'metadata',
      type: 'string',
      label: 'Metadata',
      description: 'Additional metadata to attach',
      required: false,
      defaultValue: '',
      placeholder: 'e.g., reason for allowing'
    }
  ],
  inputs: [
    { id: 'in', label: 'Input', type: 'flow', required: true }
  ],
  outputs: [],
  codeTemplate: `
    // Allow Request
    return {
      decision: 'allow',
      metadata: {
        logged: {{logDecision}},
        note: '{{metadata}}'
      }
    };
  `,
  tags: ['action', 'decision', 'allow'],
  providers: ['openai', 'anthropic', 'gemini', 'bedrock', 'azure', 'cohere', 'mistral'],
  complianceFrameworks: ['OWASP', 'SOC2'],
  estimatedCost: 0,
  isCustom: false
};

export const denyRequestBlock: BlockDefinition = {
  id: 'action-deny',
  name: 'Deny Request',
  category: 'actions',
  description: 'Denies the request with a reason',
  icon: '❌',
  parameters: [
    {
      name: 'reason',
      type: 'string',
      label: 'Denial Reason',
      description: 'Reason for denying the request',
      required: true,
      defaultValue: 'Request denied by policy',
      placeholder: 'e.g., Policy violation detected'
    },
    {
      name: 'logDecision',
      type: 'boolean',
      label: 'Log Decision',
      description: 'Log this deny decision',
      required: false,
      defaultValue: true
    }
  ],
  inputs: [
    { id: 'in', label: 'Input', type: 'flow', required: true }
  ],
  outputs: [],
  codeTemplate: `
    // Deny Request
    return {
      decision: 'deny',
      reason: '{{reason}}',
      metadata: {
        logged: {{logDecision}}
      }
    };
  `,
  tags: ['action', 'decision', 'deny'],
  providers: ['openai', 'anthropic', 'gemini', 'bedrock', 'azure', 'cohere', 'mistral'],
  complianceFrameworks: ['OWASP', 'SOC2'],
  estimatedCost: 0,
  isCustom: false
};

export const modifyRequestBlock: BlockDefinition = {
  id: 'action-modify-request',
  name: 'Modify Request',
  category: 'actions',
  description: 'Modifies the request before sending to the model',
  icon: '✏️',
  parameters: [
    {
      name: 'transformation',
      type: 'enum',
      label: 'Transformation Type',
      description: 'How to modify the request',
      required: true,
      defaultValue: 'append',
      options: ['append', 'prepend', 'replace', 'redact'],
      helpText: 'Choose how to transform the request'
    },
    {
      name: 'content',
      type: 'string',
      label: 'Modification Content',
      description: 'Content to add or use for replacement',
      required: true,
      defaultValue: '',
      placeholder: 'e.g., Additional instructions or replacement text'
    }
  ],
  inputs: [
    { id: 'in', label: 'Input', type: 'flow', required: true }
  ],
  outputs: [
    { id: 'out', label: 'Output', type: 'flow', required: true }
  ],
  codeTemplate: `
    // Modify Request
    const modifiedRequest = transformRequest(context.request, {
      type: '{{transformation}}',
      content: '{{content}}'
    });
    
    context.request = modifiedRequest;
  `,
  tags: ['action', 'modification', 'transform'],
  providers: ['openai', 'anthropic', 'gemini', 'bedrock', 'azure', 'cohere', 'mistral'],
  complianceFrameworks: ['OWASP', 'SOC2'],
  estimatedCost: 0,
  isCustom: false
};

export const modifyResponseBlock: BlockDefinition = {
  id: 'action-modify-response',
  name: 'Modify Response',
  category: 'actions',
  description: 'Modifies the model response before returning',
  icon: '📝',
  parameters: [
    {
      name: 'transformation',
      type: 'enum',
      label: 'Transformation Type',
      description: 'How to modify the response',
      required: true,
      defaultValue: 'filter',
      options: ['filter', 'redact', 'append', 'replace'],
      helpText: 'Choose how to transform the response'
    },
    {
      name: 'pattern',
      type: 'string',
      label: 'Pattern',
      description: 'Pattern to match for transformation',
      required: false,
      defaultValue: '',
      placeholder: 'e.g., regex pattern or keyword'
    }
  ],
  inputs: [
    { id: 'in', label: 'Input', type: 'flow', required: true }
  ],
  outputs: [
    { id: 'out', label: 'Output', type: 'flow', required: true }
  ],
  codeTemplate: `
    // Modify Response
    const modifiedResponse = transformResponse(context.response, {
      type: '{{transformation}}',
      pattern: '{{pattern}}'
    });
    
    return {
      decision: 'modify',
      modifiedResponse
    };
  `,
  tags: ['action', 'modification', 'response'],
  providers: ['openai', 'anthropic', 'gemini', 'bedrock', 'azure', 'cohere', 'mistral'],
  complianceFrameworks: ['OWASP', 'SOC2', 'GDPR'],
  estimatedCost: 0,
  isCustom: false
};

export const logEventBlock: BlockDefinition = {
  id: 'action-log-event',
  name: 'Log Event',
  category: 'actions',
  description: 'Logs an event for audit and monitoring',
  icon: '📋',
  parameters: [
    {
      name: 'severity',
      type: 'enum',
      label: 'Severity Level',
      description: 'Log severity level',
      required: true,
      defaultValue: 'info',
      options: ['debug', 'info', 'warning', 'error', 'critical'],
      helpText: 'Choose appropriate severity'
    },
    {
      name: 'message',
      type: 'string',
      label: 'Log Message',
      description: 'Message to log',
      required: true,
      defaultValue: '',
      placeholder: 'e.g., Policy check completed'
    },
    {
      name: 'includeContext',
      type: 'boolean',
      label: 'Include Context',
      description: 'Include request context in log',
      required: false,
      defaultValue: true
    }
  ],
  inputs: [
    { id: 'in', label: 'Input', type: 'flow', required: true }
  ],
  outputs: [
    { id: 'out', label: 'Output', type: 'flow', required: true }
  ],
  codeTemplate: `
    // Log Event
    await logEvent({
      severity: '{{severity}}',
      message: '{{message}}',
      context: {{includeContext}} ? context : undefined,
      timestamp: new Date()
    });
  `,
  tags: ['action', 'logging', 'audit'],
  providers: ['openai', 'anthropic', 'gemini', 'bedrock', 'azure', 'cohere', 'mistral'],
  complianceFrameworks: ['SOC2', 'HIPAA', 'GDPR', 'OWASP'],
  estimatedCost: 0,
  isCustom: false
};

export const sendAlertBlock: BlockDefinition = {
  id: 'action-send-alert',
  name: 'Send Alert',
  category: 'actions',
  description: 'Sends an alert notification',
  icon: '🔔',
  parameters: [
    {
      name: 'channel',
      type: 'enum',
      label: 'Alert Channel',
      description: 'Where to send the alert',
      required: true,
      defaultValue: 'email',
      options: ['email', 'slack', 'webhook', 'sms'],
      helpText: 'Choose notification channel'
    },
    {
      name: 'message',
      type: 'string',
      label: 'Alert Message',
      description: 'Alert message content',
      required: true,
      defaultValue: '',
      placeholder: 'e.g., Security policy violation detected'
    },
    {
      name: 'priority',
      type: 'enum',
      label: 'Priority',
      description: 'Alert priority level',
      required: true,
      defaultValue: 'medium',
      options: ['low', 'medium', 'high', 'critical']
    }
  ],
  inputs: [
    { id: 'in', label: 'Input', type: 'flow', required: true }
  ],
  outputs: [
    { id: 'out', label: 'Output', type: 'flow', required: true }
  ],
  codeTemplate: `
    // Send Alert
    await sendAlert({
      channel: '{{channel}}',
      message: '{{message}}',
      priority: '{{priority}}',
      timestamp: new Date()
    });
  `,
  tags: ['action', 'notification', 'alert'],
  providers: ['openai', 'anthropic', 'gemini', 'bedrock', 'azure', 'cohere', 'mistral'],
  complianceFrameworks: ['SOC2', 'OWASP'],
  estimatedCost: 0.001,
  isCustom: false
};

/**
 * Routing Blocks - Provider and Model Selection (5 blocks)
 */

export const providerSelectionBlock: BlockDefinition = {
  id: 'routing-provider-selection',
  name: 'Provider Selection',
  category: 'routing',
  description: 'Routes requests to a specific LLM provider',
  icon: '🔀',
  parameters: [
    {
      name: 'provider',
      type: 'enum',
      label: 'Provider',
      description: 'LLM provider to use',
      required: true,
      defaultValue: 'openai',
      options: ['openai', 'anthropic', 'gemini', 'bedrock', 'azure', 'cohere', 'mistral'],
      helpText: 'Select the LLM provider'
    },
    {
      name: 'model',
      type: 'string',
      label: 'Model',
      description: 'Specific model to use',
      required: false,
      defaultValue: '',
      placeholder: 'e.g., gpt-4, claude-3-opus'
    }
  ],
  inputs: [
    { id: 'in', label: 'Input', type: 'flow', required: true }
  ],
  outputs: [
    { id: 'out', label: 'Output', type: 'flow', required: true }
  ],
  codeTemplate: `
    // Provider Selection
    context.provider = '{{provider}}';
    if ('{{model}}') {
      context.model = '{{model}}';
    }
  `,
  tags: ['routing', 'provider', 'model-selection'],
  providers: ['openai', 'anthropic', 'gemini', 'bedrock', 'azure', 'cohere', 'mistral'],
  complianceFrameworks: ['OWASP'],
  estimatedCost: 0,
  isCustom: false
};

export const modelFallbackBlock: BlockDefinition = {
  id: 'routing-model-fallback',
  name: 'Model Fallback',
  category: 'routing',
  description: 'Implements fallback chain for model failures',
  icon: '🔄',
  parameters: [
    {
      name: 'primaryModel',
      type: 'string',
      label: 'Primary Model',
      description: 'First model to try',
      required: true,
      defaultValue: 'gpt-4',
      placeholder: 'e.g., gpt-4'
    },
    {
      name: 'fallbackModels',
      type: 'array',
      label: 'Fallback Models',
      description: 'Models to try if primary fails',
      required: true,
      defaultValue: ['gpt-3.5-turbo', 'claude-3-sonnet'],
      helpText: 'Ordered list of fallback models'
    },
    {
      name: 'maxRetries',
      type: 'number',
      label: 'Max Retries',
      description: 'Maximum retry attempts',
      required: false,
      defaultValue: 3,
      validation: { min: 1, max: 10 }
    }
  ],
  inputs: [
    { id: 'in', label: 'Input', type: 'flow', required: true }
  ],
  outputs: [
    { id: 'out', label: 'Output', type: 'flow', required: true },
    { id: 'failed', label: 'All Failed', type: 'flow', required: false }
  ],
  codeTemplate: `
    // Model Fallback
    const models = ['{{primaryModel}}', ...{{fallbackModels}}];
    let response;
    
    for (const model of models) {
      try {
        response = await callModel(model, context.request);
        break;
      } catch (error) {
        if (model === models[models.length - 1]) {
          {{failedAction}}
        }
      }
    }
  `,
  tags: ['routing', 'fallback', 'reliability'],
  providers: ['openai', 'anthropic', 'gemini', 'bedrock', 'azure', 'cohere', 'mistral'],
  complianceFrameworks: ['OWASP', 'SOC2'],
  estimatedCost: 0,
  isCustom: false
};

export const loadBalancerBlock: BlockDefinition = {
  id: 'routing-load-balancer',
  name: 'Load Balancer',
  category: 'routing',
  description: 'Distributes requests across multiple providers',
  icon: '⚖️',
  parameters: [
    {
      name: 'strategy',
      type: 'enum',
      label: 'Balancing Strategy',
      description: 'How to distribute requests',
      required: true,
      defaultValue: 'round-robin',
      options: ['round-robin', 'random', 'least-latency', 'least-cost'],
      helpText: 'Choose load balancing strategy'
    },
    {
      name: 'providers',
      type: 'array',
      label: 'Providers',
      description: 'Providers to balance across',
      required: true,
      defaultValue: ['openai', 'anthropic'],
      options: ['openai', 'anthropic', 'gemini', 'bedrock', 'azure', 'cohere', 'mistral']
    }
  ],
  inputs: [
    { id: 'in', label: 'Input', type: 'flow', required: true }
  ],
  outputs: [
    { id: 'out', label: 'Output', type: 'flow', required: true }
  ],
  codeTemplate: `
    // Load Balancer
    const selectedProvider = await selectProvider({
      strategy: '{{strategy}}',
      providers: {{providers}},
      context
    });
    
    context.provider = selectedProvider;
  `,
  tags: ['routing', 'load-balancing', 'performance'],
  providers: ['openai', 'anthropic', 'gemini', 'bedrock', 'azure', 'cohere', 'mistral'],
  complianceFrameworks: ['OWASP', 'SOC2'],
  estimatedCost: 0,
  isCustom: false
};

export const abTestRouterBlock: BlockDefinition = {
  id: 'routing-ab-test',
  name: 'A/B Test Router',
  category: 'routing',
  description: 'Routes traffic for A/B testing different models',
  icon: '🧪',
  parameters: [
    {
      name: 'variantA',
      type: 'string',
      label: 'Variant A Model',
      description: 'First model variant',
      required: true,
      defaultValue: 'gpt-4',
      placeholder: 'e.g., gpt-4'
    },
    {
      name: 'variantB',
      type: 'string',
      label: 'Variant B Model',
      description: 'Second model variant',
      required: true,
      defaultValue: 'claude-3-opus',
      placeholder: 'e.g., claude-3-opus'
    },
    {
      name: 'trafficSplit',
      type: 'number',
      label: 'Traffic Split (%)',
      description: 'Percentage of traffic to Variant A',
      required: true,
      defaultValue: 50,
      validation: { min: 0, max: 100 },
      helpText: 'Remaining traffic goes to Variant B'
    }
  ],
  inputs: [
    { id: 'in', label: 'Input', type: 'flow', required: true }
  ],
  outputs: [
    { id: 'variantA', label: 'Variant A', type: 'flow', required: false },
    { id: 'variantB', label: 'Variant B', type: 'flow', required: false }
  ],
  codeTemplate: `
    // A/B Test Router
    const random = Math.random() * 100;
    const useVariantA = random < {{trafficSplit}};
    
    context.model = useVariantA ? '{{variantA}}' : '{{variantB}}';
    context.abTestVariant = useVariantA ? 'A' : 'B';
  `,
  tags: ['routing', 'ab-testing', 'experimentation'],
  providers: ['openai', 'anthropic', 'gemini', 'bedrock', 'azure', 'cohere', 'mistral'],
  complianceFrameworks: ['OWASP'],
  estimatedCost: 0,
  isCustom: false
};

export const canaryDeploymentBlock: BlockDefinition = {
  id: 'routing-canary',
  name: 'Canary Deployment',
  category: 'routing',
  description: 'Gradually rolls out new model versions',
  icon: '🐤',
  parameters: [
    {
      name: 'stableModel',
      type: 'string',
      label: 'Stable Model',
      description: 'Current production model',
      required: true,
      defaultValue: 'gpt-4',
      placeholder: 'e.g., gpt-4'
    },
    {
      name: 'canaryModel',
      type: 'string',
      label: 'Canary Model',
      description: 'New model being tested',
      required: true,
      defaultValue: 'gpt-4-turbo',
      placeholder: 'e.g., gpt-4-turbo'
    },
    {
      name: 'canaryPercentage',
      type: 'number',
      label: 'Canary Percentage',
      description: 'Percentage of traffic to canary',
      required: true,
      defaultValue: 10,
      validation: { min: 0, max: 100 },
      helpText: 'Start small (5-10%) and increase gradually'
    }
  ],
  inputs: [
    { id: 'in', label: 'Input', type: 'flow', required: true }
  ],
  outputs: [
    { id: 'stable', label: 'Stable', type: 'flow', required: false },
    { id: 'canary', label: 'Canary', type: 'flow', required: false }
  ],
  codeTemplate: `
    // Canary Deployment
    const random = Math.random() * 100;
    const useCanary = random < {{canaryPercentage}};
    
    context.model = useCanary ? '{{canaryModel}}' : '{{stableModel}}';
    context.deploymentType = useCanary ? 'canary' : 'stable';
  `,
  tags: ['routing', 'canary', 'deployment'],
  providers: ['openai', 'anthropic', 'gemini', 'bedrock', 'azure', 'cohere', 'mistral'],
  complianceFrameworks: ['OWASP', 'SOC2'],
  estimatedCost: 0,
  isCustom: false
};

/**
 * Cost Control Blocks - Budget and Rate Limiting (4 blocks)
 */

export const budgetLimitBlock: BlockDefinition = {
  id: 'cost-budget-limit',
  name: 'Budget Limit',
  category: 'cost-control',
  description: 'Enforces budget limits on API usage',
  icon: '💰',
  parameters: [
    {
      name: 'limitType',
      type: 'enum',
      label: 'Limit Type',
      description: 'Time period for budget limit',
      required: true,
      defaultValue: 'daily',
      options: ['hourly', 'daily', 'weekly', 'monthly'],
      helpText: 'Choose budget period'
    },
    {
      name: 'maxCost',
      type: 'number',
      label: 'Max Cost (USD)',
      description: 'Maximum cost allowed',
      required: true,
      defaultValue: 100,
      validation: { min: 0 },
      placeholder: 'e.g., 100.00'
    },
    {
      name: 'action',
      type: 'enum',
      label: 'Action on Exceed',
      description: 'What to do when limit exceeded',
      required: true,
      defaultValue: 'deny',
      options: ['deny', 'alert', 'throttle']
    }
  ],
  inputs: [
    { id: 'in', label: 'Input', type: 'flow', required: true }
  ],
  outputs: [
    { id: 'out', label: 'Output', type: 'flow', required: true },
    { id: 'exceeded', label: 'Limit Exceeded', type: 'flow', required: false }
  ],
  codeTemplate: `
    // Budget Limit
    const currentCost = await getCurrentCost('{{limitType}}');
    
    if (currentCost >= {{maxCost}}) {
      if ('{{action}}' === 'deny') {
        return { decision: 'deny', reason: 'Budget limit exceeded' };
      }
      {{exceededAction}}
    }
  `,
  tags: ['cost-control', 'budget', 'limits'],
  providers: ['openai', 'anthropic', 'gemini', 'bedrock', 'azure', 'cohere', 'mistral'],
  complianceFrameworks: ['SOC2', 'OWASP'],
  estimatedCost: 0,
  isCustom: false
};

export const tokenOptimizationBlock: BlockDefinition = {
  id: 'cost-token-optimization',
  name: 'Token Optimization',
  category: 'cost-control',
  description: 'Optimizes token usage to reduce costs',
  icon: '🎯',
  parameters: [
    {
      name: 'strategy',
      type: 'enum',
      label: 'Optimization Strategy',
      description: 'How to optimize tokens',
      required: true,
      defaultValue: 'compress',
      options: ['compress', 'truncate', 'summarize'],
      helpText: 'Choose optimization approach'
    },
    {
      name: 'maxTokens',
      type: 'number',
      label: 'Max Tokens',
      description: 'Maximum tokens allowed',
      required: true,
      defaultValue: 4000,
      validation: { min: 100, max: 128000 },
      placeholder: 'e.g., 4000'
    }
  ],
  inputs: [
    { id: 'in', label: 'Input', type: 'flow', required: true }
  ],
  outputs: [
    { id: 'out', label: 'Output', type: 'flow', required: true }
  ],
  codeTemplate: `
    // Token Optimization
    const optimized = await optimizeTokens(context.request, {
      strategy: '{{strategy}}',
      maxTokens: {{maxTokens}}
    });
    
    context.request = optimized.request;
    context.tokensSaved = optimized.tokensSaved;
  `,
  tags: ['cost-control', 'optimization', 'tokens'],
  providers: ['openai', 'anthropic', 'gemini', 'bedrock', 'azure', 'cohere', 'mistral'],
  complianceFrameworks: ['OWASP'],
  estimatedCost: 0,
  isCustom: false
};

export const rateLimitingBlock: BlockDefinition = {
  id: 'cost-rate-limiting',
  name: 'Rate Limiting',
  category: 'cost-control',
  description: 'Limits request rate to control costs',
  icon: '⏱️',
  parameters: [
    {
      name: 'maxRequests',
      type: 'number',
      label: 'Max Requests',
      description: 'Maximum requests allowed',
      required: true,
      defaultValue: 100,
      validation: { min: 1 },
      placeholder: 'e.g., 100'
    },
    {
      name: 'timeWindow',
      type: 'enum',
      label: 'Time Window',
      description: 'Time period for rate limit',
      required: true,
      defaultValue: 'hour',
      options: ['minute', 'hour', 'day'],
      helpText: 'Choose time window'
    },
    {
      name: 'identifier',
      type: 'enum',
      label: 'Rate Limit By',
      description: 'How to identify users',
      required: true,
      defaultValue: 'user',
      options: ['user', 'ip', 'api-key', 'workspace']
    }
  ],
  inputs: [
    { id: 'in', label: 'Input', type: 'flow', required: true }
  ],
  outputs: [
    { id: 'out', label: 'Output', type: 'flow', required: true },
    { id: 'limited', label: 'Rate Limited', type: 'flow', required: false }
  ],
  codeTemplate: `
    // Rate Limiting
    const rateLimitKey = getRateLimitKey(context, '{{identifier}}');
    const isAllowed = await checkRateLimit(rateLimitKey, {
      maxRequests: {{maxRequests}},
      window: '{{timeWindow}}'
    });
    
    if (!isAllowed) {
      return { decision: 'deny', reason: 'Rate limit exceeded' };
    }
  `,
  tags: ['cost-control', 'rate-limiting', 'throttling'],
  providers: ['openai', 'anthropic', 'gemini', 'bedrock', 'azure', 'cohere', 'mistral'],
  complianceFrameworks: ['SOC2', 'OWASP'],
  estimatedCost: 0,
  isCustom: false
};

export const costAlertBlock: BlockDefinition = {
  id: 'cost-alert',
  name: 'Cost Alert',
  category: 'cost-control',
  description: 'Sends alerts when cost thresholds are reached',
  icon: '💸',
  parameters: [
    {
      name: 'threshold',
      type: 'number',
      label: 'Alert Threshold (USD)',
      description: 'Cost threshold for alert',
      required: true,
      defaultValue: 50,
      validation: { min: 0 },
      placeholder: 'e.g., 50.00'
    },
    {
      name: 'period',
      type: 'enum',
      label: 'Period',
      description: 'Time period to track',
      required: true,
      defaultValue: 'daily',
      options: ['hourly', 'daily', 'weekly', 'monthly']
    },
    {
      name: 'alertChannel',
      type: 'enum',
      label: 'Alert Channel',
      description: 'Where to send alerts',
      required: true,
      defaultValue: 'email',
      options: ['email', 'slack', 'webhook']
    }
  ],
  inputs: [
    { id: 'in', label: 'Input', type: 'flow', required: true }
  ],
  outputs: [
    { id: 'out', label: 'Output', type: 'flow', required: true }
  ],
  codeTemplate: `
    // Cost Alert
    const currentCost = await getCurrentCost('{{period}}');
    
    if (currentCost >= {{threshold}}) {
      await sendAlert({
        channel: '{{alertChannel}}',
        message: 'Cost threshold reached: $' + currentCost + ' / $' + {{threshold}},
        priority: 'high'
      });
    }
  `,
  tags: ['cost-control', 'alert', 'monitoring'],
  providers: ['openai', 'anthropic', 'gemini', 'bedrock', 'azure', 'cohere', 'mistral'],
  complianceFrameworks: ['SOC2', 'OWASP'],
  estimatedCost: 0.001,
  isCustom: false
};

/**
 * Compliance Blocks - Regulatory Requirements (3 blocks)
 */

export const auditLoggingBlock: BlockDefinition = {
  id: 'compliance-audit-logging',
  name: 'Audit Logging',
  category: 'compliance',
  description: 'Logs requests for compliance and audit trails',
  icon: '📜',
  parameters: [
    {
      name: 'logLevel',
      type: 'enum',
      label: 'Log Level',
      description: 'Detail level for audit logs',
      required: true,
      defaultValue: 'full',
      options: ['minimal', 'standard', 'full'],
      helpText: 'Full includes request/response content'
    },
    {
      name: 'retention',
      type: 'number',
      label: 'Retention (days)',
      description: 'How long to retain logs',
      required: true,
      defaultValue: 90,
      validation: { min: 1, max: 3650 },
      placeholder: 'e.g., 90'
    },
    {
      name: 'redactPII',
      type: 'boolean',
      label: 'Redact PII',
      description: 'Automatically redact PII in logs',
      required: false,
      defaultValue: true
    }
  ],
  inputs: [
    { id: 'in', label: 'Input', type: 'flow', required: true }
  ],
  outputs: [
    { id: 'out', label: 'Output', type: 'flow', required: true }
  ],
  codeTemplate: `
    // Audit Logging
    await auditLog({
      level: '{{logLevel}}',
      retention: {{retention}},
      redactPII: {{redactPII}},
      request: context.request,
      response: context.response,
      timestamp: new Date(),
      userId: context.userId
    });
  `,
  tags: ['compliance', 'audit', 'logging'],
  providers: ['openai', 'anthropic', 'gemini', 'bedrock', 'azure', 'cohere', 'mistral'],
  complianceFrameworks: ['SOC2', 'HIPAA', 'GDPR', 'OWASP'],
  estimatedCost: 0,
  isCustom: false
};

export const dataResidencyBlock: BlockDefinition = {
  id: 'compliance-data-residency',
  name: 'Data Residency',
  category: 'compliance',
  description: 'Ensures data stays in specified regions',
  icon: '🌍',
  parameters: [
    {
      name: 'allowedRegions',
      type: 'array',
      label: 'Allowed Regions',
      description: 'Regions where data can be processed',
      required: true,
      defaultValue: ['us-east-1', 'eu-west-1'],
      options: ['us-east-1', 'us-west-2', 'eu-west-1', 'eu-central-1', 'ap-southeast-1', 'ap-northeast-1'],
      helpText: 'Select compliant regions'
    },
    {
      name: 'enforceStrict',
      type: 'boolean',
      label: 'Strict Enforcement',
      description: 'Block requests if region cannot be guaranteed',
      required: false,
      defaultValue: true
    }
  ],
  inputs: [
    { id: 'in', label: 'Input', type: 'flow', required: true }
  ],
  outputs: [
    { id: 'out', label: 'Output', type: 'flow', required: true },
    { id: 'violation', label: 'Violation', type: 'flow', required: false }
  ],
  codeTemplate: `
    // Data Residency
    const region = await getProviderRegion(context.provider);
    const isAllowed = {{allowedRegions}}.includes(region);
    
    if (!isAllowed && {{enforceStrict}}) {
      return { decision: 'deny', reason: 'Data residency requirement not met' };
    }
  `,
  tags: ['compliance', 'data-residency', 'gdpr'],
  providers: ['openai', 'anthropic', 'gemini', 'bedrock', 'azure', 'cohere', 'mistral'],
  complianceFrameworks: ['GDPR', 'HIPAA', 'SOC2'],
  estimatedCost: 0,
  isCustom: false
};

export const consentVerificationBlock: BlockDefinition = {
  id: 'compliance-consent',
  name: 'Consent Verification',
  category: 'compliance',
  description: 'Verifies user consent before processing',
  icon: '✋',
  parameters: [
    {
      name: 'consentTypes',
      type: 'array',
      label: 'Required Consent Types',
      description: 'Types of consent required',
      required: true,
      defaultValue: ['data-processing', 'ai-usage'],
      options: ['data-processing', 'ai-usage', 'data-storage', 'third-party-sharing'],
      helpText: 'All selected consents must be granted'
    },
    {
      name: 'blockWithoutConsent',
      type: 'boolean',
      label: 'Block Without Consent',
      description: 'Deny requests if consent not granted',
      required: false,
      defaultValue: true
    }
  ],
  inputs: [
    { id: 'in', label: 'Input', type: 'flow', required: true }
  ],
  outputs: [
    { id: 'out', label: 'Output', type: 'flow', required: true },
    { id: 'noConsent', label: 'No Consent', type: 'flow', required: false }
  ],
  codeTemplate: `
    // Consent Verification
    const hasConsent = await verifyConsent(context.userId, {
      requiredTypes: {{consentTypes}}
    });
    
    if (!hasConsent && {{blockWithoutConsent}}) {
      return { decision: 'deny', reason: 'User consent required' };
    }
  `,
  tags: ['compliance', 'consent', 'gdpr'],
  providers: ['openai', 'anthropic', 'gemini', 'bedrock', 'azure', 'cohere', 'mistral'],
  complianceFrameworks: ['GDPR', 'HIPAA', 'COPPA'],
  estimatedCost: 0,
  isCustom: false
};

/**
 * Conditional Blocks - Logic and Branching (2 blocks)
 */

export const ifElseBlock: BlockDefinition = {
  id: 'conditional-if-else',
  name: 'If/Else Conditional',
  category: 'conditional',
  description: 'Branches execution based on a condition',
  icon: '🔀',
  parameters: [
    {
      name: 'condition',
      type: 'string',
      label: 'Condition',
      description: 'Condition to evaluate',
      required: true,
      defaultValue: '',
      placeholder: 'e.g., context.cost > 10',
      helpText: 'JavaScript expression that evaluates to boolean'
    },
    {
      name: 'operator',
      type: 'enum',
      label: 'Operator',
      description: 'Comparison operator',
      required: false,
      defaultValue: 'equals',
      options: ['equals', 'not-equals', 'greater-than', 'less-than', 'contains', 'matches']
    }
  ],
  inputs: [
    { id: 'in', label: 'Input', type: 'flow', required: true }
  ],
  outputs: [
    { id: 'true', label: 'True', type: 'flow', required: true },
    { id: 'false', label: 'False', type: 'flow', required: true }
  ],
  codeTemplate: `
    // If/Else Conditional
    if ({{condition}}) {
      {{trueAction}}
    } else {
      {{falseAction}}
    }
  `,
  tags: ['conditional', 'logic', 'branching'],
  providers: ['openai', 'anthropic', 'gemini', 'bedrock', 'azure', 'cohere', 'mistral'],
  complianceFrameworks: ['OWASP'],
  estimatedCost: 0,
  isCustom: false
};

export const switchCaseBlock: BlockDefinition = {
  id: 'conditional-switch',
  name: 'Switch/Case',
  category: 'conditional',
  description: 'Routes to different paths based on value',
  icon: '🎛️',
  parameters: [
    {
      name: 'variable',
      type: 'string',
      label: 'Variable',
      description: 'Variable to switch on',
      required: true,
      defaultValue: '',
      placeholder: 'e.g., context.provider',
      helpText: 'Variable to evaluate'
    },
    {
      name: 'cases',
      type: 'string',
      label: 'Cases',
      description: 'Comma-separated case values',
      required: true,
      defaultValue: '',
      placeholder: 'e.g., openai, anthropic, gemini',
      helpText: 'Each case will create an output connector'
    }
  ],
  inputs: [
    { id: 'in', label: 'Input', type: 'flow', required: true }
  ],
  outputs: [
    { id: 'default', label: 'Default', type: 'flow', required: true }
  ],
  codeTemplate: `
    // Switch/Case
    switch ({{variable}}) {
      {{caseStatements}}
      default:
        {{defaultAction}}
    }
  `,
  tags: ['conditional', 'logic', 'routing'],
  providers: ['openai', 'anthropic', 'gemini', 'bedrock', 'azure', 'cohere', 'mistral'],
  complianceFrameworks: ['OWASP'],
  estimatedCost: 0,
  isCustom: false
};

/**
 * Utility Blocks - Helper Functions (3 blocks)
 */

export const variableAssignmentBlock: BlockDefinition = {
  id: 'utility-variable',
  name: 'Variable Assignment',
  category: 'utility',
  description: 'Assigns a value to a variable',
  icon: '📦',
  parameters: [
    {
      name: 'variableName',
      type: 'string',
      label: 'Variable Name',
      description: 'Name of the variable',
      required: true,
      defaultValue: '',
      placeholder: 'e.g., maxCost',
      helpText: 'Variable name (no spaces)'
    },
    {
      name: 'value',
      type: 'string',
      label: 'Value',
      description: 'Value to assign',
      required: true,
      defaultValue: '',
      placeholder: 'e.g., 100 or "openai"',
      helpText: 'Can be a literal or expression'
    },
    {
      name: 'type',
      type: 'enum',
      label: 'Type',
      description: 'Variable type',
      required: false,
      defaultValue: 'string',
      options: ['string', 'number', 'boolean', 'object']
    }
  ],
  inputs: [
    { id: 'in', label: 'Input', type: 'flow', required: true }
  ],
  outputs: [
    { id: 'out', label: 'Output', type: 'flow', required: true }
  ],
  codeTemplate: `
    // Variable Assignment
    context.{{variableName}} = {{value}};
  `,
  tags: ['utility', 'variable', 'assignment'],
  providers: ['openai', 'anthropic', 'gemini', 'bedrock', 'azure', 'cohere', 'mistral'],
  complianceFrameworks: ['OWASP'],
  estimatedCost: 0,
  isCustom: false
};

export const dataTransformationBlock: BlockDefinition = {
  id: 'utility-transform',
  name: 'Data Transformation',
  category: 'utility',
  description: 'Transforms data using custom logic',
  icon: '🔄',
  parameters: [
    {
      name: 'transformation',
      type: 'enum',
      label: 'Transformation',
      description: 'Type of transformation',
      required: true,
      defaultValue: 'map',
      options: ['map', 'filter', 'reduce', 'custom'],
      helpText: 'Choose transformation type'
    },
    {
      name: 'logic',
      type: 'string',
      label: 'Transformation Logic',
      description: 'JavaScript transformation code',
      required: true,
      defaultValue: '',
      placeholder: 'e.g., (item) => item.toUpperCase()',
      helpText: 'JavaScript function or expression'
    }
  ],
  inputs: [
    { id: 'in', label: 'Input', type: 'flow', required: true },
    { id: 'data', label: 'Data', type: 'data', dataType: 'any', required: true }
  ],
  outputs: [
    { id: 'out', label: 'Output', type: 'flow', required: true },
    { id: 'result', label: 'Result', type: 'data', dataType: 'any', required: false }
  ],
  codeTemplate: `
    // Data Transformation
    const transformFn = {{logic}};
    const result = context.data.{{transformation}}(transformFn);
    context.transformedData = result;
  `,
  tags: ['utility', 'transformation', 'data'],
  providers: ['openai', 'anthropic', 'gemini', 'bedrock', 'azure', 'cohere', 'mistral'],
  complianceFrameworks: ['OWASP'],
  estimatedCost: 0,
  isCustom: false
};

export const apiCallBlock: BlockDefinition = {
  id: 'utility-api-call',
  name: 'API Call',
  category: 'utility',
  description: 'Makes an external API call',
  icon: '🌐',
  parameters: [
    {
      name: 'url',
      type: 'string',
      label: 'API URL',
      description: 'URL to call',
      required: true,
      defaultValue: '',
      placeholder: 'https://api.example.com/endpoint',
      helpText: 'Full URL including protocol'
    },
    {
      name: 'method',
      type: 'enum',
      label: 'HTTP Method',
      description: 'HTTP method to use',
      required: true,
      defaultValue: 'GET',
      options: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
    },
    {
      name: 'headers',
      type: 'string',
      label: 'Headers',
      description: 'Request headers (JSON)',
      required: false,
      defaultValue: '{}',
      placeholder: '{"Authorization": "Bearer token"}',
      helpText: 'JSON object with headers'
    },
    {
      name: 'body',
      type: 'string',
      label: 'Request Body',
      description: 'Request body (JSON)',
      required: false,
      defaultValue: '',
      placeholder: '{"key": "value"}',
      helpText: 'JSON object for POST/PUT requests'
    }
  ],
  inputs: [
    { id: 'in', label: 'Input', type: 'flow', required: true }
  ],
  outputs: [
    { id: 'out', label: 'Output', type: 'flow', required: true },
    { id: 'response', label: 'Response', type: 'data', dataType: 'object', required: false },
    { id: 'error', label: 'Error', type: 'flow', required: false }
  ],
  codeTemplate: `
    // API Call
    try {
      const response = await fetch('{{url}}', {
        method: '{{method}}',
        headers: {{headers}},
        body: '{{method}}' !== 'GET' ? JSON.stringify({{body}}) : undefined
      });
      
      context.apiResponse = await response.json();
    } catch (error) {
      {{errorAction}}
    }
  `,
  tags: ['utility', 'api', 'integration'],
  providers: ['openai', 'anthropic', 'gemini', 'bedrock', 'azure', 'cohere', 'mistral'],
  complianceFrameworks: ['OWASP', 'SOC2'],
  estimatedCost: 0,
  isCustom: false
};

/**
 * Block Library - Complete Collection
 * Exports all 30 blocks organized by category
 */

export const BLOCK_LIBRARY: BlockDefinition[] = [
  // Guards (7 blocks)
  piiDetectionBlock,
  promptInjectionBlock,
  contentModerationBlock,
  toxicityDetectionBlock,
  jailbreakDetectionBlock,
  dataLeakagePreventionBlock,
  sensitiveTopicFilterBlock,
  
  // Actions (6 blocks)
  allowRequestBlock,
  denyRequestBlock,
  modifyRequestBlock,
  modifyResponseBlock,
  logEventBlock,
  sendAlertBlock,
  
  // Routing (5 blocks)
  providerSelectionBlock,
  modelFallbackBlock,
  loadBalancerBlock,
  abTestRouterBlock,
  canaryDeploymentBlock,
  
  // Cost Control (4 blocks)
  budgetLimitBlock,
  tokenOptimizationBlock,
  rateLimitingBlock,
  costAlertBlock,
  
  // Compliance (3 blocks)
  auditLoggingBlock,
  dataResidencyBlock,
  consentVerificationBlock,
  
  // Conditional (2 blocks)
  ifElseBlock,
  switchCaseBlock,
  
  // Utility (3 blocks)
  variableAssignmentBlock,
  dataTransformationBlock,
  apiCallBlock
];

/**
 * Get blocks by category
 */
export function getBlocksByCategory(category: BlockCategory): BlockDefinition[] {
  return BLOCK_LIBRARY.filter(block => block.category === category);
}

/**
 * Get block by ID
 */
export function getBlockById(id: string): BlockDefinition | undefined {
  return BLOCK_LIBRARY.find(block => block.id === id);
}

/**
 * Search blocks by name or description
 */
export function searchBlocks(query: string): BlockDefinition[] {
  const lowerQuery = query.toLowerCase();
  return BLOCK_LIBRARY.filter(block => 
    block.name.toLowerCase().includes(lowerQuery) ||
    block.description.toLowerCase().includes(lowerQuery) ||
    block.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Filter blocks by provider
 */
export function filterBlocksByProvider(provider: string): BlockDefinition[] {
  return BLOCK_LIBRARY.filter(block => 
    block.providers.includes(provider)
  );
}

/**
 * Filter blocks by compliance framework
 */
export function filterBlocksByCompliance(framework: string): BlockDefinition[] {
  return BLOCK_LIBRARY.filter(block => 
    block.complianceFrameworks.includes(framework)
  );
}

/**
 * Get all categories with block counts
 */
export function getCategoriesWithCounts(): Array<{ category: BlockCategory; count: number }> {
  const categories: BlockCategory[] = ['guards', 'actions', 'routing', 'cost-control', 'compliance', 'conditional', 'utility'];
  return categories.map(category => ({
    category,
    count: getBlocksByCategory(category).length
  }));
}
