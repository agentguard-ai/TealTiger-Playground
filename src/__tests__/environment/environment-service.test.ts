import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EnvironmentService } from '@/services/EnvironmentService';
import type { EnvironmentName } from '@/types/environment';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
  isSupabaseConfigured: vi.fn(() => true),
}));

describe('EnvironmentService', () => {
  let environmentService: EnvironmentService;
  let mockSupabase: any;

  beforeEach(async () => {
    environmentService = new EnvironmentService();
    const supabaseModule = await import('@/lib/supabase');
    mockSupabase = supabaseModule.supabase;
    vi.clearAllMocks();
  });

  describe('createEnvironment', () => {
    it('should create a new environment', async () => {
      const mockEnvironment = {
        id: 'env-123',
        workspace_id: 'workspace-123',
        name: 'development',
        config: {
          apiEndpoints: {},
          rateLimits: {},
          budgetLimits: {},
          rbacRules: [],
          customSettings: {},
        },
        deployed_policies: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'deployment_environments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockEnvironment, error: null }),
              }),
            }),
          };
        }
        if (table === 'audit_log') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
      });

      const result = await environmentService.createEnvironment({
        workspaceId: 'workspace-123',
        name: 'development',
        config: {
          apiEndpoints: {},
          rateLimits: {},
          budgetLimits: {},
          rbacRules: [],
          customSettings: {},
        },
      });

      expect(result.name).toBe('development');
      expect(result.workspaceId).toBe('workspace-123');
      expect(result.deployedPolicies).toEqual([]);
    });

    it('should throw error if environment already exists', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'existing-env' },
                error: null,
              }),
            }),
          }),
        }),
      });

      await expect(
        environmentService.createEnvironment({
          workspaceId: 'workspace-123',
          name: 'development',
          config: {
            apiEndpoints: {},
            rateLimits: {},
            budgetLimits: {},
            rbacRules: [],
            customSettings: {},
          },
        })
      ).rejects.toThrow('already exists');
    });
  });

  describe('updateConfig', () => {
    it('should update environment configuration', async () => {
      const currentEnv = {
        id: 'env-123',
        workspace_id: 'workspace-123',
        name: 'development',
        config: {
          apiEndpoints: { service1: 'https://api1.com' },
          rateLimits: { requestsPerHour: 1000 },
          budgetLimits: {},
          rbacRules: [],
          customSettings: {},
        },
        deployed_policies: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const updatedEnv = {
        ...currentEnv,
        config: {
          ...currentEnv.config,
          rateLimits: { requestsPerHour: 2000 },
        },
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'deployment_environments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn()
                  .mockResolvedValueOnce({ data: currentEnv, error: null })
                  .mockResolvedValueOnce({ data: updatedEnv, error: null }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: updatedEnv, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'audit_log') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
      });

      const result = await environmentService.updateConfig({
        environmentId: 'env-123',
        config: {
          rateLimits: { requestsPerHour: 2000 },
        },
      });

      expect(result.config.rateLimits.requestsPerHour).toBe(2000);
      expect(result.config.apiEndpoints.service1).toBe('https://api1.com');
    });

    it('should throw error if environment not found', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
          }),
        }),
      });

      await expect(
        environmentService.updateConfig({
          environmentId: 'nonexistent',
          config: { rateLimits: {} },
        })
      ).rejects.toThrow('Environment not found');
    });
  });

  describe('promotePolicy', () => {
    it('should promote policy to environment', async () => {
      const mockPolicy = {
        id: 'policy-123',
        workspace_id: 'workspace-123',
        name: 'Test Policy',
      };

      const mockEnvironment = {
        id: 'env-123',
        workspace_id: 'workspace-123',
        name: 'staging',
        config: {},
        deployed_policies: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'policies') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockPolicy, error: null }),
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
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
      });

      const result = await environmentService.promotePolicy({
        policyId: 'policy-123',
        versionId: 'version-123',
        targetEnvironment: 'staging',
        userId: 'user-123',
      });

      expect(result.policyId).toBe('policy-123');
      expect(result.versionId).toBe('version-123');
      expect(result.status).toBe('active');
    });

    it('should deactivate previous version when promoting new version', async () => {
      const mockPolicy = {
        id: 'policy-123',
        workspace_id: 'workspace-123',
        name: 'Test Policy',
      };

      const mockEnvironment = {
        id: 'env-123',
        workspace_id: 'workspace-123',
        name: 'production',
        config: {},
        deployed_policies: [
          {
            policyId: 'policy-123',
            versionId: 'version-old',
            deployedAt: new Date(Date.now() - 86400000).toISOString(),
            deployedBy: 'user-456',
            status: 'active',
          },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      let updatedPolicies: any[] = [];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'policies') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockPolicy, error: null }),
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
            update: vi.fn().mockImplementation((data: any) => {
              updatedPolicies = data.deployed_policies;
              return { eq: vi.fn().mockResolvedValue({ error: null }) };
            }),
          };
        }
        if (table === 'audit_log') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
      });

      await environmentService.promotePolicy({
        policyId: 'policy-123',
        versionId: 'version-new',
        targetEnvironment: 'production',
        userId: 'user-123',
      });

      expect(updatedPolicies).toHaveLength(2);
      expect(updatedPolicies[0].status).toBe('inactive');
      expect(updatedPolicies[1].status).toBe('active');
      expect(updatedPolicies[1].versionId).toBe('version-new');
    });

    it('should throw error if policy not found', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
          }),
        }),
      });

      await expect(
        environmentService.promotePolicy({
          policyId: 'nonexistent',
          versionId: 'version-123',
          targetEnvironment: 'staging',
          userId: 'user-123',
        })
      ).rejects.toThrow('Policy not found');
    });

    it('should throw error if environment not found', async () => {
      const mockPolicy = {
        id: 'policy-123',
        workspace_id: 'workspace-123',
        name: 'Test Policy',
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'policies') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockPolicy, error: null }),
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
      });

      await expect(
        environmentService.promotePolicy({
          policyId: 'policy-123',
          versionId: 'version-123',
          targetEnvironment: 'staging',
          userId: 'user-123',
        })
      ).rejects.toThrow('Environment "staging" not found');
    });
  });

  describe('rollback', () => {
    it('should rollback to previous version', async () => {
      const mockEnvironment = {
        id: 'env-123',
        workspace_id: 'workspace-123',
        name: 'production',
        config: {},
        deployed_policies: [
          {
            policyId: 'policy-123',
            versionId: 'version-new',
            deployedAt: new Date().toISOString(),
            deployedBy: 'user-123',
            status: 'active',
          },
          {
            policyId: 'policy-123',
            versionId: 'version-old',
            deployedAt: new Date(Date.now() - 86400000).toISOString(),
            deployedBy: 'user-456',
            status: 'inactive',
          },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      let updatedPolicies: any[] = [];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'deployment_environments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockEnvironment, error: null }),
              }),
            }),
            update: vi.fn().mockImplementation((data: any) => {
              updatedPolicies = data.deployed_policies;
              return { eq: vi.fn().mockResolvedValue({ error: null }) };
            }),
          };
        }
        if (table === 'audit_log') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
      });

      const result = await environmentService.rollback('env-123', 'policy-123');

      expect(result.versionId).toBe('version-old');
      expect(result.status).toBe('active');
      expect(updatedPolicies.find((p: any) => p.versionId === 'version-old')?.status).toBe('active');
      expect(updatedPolicies.find((p: any) => p.versionId === 'version-new')?.status).toBe('inactive');
    });

    it('should throw error if no previous version available', async () => {
      const mockEnvironment = {
        id: 'env-123',
        workspace_id: 'workspace-123',
        name: 'production',
        config: {},
        deployed_policies: [
          {
            policyId: 'policy-123',
            versionId: 'version-only',
            deployedAt: new Date().toISOString(),
            deployedBy: 'user-123',
            status: 'active',
          },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockEnvironment, error: null }),
          }),
        }),
      });

      await expect(
        environmentService.rollback('env-123', 'policy-123')
      ).rejects.toThrow('No previous version available');
    });

    it('should throw error if environment not found', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
          }),
        }),
      });

      await expect(
        environmentService.rollback('nonexistent', 'policy-123')
      ).rejects.toThrow('Environment not found');
    });
  });

  describe('listDeployedPolicies', () => {
    it('should list all deployed policies in environment', async () => {
      const mockEnvironment = {
        deployed_policies: [
          {
            policyId: 'policy-1',
            versionId: 'version-1',
            deployedAt: new Date().toISOString(),
            deployedBy: 'user-123',
            status: 'active',
          },
          {
            policyId: 'policy-2',
            versionId: 'version-2',
            deployedAt: new Date().toISOString(),
            deployedBy: 'user-456',
            status: 'active',
          },
        ],
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockEnvironment, error: null }),
          }),
        }),
      });

      const result = await environmentService.listDeployedPolicies('env-123');

      expect(result).toHaveLength(2);
      expect(result[0].policyId).toBe('policy-1');
      expect(result[1].policyId).toBe('policy-2');
    });

    it('should return empty array if no policies deployed', async () => {
      const mockEnvironment = {
        deployed_policies: [],
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockEnvironment, error: null }),
          }),
        }),
      });

      const result = await environmentService.listDeployedPolicies('env-123');

      expect(result).toEqual([]);
    });
  });

  describe('getEnvironmentScenarios', () => {
    it('should get environment-specific test scenarios', async () => {
      const mockScenarios = [
        {
          id: 'scenario-1',
          name: 'Test Scenario 1',
          description: 'Description 1',
          scenario: { input: 'test' },
          expected: { output: 'result' },
          environment_id: 'env-123',
        },
        {
          id: 'scenario-2',
          name: 'Test Scenario 2',
          description: 'Description 2',
          scenario: { input: 'test2' },
          expected: { output: 'result2' },
          environment_id: 'env-123',
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: mockScenarios, error: null }),
        }),
      });

      const result = await environmentService.getEnvironmentScenarios('env-123');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Test Scenario 1');
      expect(result[1].name).toBe('Test Scenario 2');
    });
  });

  describe('listEnvironments', () => {
    it('should list all environments for a workspace', async () => {
      const mockEnvironments = [
        {
          id: 'env-1',
          workspace_id: 'workspace-123',
          name: 'development',
          config: {},
          deployed_policies: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'env-2',
          workspace_id: 'workspace-123',
          name: 'staging',
          config: {},
          deployed_policies: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'env-3',
          workspace_id: 'workspace-123',
          name: 'production',
          config: {},
          deployed_policies: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockEnvironments, error: null }),
          }),
        }),
      });

      const result = await environmentService.listEnvironments('workspace-123');

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('development');
      expect(result[1].name).toBe('staging');
      expect(result[2].name).toBe('production');
    });
  });

  describe('getEnvironmentByName', () => {
    it('should get environment by name', async () => {
      const mockEnvironment = {
        id: 'env-123',
        workspace_id: 'workspace-123',
        name: 'production',
        config: {},
        deployed_policies: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockEnvironment, error: null }),
            }),
          }),
        }),
      });

      const result = await environmentService.getEnvironmentByName('workspace-123', 'production');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('production');
    });

    it('should return null if environment not found', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' },
              }),
            }),
          }),
        }),
      });

      const result = await environmentService.getEnvironmentByName('workspace-123', 'nonexistent' as EnvironmentName);

      expect(result).toBeNull();
    });
  });
});
