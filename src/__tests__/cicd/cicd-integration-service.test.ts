import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CICDIntegrationService } from '@/services/CICDIntegrationService';
import type { CICDConfig, TestRunResult } from '@/types/cicd';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
  isSupabaseConfigured: vi.fn(() => true),
}));

describe('CICDIntegrationService', () => {
  let service: CICDIntegrationService;
  let mockSupabase: any;

  const defaultConfig: CICDConfig = {
    workspaceId: 'workspace-123',
    githubRepo: 'org/repo',
    branch: 'main',
    testSuiteId: 'suite-1',
    autoDeployOnMerge: false,
    targetEnvironment: 'staging',
  };

  beforeEach(async () => {
    service = new CICDIntegrationService();
    const supabaseModule = await import('@/lib/supabase');
    mockSupabase = supabaseModule.supabase;
    vi.clearAllMocks();

    // Default audit_log mock (used by most methods)
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'audit_log') {
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }
      return {};
    });
  });

  describe('generateWorkflow', () => {
    it('should generate valid GitHub Actions YAML with required structure', async () => {
      const yaml = await service.generateWorkflow(defaultConfig);

      expect(yaml).toContain('name: TealTiger Policy Validation');
      expect(yaml).toContain('runs-on: ubuntu-latest');
      expect(yaml).toContain('actions/checkout@v4');
      expect(yaml).toContain('actions/setup-node@v4');
      expect(yaml).toContain('npm ci');
    });

    it('should include policy syntax validation step', async () => {
      const yaml = await service.generateWorkflow(defaultConfig);
      expect(yaml).toContain('Validate policy syntax');
      expect(yaml).toContain('npm run lint:policies');
    });

    it('should include test suite execution step with suite ID', async () => {
      const yaml = await service.generateWorkflow(defaultConfig);
      expect(yaml).toContain('Run policy test suite');
      expect(yaml).toContain(`--suite ${defaultConfig.testSuiteId}`);
    });

    it('should include property-based test step', async () => {
      const yaml = await service.generateWorkflow(defaultConfig);
      expect(yaml).toContain('Run property-based tests');
      expect(yaml).toContain('npm run test:policies:pbt');
    });

    it('should include coverage report generation', async () => {
      const yaml = await service.generateWorkflow(defaultConfig);
      expect(yaml).toContain('Generate coverage report');
      expect(yaml).toContain('npm run test:policies:coverage');
    });

    it('should include PR comment step for pull requests', async () => {
      const yaml = await service.generateWorkflow(defaultConfig);
      expect(yaml).toContain('Post test results to PR');
      expect(yaml).toContain("github.event_name == 'pull_request'");
    });

    it('should include deploy job when autoDeployOnMerge is true', async () => {
      const config: CICDConfig = { ...defaultConfig, autoDeployOnMerge: true };
      const yaml = await service.generateWorkflow(config);

      expect(yaml).toContain('deploy:');
      expect(yaml).toContain('Deploy Policy');
      expect(yaml).toContain(`Deploy to ${config.targetEnvironment}`);
      expect(yaml).toContain('TEALTIGER_DEPLOY_TOKEN');
    });

    it('should NOT include deploy job when autoDeployOnMerge is false', async () => {
      const yaml = await service.generateWorkflow(defaultConfig);
      expect(yaml).not.toContain('deploy:');
      expect(yaml).not.toContain('Deploy Policy');
    });

    it('should use the configured branch for triggers', async () => {
      const config: CICDConfig = { ...defaultConfig, branch: 'develop' };
      const yaml = await service.generateWorkflow(config);
      expect(yaml).toContain('branches: [develop]');
    });

    it('should include free tier constraint comment', async () => {
      const yaml = await service.generateWorkflow(defaultConfig);
      expect(yaml).toContain('2,000 minutes/month');
    });

    it('should set timeout-minutes to stay within free tier', async () => {
      const yaml = await service.generateWorkflow(defaultConfig);
      expect(yaml).toContain('timeout-minutes: 10');
    });
  });

  describe('validateSyntax', () => {
    it('should validate correct TypeScript policy code', async () => {
      const code = `export default function evaluate(request) {
  if (request.prompt.includes('secret')) {
    return { action: 'DENY', reason: 'Contains sensitive content' };
  }
  return { action: 'ALLOW', reason: 'Safe content' };
}`;
      const result = await service.validateSyntax(code);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect unclosed braces', async () => {
      const code = `export default function evaluate(request) {
  if (request.prompt) {
    return { action: 'DENY' };
`;
      const result = await service.validateSyntax(code);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('unclosed brace'))).toBe(true);
    });

    it('should detect unclosed parentheses', async () => {
      const code = `export default function evaluate(request {
  return { action: 'ALLOW' };
}`;
      const result = await service.validateSyntax(code);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('unclosed parenthesis'))).toBe(true);
    });

    it('should detect empty policy code', async () => {
      const result = await service.validateSyntax('');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('empty'))).toBe(true);
    });

    it('should warn when no export statement is present', async () => {
      const code = `function evaluate(request) {
  return { action: 'ALLOW' };
}`;
      const result = await service.validateSyntax(code);
      expect(result.warnings.some(w => w.message.includes('export'))).toBe(true);
    });

    it('should handle code with comments correctly', async () => {
      const code = `// This is a policy
/* Multi-line
   comment */
export default function evaluate(request) {
  return { action: 'ALLOW' };
}`;
      const result = await service.validateSyntax(code);
      expect(result.isValid).toBe(true);
    });

    it('should handle strings with braces inside', async () => {
      const code = `export default function evaluate(request) {
  const msg = "{ not a real brace }";
  return { action: 'ALLOW' };
}`;
      const result = await service.validateSyntax(code);
      expect(result.isValid).toBe(true);
    });
  });

  describe('runTestSuite', () => {
    it('should run tests and return results with pass/fail counts', async () => {
      const mockVersion = {
        code: 'export default function evaluate() { return { action: "DENY" }; }',
        metadata: {},
      };
      const mockTests = [
        { id: 't1', name: 'Test 1', scenario: { expectedOutcome: 'DENY' }, expected: { action: 'DENY' } },
        { id: 't2', name: 'Test 2', scenario: { expectedOutcome: 'ALLOW' }, expected: { action: 'ALLOW' } },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'policy_versions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockVersion, error: null }),
              }),
            }),
          };
        }
        if (table === 'policy_tests') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: mockTests, error: null }),
            }),
          };
        }
        if (table === 'policies') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { workspace_id: 'ws-1' }, error: null }),
              }),
            }),
          };
        }
        if (table === 'audit_log') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return {};
      });

      const result = await service.runTestSuite('policy-1', 'version-1', 'suite-1');

      expect(result.policyId).toBe('policy-1');
      expect(result.versionId).toBe('version-1');
      expect(result.testSuiteId).toBe('suite-1');
      expect(result.passed + result.failed + result.skipped).toBe(2);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should skip tests with missing scenario or expected data', async () => {
      const mockVersion = {
        code: 'export default function evaluate() { return { action: "ALLOW" }; }',
        metadata: {},
      };
      const mockTests = [
        { id: 't1', name: 'Incomplete', scenario: null, expected: null },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'policy_versions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockVersion, error: null }),
              }),
            }),
          };
        }
        if (table === 'policy_tests') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: mockTests, error: null }),
            }),
          };
        }
        if (table === 'policies') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { workspace_id: 'ws-1' }, error: null }),
              }),
            }),
          };
        }
        if (table === 'audit_log') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return {};
      });

      const result = await service.runTestSuite('policy-1', 'version-1', 'suite-1');
      expect(result.skipped).toBe(1);
      expect(result.passed).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('should throw when policy version is not found', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'policy_versions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
              }),
            }),
          };
        }
        return {};
      });

      await expect(
        service.runTestSuite('policy-1', 'bad-version', 'suite-1')
      ).rejects.toEqual(expect.objectContaining({ message: 'Policy version not found' }));
    });
  });

  describe('generateCoverageReport', () => {
    it('should generate a coverage report from test results', async () => {
      const policyCode = `export default function evaluate(request) {
  // Check for PII
  if (request.prompt.includes('SSN')) {
    return { action: 'DENY', reason: 'PII detected' };
  }
  return { action: 'ALLOW', reason: 'Safe' };
}`;

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'policy_versions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { code: policyCode }, error: null }),
              }),
            }),
          };
        }
        if (table === 'policies') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { workspace_id: 'ws-1' }, error: null }),
              }),
            }),
          };
        }
        if (table === 'audit_log') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return {};
      });

      const testResult: TestRunResult = {
        id: 'run-1',
        policyId: 'policy-1',
        versionId: 'version-1',
        testSuiteId: 'suite-1',
        passed: 3,
        failed: 1,
        skipped: 0,
        coverage: 75,
        duration: 100,
        timestamp: new Date(),
        failures: [],
      };

      const report = await service.generateCoverageReport(testResult);

      expect(report.totalLines).toBeGreaterThan(0);
      expect(report.coveragePercentage).toBeGreaterThanOrEqual(0);
      expect(report.coveragePercentage).toBeLessThanOrEqual(100);
      expect(report.coveredLines).toBeLessThanOrEqual(report.totalLines);
      expect(Array.isArray(report.uncoveredLines)).toBe(true);
    });
  });

  describe('postPRComment', () => {
    it('should format passing test results as markdown', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'policies') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { workspace_id: 'ws-1' }, error: null }),
              }),
            }),
          };
        }
        if (table === 'audit_log') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return {};
      });

      const result: TestRunResult = {
        id: 'run-1',
        policyId: 'policy-1',
        versionId: 'version-1',
        testSuiteId: 'suite-1',
        passed: 5,
        failed: 0,
        skipped: 0,
        coverage: 90,
        duration: 200,
        timestamp: new Date(),
        failures: [],
      };

      const comment = await service.postPRComment('org/repo', 42, result);

      expect(comment).toContain('TealTiger Policy Test Results');
      expect(comment).toContain('✅ PASSED');
      expect(comment).toContain('| ✅ Passed | 5 |');
      expect(comment).toContain('| ❌ Failed | 0 |');
      expect(comment).toContain('| 📈 Coverage | 90% |');
      expect(comment).not.toContain('This PR is blocked');
    });

    it('should include failure details and blocking notice when tests fail', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'policies') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { workspace_id: 'ws-1' }, error: null }),
              }),
            }),
          };
        }
        if (table === 'audit_log') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return {};
      });

      const result: TestRunResult = {
        id: 'run-1',
        policyId: 'policy-1',
        versionId: 'version-1',
        testSuiteId: 'suite-1',
        passed: 3,
        failed: 2,
        skipped: 0,
        coverage: 60,
        duration: 300,
        timestamp: new Date(),
        failures: [
          { testName: 'PII Detection', expected: { action: 'DENY' }, actual: { action: 'ALLOW' }, error: 'Mismatch' },
        ],
      };

      const comment = await service.postPRComment('org/repo', 42, result);

      expect(comment).toContain('❌ FAILED');
      expect(comment).toContain('Failed Tests');
      expect(comment).toContain('PII Detection');
      expect(comment).toContain('This PR is blocked');
    });
  });

  describe('autoDeploy', () => {
    it('should deploy policy to target environment', async () => {
      const mockEnvironment = {
        id: 'env-1',
        workspace_id: 'ws-1',
        name: 'staging',
        deployed_policies: [],
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'policies') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { workspace_id: 'ws-1' }, error: null }),
              }),
            }),
          };
        }
        if (table === 'deployment_environments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: mockEnvironment, error: null }),
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === 'audit_log') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return {};
      });

      const result = await service.autoDeploy('policy-1', 'version-1', 'staging');

      expect(result.status).toBe('success');
      expect(result.policyId).toBe('policy-1');
      expect(result.versionId).toBe('version-1');
      expect(result.environment).toBe('staging');
      expect(result.message).toContain('staging');
    });

    it('should return failed result when environment not found', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'policies') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { workspace_id: 'ws-1' }, error: null }),
              }),
            }),
          };
        }
        if (table === 'deployment_environments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
                }),
              }),
            }),
          };
        }
        if (table === 'audit_log') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return {};
      });

      const result = await service.autoDeploy('policy-1', 'version-1', 'production');

      expect(result.status).toBe('failed');
      expect(result.message).toContain('not found');
    });
  });
});
