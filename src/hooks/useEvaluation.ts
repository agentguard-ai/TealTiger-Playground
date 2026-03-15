import { useState, useCallback } from 'react';
import { EvaluationEngine } from '../core/evaluation/EvaluationEngine';
import { MockLLMProvider } from '../core/mock/MockLLMProvider';
import type { TestScenario, EvaluationResult } from '../types';

const evaluationEngine = new EvaluationEngine();
const mockProvider = new MockLLMProvider();

export interface EvaluationState {
  results: Array<{
    scenario: TestScenario;
    result: EvaluationResult;
  }>;
  isEvaluating: boolean;
  totalExecutionTime: number;
  error: string | null;
}

/**
 * Hook for orchestrating policy evaluation across multiple scenarios
 */
export const useEvaluation = () => {
  const [state, setState] = useState<EvaluationState>({
    results: [],
    isEvaluating: false,
    totalExecutionTime: 0,
    error: null,
  });

  /**
   * Run evaluation for all scenarios
   */
  const runEvaluation = useCallback(async (
    policyCode: string,
    scenarios: TestScenario[]
  ): Promise<void> => {
    if (!policyCode.trim()) {
      setState({
        results: [],
        isEvaluating: false,
        totalExecutionTime: 0,
        error: 'Policy code is empty',
      });
      return;
    }

    if (scenarios.length === 0) {
      setState({
        results: [],
        isEvaluating: false,
        totalExecutionTime: 0,
        error: 'No scenarios to evaluate',
      });
      return;
    }

    setState({
      results: [],
      isEvaluating: true,
      totalExecutionTime: 0,
      error: null,
    });

    const startTime = performance.now();
    const results: Array<{ scenario: TestScenario; result: EvaluationResult }> = [];

    try {
      // Evaluate each scenario sequentially
      for (const scenario of scenarios) {
        try {
          // Generate mock LLM response
          const mockResponse = await mockProvider.generateResponse({
            prompt: scenario.prompt,
            provider: scenario.provider,
            model: scenario.model,
            parameters: scenario.parameters,
            testType: scenario.testType,
          });

          // Create request and context objects
          const request = {
            prompt: scenario.prompt,
            provider: scenario.provider,
            model: scenario.model,
            parameters: scenario.parameters,
          };

          const context = {
            userId: 'playground-user',
            sessionId: `session-${Date.now()}`,
            timestamp: Date.now(),
          };

          // Evaluate policy
          const result = await evaluationEngine.evaluate(
            policyCode,
            request,
            context,
            mockResponse
          );

          results.push({ scenario, result });
        } catch (error) {
          // Create error result for this scenario
          const errorResult: EvaluationResult = {
            decision: {
              action: 'DENY',
              reason: 'Evaluation failed',
              metadata: {},
            },
            executionTime: 0,
            error: {
              name: error instanceof Error ? error.name : 'Error',
              message: error instanceof Error ? error.message : 'Unknown error',
              stack: error instanceof Error ? error.stack : undefined,
            },
            metadata: {
              tokensUsed: 0,
              estimatedCost: 0,
              provider: scenario.provider,
              model: scenario.model,
            },
          };

          results.push({ scenario, result: errorResult });
        }
      }

      const endTime = performance.now();
      const totalExecutionTime = endTime - startTime;

      setState({
        results,
        isEvaluating: false,
        totalExecutionTime,
        error: null,
      });
    } catch (error) {
      setState({
        results: [],
        isEvaluating: false,
        totalExecutionTime: 0,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  }, []);

  /**
   * Clear evaluation results
   */
  const clearResults = useCallback(() => {
    setState({
      results: [],
      isEvaluating: false,
      totalExecutionTime: 0,
      error: null,
    });
  }, []);

  return {
    ...state,
    runEvaluation,
    clearResults,
  };
};
