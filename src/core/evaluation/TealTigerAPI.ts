// TealTiger API methods for policy evaluation

export interface PIIDetectionResult {
  found: boolean;
  types: string[];
  count: number;
  redacted: string;
}

export interface InjectionDetectionResult {
  detected: boolean;
  patterns: string[];
  confidence: number;
}

export const TealTigerAPI = {
  detectPII: (text: string): PIIDetectionResult => {
    const patterns = [
      { regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, type: 'email' },
      { regex: /\b\d{3}-\d{2}-\d{4}\b/g, type: 'ssn' },
      { regex: /\b\d{3}-\d{3}-\d{4}\b/g, type: 'phone' },
      { regex: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, type: 'credit_card' },
    ];

    const foundTypes: string[] = [];
    let redacted = text;
    let count = 0;

    patterns.forEach(({ regex, type }) => {
      const matches = text.match(regex);
      if (matches && matches.length > 0) {
        foundTypes.push(type);
        count += matches.length;
        redacted = redacted.replace(regex, `[${type.toUpperCase()}]`);
      }
    });

    return {
      found: foundTypes.length > 0,
      types: foundTypes,
      count,
      redacted,
    };
  },

  detectInjection: (text: string): InjectionDetectionResult => {
    const injectionPatterns = [
      { regex: /ignore\s+previous\s+instructions/i, name: 'ignore_previous' },
      { regex: /disregard\s+all\s+prior/i, name: 'disregard_prior' },
      { regex: /system\s*:/i, name: 'system_override' },
      { regex: /you\s+are\s+now/i, name: 'role_change' },
      { regex: /new\s+instructions/i, name: 'new_instructions' },
    ];

    const detectedPatterns: string[] = [];
    injectionPatterns.forEach(({ regex, name }) => {
      if (regex.test(text)) {
        detectedPatterns.push(name);
      }
    });

    return {
      detected: detectedPatterns.length > 0,
      patterns: detectedPatterns,
      confidence: detectedPatterns.length > 0 ? 0.8 : 0.0,
    };
  },

  estimateCost: (
    tokensOrParams: number | { provider?: string; model: string; inputTokens: number; outputTokens: number },
    model?: string
  ): number | { input: number; output: number; total: number } => {
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
      'claude-3-opus': { input: 0.015, output: 0.075 },
      'claude-3-sonnet': { input: 0.003, output: 0.015 },
      'claude-instant-1': { input: 0.0008, output: 0.0024 },
      'gemini-pro': { input: 0.00025, output: 0.0005 },
    };

    // Handle object parameter format
    if (typeof tokensOrParams === 'object') {
      const { model: modelName, inputTokens, outputTokens } = tokensOrParams;
      const modelPricing = pricing[modelName] || { input: 0.001, output: 0.002 };
      
      const inputCost = (inputTokens / 1000) * modelPricing.input;
      const outputCost = (outputTokens / 1000) * modelPricing.output;
      
      return {
        input: inputCost,
        output: outputCost,
        total: inputCost + outputCost,
      };
    }

    // Handle simple (tokens, model) format
    const modelPricing = pricing[model!] || { input: 0.001, output: 0.002 };
    return (tokensOrParams / 1000) * modelPricing.input;
  },

  getProviderRegion: (provider: string, _endpoint?: string): string => {
    const regionMap: Record<string, string> = {
      'openai': 'us-east',
      'anthropic': 'us-west',
      'gemini': 'us-central',
      'bedrock': 'us-east',
      'azure': 'eu-west',
      'cohere': 'us-east',
      'mistral': 'eu-central',
    };
    return regionMap[provider?.toLowerCase()] || 'us-east';
  },
};
