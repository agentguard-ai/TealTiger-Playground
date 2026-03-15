// Core types for the playground

export interface TestScenario {
  id: string;
  timestamp: number;
  name: string;
  prompt: string;
  provider: 'openai' | 'anthropic' | 'gemini' | 'bedrock';
  model: string;
  parameters: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  };
  expectedOutcome?: 'ALLOW' | 'DENY' | 'MONITOR';
  description?: string;
  testType?: 'pii' | 'injection' | 'normal';
}

export interface Decision {
  action: 'ALLOW' | 'DENY' | 'MONITOR';
  reason: string;
  metadata: Record<string, unknown>;
}

export interface EvaluationResult {
  decision: Decision;
  executionTime: number;
  error?: {
    message: string;
    stack?: string;
    name: string;
  };
  metadata: {
    tokensUsed: number;
    estimatedCost: number;
    provider: string;
    model: string;
  };
}

export interface SessionState {
  version: string;
  policyCode: string;
  scenarios: TestScenario[];
  selectedExample?: string;
  editorState?: {
    cursorPosition: { line: number; column: number };
    scrollPosition: number;
  };
  metadata: {
    timestamp: number;
    sdkVersion: string;
    userAgent?: string;
  };
}

export interface ValidationError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  hasDefaultExport: boolean;
  exportedType: 'function' | 'class' | 'object' | 'unknown';
}

// Re-export environment types
export * from './environment';

// Re-export CI/CD types
export * from './cicd';

// Re-export visual policy types
export * from './visual-policy';
