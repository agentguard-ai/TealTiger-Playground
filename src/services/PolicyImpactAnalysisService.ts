// PolicyImpactAnalysisService - Policy impact analysis and change detection
// Requirements: 17.1-17.10

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { policyRegistryService } from './PolicyRegistryService';
import type {
  ImpactAnalysis,
  AffectedScenario,
  ScenarioChange,
  ImpactSummary,
  TestRunResult,
  ImpactSeverity,
  ImpactType,
  ImpactExportOptions
} from '../types/impact';
import type { TestScenario, EvaluationResult } from '../types';

export class PolicyImpactAnalysisService {
  /**
   * Analyzes impact of policy changes by comparing two versions
   * Requirements: 17.1, 17.2, 17.3, 17.4, 17.5
   */
  async analyzeImpact(
    policyId: string,
    oldVersionId: string,
    newVersionId: string,
    scenarios: TestScenario[]
  ): Promise<ImpactAnalysis> {
    // Get both versions
    const oldVersion = await policyRegistryService.getVersion(oldVersionId);
    const newVersion = await policyRegistryService.getVersion(newVersionId);

    // Run tests against both versions
    const oldResults = await this.runImpactTests(policyId, oldVersionId, scenarios);
    const newResults = await this.runImpactTests(policyId, newVersionId, scenarios);

    // Compare results
    const affectedScenarios = await this.compareResults(oldResults, newResults);

    // Calculate summary
    const summary = this.calculateSummary(affectedScenarios);

    // Generate recommendation
    const recommendation = this.generateRecommendation(summary);

    return {
      policyId,
      oldVersionId,
      newVersionId,
      affectedScenarios,
      summary,
      recommendation,
      analyzedAt: new Date()
    };
  }

  /**
   * Runs all test scenarios against a policy version
   * Requirements: 17.1
   */
  async runImpactTests(
    policyId: string,
    versionId: string,
    scenarios: TestScenario[]
  ): Promise<TestRunResult[]> {
    const version = await policyRegistryService.getVersion(versionId);
    const results: TestRunResult[] = [];

    for (const scenario of scenarios) {
      const startTime = performance.now();
      
      try {
        // Execute policy against scenario
        const result = await this.executePolicy(version.code, scenario);
        const executionTime = performance.now() - startTime;

        results.push({
          scenarioId: scenario.id,
          scenarioName: scenario.name,
          scenario,
          result,
          success: !result.error,
          executionTime
        });
      } catch (error) {
        const executionTime = performance.now() - startTime;
        
        results.push({
          scenarioId: scenario.id,
          scenarioName: scenario.name,
          scenario,
          result: {
            decision: { action: 'DENY', reason: 'Execution error', metadata: {} },
            executionTime,
            error: {
              message: error instanceof Error ? error.message : 'Unknown error',
              name: error instanceof Error ? error.name : 'Error'
            },
            metadata: {
              tokensUsed: 0,
              estimatedCost: 0,
              provider: scenario.provider,
              model: scenario.model
            }
          },
          success: false,
          executionTime
        });
      }
    }

    return results;
  }

  /**
   * Compares results between two versions to detect changes
   * Requirements: 17.2, 17.3, 17.4, 17.5
   */
  async compareResults(
    oldResults: TestRunResult[],
    newResults: TestRunResult[]
  ): Promise<AffectedScenario[]> {
    const affectedScenarios: AffectedScenario[] = [];

    // Create a map for quick lookup
    const newResultsMap = new Map(
      newResults.map(r => [r.scenarioId, r])
    );

    for (const oldResult of oldResults) {
      const newResult = newResultsMap.get(oldResult.scenarioId);
      
      if (!newResult) {
        continue; // Scenario removed
      }

      const changes: ScenarioChange[] = [];

      // Check decision changes (always high severity)
      if (oldResult.result.decision.action !== newResult.result.decision.action) {
        changes.push({
          field: 'decision',
          oldValue: oldResult.result.decision.action,
          newValue: newResult.result.decision.action,
          severity: 'high',
          description: `Decision changed from ${oldResult.result.decision.action} to ${newResult.result.decision.action}`
        });
      }

      // Check cost changes (±10% = medium, ±25% = high)
      const oldCost = oldResult.result.metadata.estimatedCost;
      const newCost = newResult.result.metadata.estimatedCost;
      
      if (oldCost > 0) {
        const costChange = ((newCost - oldCost) / oldCost) * 100;
        const absCostChange = Math.abs(costChange);
        
        if (absCostChange >= 10) {
          const severity: ImpactSeverity = absCostChange >= 25 ? 'high' : 'medium';
          changes.push({
            field: 'cost',
            oldValue: oldCost,
            newValue: newCost,
            percentageChange: costChange,
            severity,
            description: `Cost changed by ${costChange.toFixed(1)}% (${oldCost.toFixed(4)} → ${newCost.toFixed(4)})`
          });
        }
      }

      // Check latency changes (±20% = medium, ±50% = high)
      const oldLatency = oldResult.executionTime;
      const newLatency = newResult.executionTime;
      
      if (oldLatency > 0) {
        const latencyChange = ((newLatency - oldLatency) / oldLatency) * 100;
        const absLatencyChange = Math.abs(latencyChange);
        
        if (absLatencyChange >= 20) {
          const severity: ImpactSeverity = absLatencyChange >= 50 ? 'high' : 'medium';
          changes.push({
            field: 'latency',
            oldValue: oldLatency,
            newValue: newLatency,
            percentageChange: latencyChange,
            severity,
            description: `Latency changed by ${latencyChange.toFixed(1)}% (${oldLatency.toFixed(2)}ms → ${newLatency.toFixed(2)}ms)`
          });
        }
      }

      // If there are changes, add to affected scenarios
      if (changes.length > 0) {
        const impactType = this.determineImpactType(changes);
        
        affectedScenarios.push({
          scenarioId: oldResult.scenarioId,
          scenarioName: oldResult.scenarioName,
          impactType,
          changes
        });
      }
    }

    return affectedScenarios;
  }

  /**
   * Filters impacts by severity level
   * Requirements: 17.7
   */
  filterBySeverity(
    impacts: AffectedScenario[],
    severity: ImpactSeverity
  ): AffectedScenario[] {
    return impacts.filter(scenario =>
      scenario.changes.some(change => change.severity === severity)
    );
  }

  /**
   * Exports impact report in specified format
   * Requirements: 17.10
   */
  async exportImpactReport(
    policyId: string,
    analysis: ImpactAnalysis,
    options: ImpactExportOptions
  ): Promise<string | Blob> {
    const { format } = options;

    if (format === 'csv') {
      return this.exportAsCSV(analysis);
    } else if (format === 'pdf') {
      return this.exportAsPDF(analysis);
    }

    throw new Error(`Unsupported export format: ${format}`);
  }

  /**
   * Logs impact analysis to audit trail
   * Requirements: 17.9
   */
  async logImpactAnalysis(
    policyId: string,
    analysis: ImpactAnalysis,
    userId: string
  ): Promise<void> {
    if (!isSupabaseConfigured()) {
      return;
    }

    const policy = await policyRegistryService.getPolicy(policyId);

    await supabase!.from('audit_log').insert({
      workspace_id: policy.workspaceId,
      actor_id: userId,
      action: 'policy_impact_analyzed',
      resource_type: 'policy',
      resource_id: policyId,
      metadata: {
        old_version_id: analysis.oldVersionId,
        new_version_id: analysis.newVersionId,
        affected_scenarios: analysis.summary.affectedScenarios,
        breaking_changes: analysis.summary.breakingChanges,
        recommendation: analysis.recommendation
      }
    });
  }

  // Private helper methods

  private async executePolicy(
    policyCode: string,
    scenario: TestScenario
  ): Promise<EvaluationResult> {
    const startTime = performance.now();

    try {
      // Create a safe execution context
      const policyFunction = new Function(
        'scenario',
        'TealTigerAPI',
        `
        ${policyCode}
        
        // Execute the policy
        if (typeof evaluate === 'function') {
          return evaluate(scenario);
        } else if (typeof default_export !== 'undefined') {
          return default_export(scenario);
        } else {
          throw new Error('No evaluate function found in policy');
        }
        `
      );

      // Mock TealTigerAPI for evaluation
      const mockAPI = {
        detectPII: (text: string) => ({
          found: /email|ssn|phone|credit/i.test(text),
          types: [],
          count: 0,
          redacted: text
        }),
        detectInjection: (text: string) => ({
          detected: /ignore.*instructions|system:/i.test(text),
          patterns: [],
          confidence: 0.8
        }),
        estimateCost: () => 0.001
      };

      const decision = policyFunction(scenario, mockAPI);
      const executionTime = performance.now() - startTime;

      return {
        decision: decision || { action: 'ALLOW', reason: 'No decision', metadata: {} },
        executionTime,
        metadata: {
          tokensUsed: 100,
          estimatedCost: 0.001,
          provider: scenario.provider,
          model: scenario.model
        }
      };
    } catch (error) {
      const executionTime = performance.now() - startTime;
      
      return {
        decision: { action: 'DENY', reason: 'Execution error', metadata: {} },
        executionTime,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          name: error instanceof Error ? error.name : 'Error',
          stack: error instanceof Error ? error.stack : undefined
        },
        metadata: {
          tokensUsed: 0,
          estimatedCost: 0,
          provider: scenario.provider,
          model: scenario.model
        }
      };
    }
  }

  private determineImpactType(changes: ScenarioChange[]): ImpactType {
    // Decision changes are always breaking
    if (changes.some(c => c.field === 'decision')) {
      return 'breaking';
    }

    // High severity changes are warnings
    if (changes.some(c => c.severity === 'high')) {
      return 'warning';
    }

    // Medium severity changes are warnings
    if (changes.some(c => c.severity === 'medium')) {
      return 'warning';
    }

    // Low severity changes are info
    return 'info';
  }

  private calculateSummary(affectedScenarios: AffectedScenario[]): ImpactSummary {
    const breakingChanges = affectedScenarios.filter(s => s.impactType === 'breaking').length;
    const warnings = affectedScenarios.filter(s => s.impactType === 'warning').length;
    const infoChanges = affectedScenarios.filter(s => s.impactType === 'info').length;

    return {
      totalScenarios: affectedScenarios.length,
      affectedScenarios: affectedScenarios.length,
      breakingChanges,
      warnings,
      infoChanges
    };
  }

  private generateRecommendation(summary: ImpactSummary): 'approve' | 'review' | 'reject' {
    // Reject if there are breaking changes
    if (summary.breakingChanges > 0) {
      return 'reject';
    }

    // Review if there are warnings
    if (summary.warnings > 0) {
      return 'review';
    }

    // Approve if only info changes or no changes
    return 'approve';
  }

  private exportAsCSV(analysis: ImpactAnalysis): string {
    const lines: string[] = [];
    
    // Header
    lines.push('Scenario,Impact Type,Field,Old Value,New Value,Change %,Severity,Description');

    // Data rows
    for (const scenario of analysis.affectedScenarios) {
      for (const change of scenario.changes) {
        const changePercent = change.percentageChange?.toFixed(1) || 'N/A';
        lines.push(
          `"${scenario.scenarioName}",${scenario.impactType},${change.field},"${change.oldValue}","${change.newValue}",${changePercent},${change.severity},"${change.description}"`
        );
      }
    }

    return lines.join('\n');
  }

  private exportAsPDF(analysis: ImpactAnalysis): Blob {
    // Simple PDF generation using HTML canvas approach
    // In production, use a library like jsPDF
    const content = `
      Policy Impact Analysis Report
      
      Summary:
      - Total Scenarios: ${analysis.summary.totalScenarios}
      - Affected Scenarios: ${analysis.summary.affectedScenarios}
      - Breaking Changes: ${analysis.summary.breakingChanges}
      - Warnings: ${analysis.summary.warnings}
      - Info Changes: ${analysis.summary.infoChanges}
      
      Recommendation: ${analysis.recommendation.toUpperCase()}
      
      Affected Scenarios:
      ${analysis.affectedScenarios.map(s => `
        - ${s.scenarioName} (${s.impactType})
          ${s.changes.map(c => `  * ${c.description}`).join('\n')}
      `).join('\n')}
    `;

    return new Blob([content], { type: 'application/pdf' });
  }
}

// Export singleton instance
export const policyImpactAnalysisService = new PolicyImpactAnalysisService();
