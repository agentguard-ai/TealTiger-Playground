import type { TestScenario } from '../types';

export const complianceAuditPolicy = {
  id: 'compliance-audit',
  name: 'Compliance Audit Logging',
  category: 'compliance' as const,
  difficulty: 'advanced' as const,
  description: 'Generate detailed audit logs for compliance requirements, tracking sensitive data access and policy decisions.',
  
  code: `// Compliance Audit Logging Policy
// Generates audit events for compliance tracking

export default function complianceAuditPolicy(request, context, response) {
  // Check for sensitive data indicators
  const sensitiveKeywords = [
    'ssn', 'social security', 'credit card', 'password',
    'medical', 'health', 'financial', 'confidential'
  ];
  
  const promptLower = request.prompt.toLowerCase();
  const hasSensitiveData = sensitiveKeywords.some(
    keyword => promptLower.includes(keyword)
  );
  
  // Generate audit event
  const auditEvent = {
    timestamp: new Date().toISOString(),
    userId: context.userId,
    sessionId: context.sessionId,
    action: 'llm_request',
    provider: request.provider,
    model: request.model,
    hasSensitiveData,
    promptLength: request.prompt.length,
    responseLength: response.content.length,
    cost: 0.001, // Placeholder
    decision: hasSensitiveData ? 'MONITOR' : 'ALLOW'
  };
  
  // In production, send to audit log system
  console.log('[AUDIT]', JSON.stringify(auditEvent));
  
  if (hasSensitiveData) {
    return {
      action: 'MONITOR',
      reason: 'Sensitive data detected - audit event generated',
      metadata: {
        auditEvent,
        sensitiveDataDetected: true,
        complianceLevel: 'high'
      }
    };
  }
  
  return {
    action: 'ALLOW',
    reason: 'Request logged for compliance',
    metadata: {
      auditEvent,
      sensitiveDataDetected: false,
      complianceLevel: 'standard'
    }
  };
}`,

  scenarios: [
    {
      id: 'audit-1',
      timestamp: Date.now(),
      name: 'Sensitive data request',
      prompt: 'What is the process for handling social security numbers?',
      provider: 'openai' as const,
      model: 'gpt-4',
      parameters: {
        temperature: 0.7,
        maxTokens: 200,
      },
      expectedOutcome: 'MONITOR' as const,
      description: 'Should flag and audit sensitive data access',
      testType: 'normal' as const,
    },
    {
      id: 'audit-2',
      timestamp: Date.now(),
      name: 'Normal request',
      prompt: 'What are best practices for software development?',
      provider: 'openai' as const,
      model: 'gpt-4',
      parameters: {
        temperature: 0.7,
        maxTokens: 200,
      },
      expectedOutcome: 'ALLOW' as const,
      description: 'Should log normal request',
      testType: 'normal' as const,
    },
  ] as TestScenario[],
};
