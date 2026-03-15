import { describe, it, expect, beforeEach, vi } from 'vitest';
import { policyImpactAnalysisService } from '../../services/PolicyImpactAnalysisService';
import { policyRegistryService } from '../../services/PolicyRegistryService';
import type { TestScenario } from '../../types';
import type { PolicyVersion, PolicyState } from '../../types/policy';
import type { ImpactAnalysis, AffectedScenario } from '../../types/impact';

vi.mock('../../services/PolicyRegistryService');
vi.mock('../../lib/supabase');

describe('PolicyImpactAnalysisService', () => {
  const mockPolicyId = 'policy-123';
  const mockOldVersionId = 'version-1';
  const mockNewVersionId = 'version-2';
  const mockUserId = 'user-123';

  const mockOldVersion: PolicyVersion = {
    id: mockOldVersionId,
    policyId: mockPolicyId,
    version: '1.0.0',
    code: 'function evaluate(scenario) { return { action: "ALLOW", reason: "Test", metadata: {} }; }',
    metadata: {
      tags: ['test'],
      category: 'security',
      providers: ['openai'],
      models: ['gpt-4'],
      estimatedCost: 0.001,
      testCoverage: 80
    },
    createdBy: mockUserId,
    createdAt: new Date('2024-01-01')
  };

  const mockNewVersion: PolicyVersion = {
    ...mockOldVersion,
    id: mockNewVersionId,
    version: '1.1.0',
    code: 'function evaluate(scenario) { return { action: "DENY", reason: "Updated", metadata: {} }; }',
    createdAt: new Date('2024-01-02')
  };

  const mockScenarios: TestScenario[] = [
    {
      id: 'scenario-1',
      timestamp: Date.now(),
      name: 'Test Scenario 1',
      provider: 'openai',
      model: 'gpt-4',
      prompt: 'Test prompt',
      parameters: {},
      expectedOutcome: 'ALLOW'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(policyRegistryService.getVersion).mockImplementation(async (versionId) => {
      if (versionId === mockOldVersionId) return mockOldVersion;
      if (versionId === mockNewVersionId) return mockNewVersion;
      throw new Error('Version not found');
    });
    vi.mocked(policyRegistryService.getPolicy).mockResolvedValue({
      id: mockPolicyId,
      workspaceId: 'workspace-123',
      name: 'Test Policy',
      description: 'Test policy description',
      currentVersion: '1.1.0',
      state: 'draft' as PolicyState,
      createdBy: mockUserId,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02')
    });
  });

  describe('analyzeImpact', () => {
    it('should analyze impact between two policy versions', async () => {
      const analysis = await policyImpactAnalysisService.analyzeImpact(
        mockPolicyId,
        mockOldVersionId,
        mockNewVersionId,
        mockScenarios
      );

      expect(analysis).toBeDefined();
      expect(analysis.policyId).toBe(mockPolicyId);
      expect(analysis.oldVersionId).toBe(mockOldVersionId);
      expect(analysis.newVersionId).toBe(mockNewVersionId);
    });

    it('should detect decision changes as breaking changes', async () => {
      const analysis = await policyImpactAnalysisService.analyzeImpact(
        mockPolicyId,
        mockOldVersionId,
        mockNewVersionId,
        mockScenarios
      );

      expect(analysis.affectedScenarios.length).toBeGreaterThan(0);
      
      const decisionChanges = analysis.affectedScenarios.flatMap(s => 
        s.changes.filter(c => c.field === 'decision')
      );
      
      expect(decisionChanges.length).toBeGreaterThan(0);
      expect(decisionChanges[0].severity).toBe('high');
    });
  });

  describe('runImpactTests', () => {
    it('should run all test scenarios against a policy version', async () => {
      const results = await policyImpactAnalysisService.runImpactTests(
        mockPolicyId,
        mockOldVersionId,
        mockScenarios
      );

      expect(results).toHaveLength(mockScenarios.length);
      expect(results[0].scenarioId).toBe(mockScenarios[0].id);
    });

    it('should handle policy execution errors gracefully', async () => {
      const brokenVersion: PolicyVersion = {
        ...mockOldVersion,
        code: 'throw new Error("Broken policy");'
      };

      vi.mocked(policyRegistryService.getVersion).mockResolvedValue(brokenVersion);

      const results = await policyImpactAnalysisService.runImpactTests(
        mockPolicyId,
        mockOldVersionId,
        mockScenarios
      );

      expect(results).toHaveLength(mockScenarios.length);
      results.forEach(result => {
        expect(result.success).toBe(false);
        expect(result.result.error).toBeDefined();
      });
    });
  });

  describe('compareResults', () => {
    it('should detect cost changes above 10 percent threshold', async () => {
      const oldResults = await policyImpactAnalysisService.runImpactTests(
        mockPolicyId,
        mockOldVersionId,
        mockScenarios
      );

      const newResults = oldResults.map(r => ({
        ...r,
        result: {
          ...r.result,
          metadata: {
            ...r.result.metadata,
            estimatedCost: r.result.metadata.estimatedCost * 1.15
          }
        }
      }));

      const affectedScenarios = await policyImpactAnalysisService.compareResults(
        oldResults,
        newResults
      );

      const costChanges = affectedScenarios.flatMap(s => 
        s.changes.filter(c => c.field === 'cost')
      );

      expect(costChanges.length).toBeGreaterThan(0);
    });

    it('should detect latency changes above 20 percent threshold', async () => {
      const oldResults = await policyImpactAnalysisService.runImpactTests(
        mockPolicyId,
        mockOldVersionId,
        mockScenarios
      );

      const newResults = oldResults.map(r => ({
        ...r,
        executionTime: r.executionTime * 1.25
      }));

      const affectedScenarios = await policyImpactAnalysisService.compareResults(
        oldResults,
        newResults
      );

      const latencyChanges = affectedScenarios.flatMap(s => 
        s.changes.filter(c => c.field === 'latency')
      );

      expect(latencyChanges.length).toBeGreaterThan(0);
    });

    it('should classify severity correctly', async () => {
      const oldResults = await policyImpactAnalysisService.runImpactTests(
        mockPolicyId,
        mockOldVersionId,
        mockScenarios
      );

      const highCostResults = oldResults.map(r => ({
        ...r,
        result: {
          ...r.result,
          metadata: {
            ...r.result.metadata,
            estimatedCost: r.result.metadata.estimatedCost * 1.30
          }
        }
      }));

      const affectedScenarios = await policyImpactAnalysisService.compareResults(
        oldResults,
        highCostResults
      );

      const costChanges = affectedScenarios.flatMap(s => 
        s.changes.filter(c => c.field === 'cost')
      );

      costChanges.forEach(change => {
        expect(['medium', 'high']).toContain(change.severity);
      });
    });
  });

  describe('filterBySeverity', () => {
    it('should filter impacts by severity level', () => {
      const mockAffectedScenarios: AffectedScenario[] = [
        {
          scenarioId: 'scenario-1',
          scenarioName: 'Scenario 1',
          impactType: 'breaking',
          changes: [{
            field: 'decision',
            oldValue: 'ALLOW',
            newValue: 'DENY',
            severity: 'high',
            description: 'Decision changed'
          }]
        },
        {
          scenarioId: 'scenario-2',
          scenarioName: 'Scenario 2',
          impactType: 'warning',
          changes: [{
            field: 'cost',
            oldValue: 0.001,
            newValue: 0.0015,
            percentageChange: 50,
            severity: 'medium',
            description: 'Cost increased'
          }]
        }
      ];

      const highSeverity = policyImpactAnalysisService.filterBySeverity(
        mockAffectedScenarios,
        'high'
      );
      expect(highSeverity).toHaveLength(1);

      const mediumSeverity = policyImpactAnalysisService.filterBySeverity(
        mockAffectedScenarios,
        'medium'
      );
      expect(mediumSeverity).toHaveLength(1);
    });
  });

  describe('exportImpactReport', () => {
    const mockAnalysis: ImpactAnalysis = {
      policyId: mockPolicyId,
      oldVersionId: mockOldVersionId,
      newVersionId: mockNewVersionId,
      affectedScenarios: [{
        scenarioId: 'scenario-1',
        scenarioName: 'Test Scenario',
        impactType: 'breaking',
        changes: [{
          field: 'decision',
          oldValue: 'ALLOW',
          newValue: 'DENY',
          severity: 'high',
          description: 'Decision changed'
        }]
      }],
      summary: {
        totalScenarios: 1,
        affectedScenarios: 1,
        breakingChanges: 1,
        warnings: 0,
        infoChanges: 0
      },
      recommendation: 'reject',
      analyzedAt: new Date()
    };

    it('should export impact report as CSV', async () => {
      const csv = await policyImpactAnalysisService.exportImpactReport(
        mockPolicyId,
        mockAnalysis,
        { format: 'csv' }
      );

      expect(typeof csv).toBe('string');
      expect(csv).toContain('Scenario,Impact Type');
    });

    it('should export impact report as PDF', async () => {
      const pdf = await policyImpactAnalysisService.exportImpactReport(
        mockPolicyId,
        mockAnalysis,
        { format: 'pdf' }
      );

      expect(pdf).toBeInstanceOf(Blob);
    });
  });

  describe('logImpactAnalysis', () => {
    it('should handle logging when Supabase is not configured', async () => {
      const mockAnalysis: ImpactAnalysis = {
        policyId: mockPolicyId,
        oldVersionId: mockOldVersionId,
        newVersionId: mockNewVersionId,
        affectedScenarios: [],
        summary: {
          totalScenarios: 0,
          affectedScenarios: 0,
          breakingChanges: 0,
          warnings: 0,
          infoChanges: 0
        },
        recommendation: 'approve',
        analyzedAt: new Date()
      };

      await expect(
        policyImpactAnalysisService.logImpactAnalysis(
          mockPolicyId,
          mockAnalysis,
          mockUserId
        )
      ).resolves.not.toThrow();
    });
  });
});