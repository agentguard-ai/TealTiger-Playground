import type { TestScenario, EvaluationResult, Decision } from '@/types';
import { TealTigerAPI } from './TealTigerAPI';

export class EvaluationEngine {
  private timeout: number = 5000; // 5 seconds

  async evaluate(
    policyCode: string,
    request: any,
    context: any,
    mockResponse: any
  ): Promise<EvaluationResult> {
    const startTime = performance.now();

    try {
      // Execute policy with timeout
      const decision = await this.executeWithTimeout(
        policyCode,
        request,
        context,
        mockResponse,
        TealTigerAPI
      );

      const executionTime = performance.now() - startTime;

      return {
        decision,
        executionTime,
        error: undefined,
        metadata: {
          tokensUsed: mockResponse.metadata.tokens.total,
          estimatedCost: mockResponse.metadata.cost,
          provider: request.provider,
          model: request.model,
        },
      };
    } catch (error: any) {
      const executionTime = performance.now() - startTime;

      return {
        decision: {
          action: 'DENY',
          reason: 'Policy execution failed',
          metadata: {},
        },
        executionTime,
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
        metadata: {
          tokensUsed: 0,
          estimatedCost: 0,
          provider: request.provider,
          model: request.model,
        },
      };
    }
  }

  private async executeWithTimeout(
    policyCode: string,
    request: any,
    context: any,
    mockResponse: any,
    api: typeof TealTigerAPI
  ): Promise<Decision> {
    // Remove export default statement and extract function name
    let cleanedCode = policyCode;
    let functionName = 'policyFunction';
    
    // Extract function name if present: "export default function name(...)"
    const namedFunctionMatch = cleanedCode.match(/export\s+default\s+function\s+(\w+)/);
    if (namedFunctionMatch) {
      functionName = namedFunctionMatch[1];
      cleanedCode = cleanedCode.replace(/export\s+default\s+/, '');
    } else {
      // Handle anonymous function: "export default function(...)" or "export default (...) => {...}"
      cleanedCode = cleanedCode.replace(/export\s+default\s+function/, `function ${functionName}`);
      cleanedCode = cleanedCode.replace(/export\s+default\s+/, `const ${functionName} = `);
    }
    
    // Create isolated execution context with TealTiger API methods
    const policyFunction = new Function(
      'request',
      'context',
      'response',
      'detectPII',
      'detectInjection',
      'estimateCost',
      'getProviderRegion',
      `
        ${cleanedCode}
        return ${functionName}(request, context, response);
      `
    );

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Policy execution timeout (5 seconds)'));
      }, this.timeout);
    });

    // Execute policy
    const executionPromise = Promise.resolve(
      policyFunction(
        request,
        context,
        mockResponse,
        api.detectPII,
        api.detectInjection,
        api.estimateCost,
        api.getProviderRegion
      )
    );

    // Race between execution and timeout
    const result = await Promise.race([executionPromise, timeoutPromise]);

    // Validate decision structure
    this.validateDecision(result);

    return result;
  }

  private validateDecision(decision: unknown): asserts decision is Decision {
    if (!decision || typeof decision !== 'object') {
      throw new Error('Policy must return a Decision object');
    }

    const d = decision as Record<string, unknown>;

    if (!['ALLOW', 'DENY', 'MONITOR'].includes(d.action as string)) {
      throw new Error('Decision action must be ALLOW, DENY, or MONITOR');
    }

    if (typeof d.reason !== 'string' || d.reason.length === 0) {
      throw new Error('Decision reason must be a non-empty string');
    }

    if (!d.metadata || typeof d.metadata !== 'object') {
      throw new Error('Decision metadata must be an object');
    }
  }
}
