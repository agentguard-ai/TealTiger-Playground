/**
 * RBAC Simulator Service Tests
 * Requirements: 13.1-13.10
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RBACSimulatorService } from '../../services/RBACSimulatorService';
import type { RoleDefinition, EvaluationScenario } from '../../types/rbac';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: mockRoleData, error: null })),
        })),
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [mockRoleData], error: null })),
          single: vi.fn(() => Promise.resolve({ data: { code: mockPolicyCode }, error: null })),
        })),
      })),
    })),
  },
}));

const mockRoleData = {
  role_id: 'admin',
  name: 'Administrator',
  permissions: ['read', 'write', 'delete'],
  attributes: { department: 'IT', clearanceLevel: 'high' },
  metadata: {
    description: 'Full access',
    groups: ['admins'],
    level: 10,
    customFields: {},
  },
};

const mockPolicyCode = `
function evaluate(context, scenario) {
  if (context.role.permissions.includes('write')) {
    return { allowed: true, reason: 'Has write permission', metadata: {} };
  }
  return { allowed: false, reason: 'Missing write permission', metadata: {} };
}
`;

describe('RBACSimulatorService', () => {
  let service: RBACSimulatorService;
  let testRole: RoleDefinition;

  beforeEach(() => {
    service = new RBACSimulatorService();
    testRole = {
      id: 'admin',
      name: 'Administrator',
      permissions: ['read', 'write', 'delete'],
      attributes: { department: 'IT', clearanceLevel: 'high' },
      metadata: {
        description: 'Full access',
        groups: ['admins'],
        level: 10,
        customFields: {},
      },
    };
  });

  describe('defineRole', () => {
    it('should define a new role', async () => {
      const result = await service.defineRole('workspace-1', testRole);
      
      expect(result).toBeDefined();
      expect(result.id).toBe('admin');
      expect(result.name).toBe('Administrator');
      expect(result.permissions).toEqual(['read', 'write', 'delete']);
    });

    it('should store role with all required fields', async () => {
      const result = await service.defineRole('workspace-1', testRole);
      
      expect(result.attributes).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.description).toBeDefined();
      expect(result.metadata.groups).toBeDefined();
      expect(result.metadata.level).toBeDefined();
    });
  });

  describe('listRoles', () => {
    it('should list all roles for a workspace', async () => {
      const roles = await service.listRoles('workspace-1');
      
      expect(Array.isArray(roles)).toBe(true);
      expect(roles.length).toBeGreaterThan(0);
      expect(roles[0]).toHaveProperty('id');
      expect(roles[0]).toHaveProperty('name');
      expect(roles[0]).toHaveProperty('permissions');
    });
  });

  describe('simulateWithRole', () => {
    it('should simulate policy evaluation with a role', async () => {
      const scenario: EvaluationScenario = {
        prompt: 'Test prompt',
        provider: 'openai',
        model: 'gpt-4',
        parameters: {},
      };

      const result = await service.simulateWithRole(
        'policy-1',
        'version-1',
        testRole,
        scenario
      );

      expect(result).toBeDefined();
      expect(result.role).toEqual(testRole);
      expect(result.decision).toHaveProperty('allowed');
      expect(result.decision).toHaveProperty('reason');
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('should inject role context into policy execution', async () => {
      const scenario: EvaluationScenario = {
        prompt: 'Test prompt',
        provider: 'openai',
        model: 'gpt-4',
        parameters: {},
      };

      const result = await service.simulateWithRole(
        'policy-1',
        'version-1',
        testRole,
        scenario
      );

      expect(result.decision.allowed).toBe(true);
      expect(result.decision.reason).toContain('write permission');
    });
  });

  describe('simulateAcrossRoles', () => {
    it('should simulate policy across multiple roles', async () => {
      const roles: RoleDefinition[] = [
        testRole,
        {
          id: 'user',
          name: 'User',
          permissions: ['read'],
          attributes: { department: 'Engineering' },
          metadata: { description: 'Read only', groups: ['users'], level: 5, customFields: {} },
        },
      ];

      const scenario: EvaluationScenario = {
        prompt: 'Test prompt',
        provider: 'openai',
        model: 'gpt-4',
        parameters: {},
      };

      const results = await service.simulateAcrossRoles(
        'policy-1',
        'version-1',
        roles,
        scenario
      );

      expect(results).toHaveLength(2);
      expect(results[0].role.id).toBe('admin');
      expect(results[1].role.id).toBe('user');
    });
  });

  describe('compareRoleResults', () => {
    it('should detect decision differences between roles', () => {
      const results = [
        {
          role: testRole,
          decision: { allowed: true, reason: 'Has permission', metadata: {} },
          executionTime: 10,
          metadata: {},
        },
        {
          role: {
            id: 'user',
            name: 'User',
            permissions: ['read'],
            attributes: {},
            metadata: { description: '', groups: [], level: 1, customFields: {} },
          },
          decision: { allowed: false, reason: 'Missing permission', metadata: {} },
          executionTime: 12,
          metadata: {},
        },
      ];

      const comparison = service.compareRoleResults(results);

      expect(comparison.differences.length).toBeGreaterThan(0);
      expect(comparison.summary).toContain('difference');
      
      const decisionDiff = comparison.differences.find((d) => d.field === 'decision');
      expect(decisionDiff).toBeDefined();
      expect(decisionDiff?.difference).toContain('ALLOW');
      expect(decisionDiff?.difference).toContain('DENY');
    });

    it('should detect no differences when results are identical', () => {
      const results = [
        {
          role: testRole,
          decision: { allowed: true, reason: 'Same reason', metadata: {} },
          executionTime: 10,
          metadata: {},
        },
        {
          role: { ...testRole, id: 'admin2', name: 'Admin 2' },
          decision: { allowed: true, reason: 'Same reason', metadata: {} },
          executionTime: 11,
          metadata: {},
        },
      ];

      const comparison = service.compareRoleResults(results);

      expect(comparison.summary).toContain('identical');
    });

    it('should highlight execution time differences', () => {
      const results = [
        {
          role: testRole,
          decision: { allowed: true, reason: 'Same', metadata: {} },
          executionTime: 10,
          metadata: {},
        },
        {
          role: { ...testRole, id: 'user', name: 'User' },
          decision: { allowed: true, reason: 'Same', metadata: {} },
          executionTime: 150,
          metadata: {},
        },
      ];

      const comparison = service.compareRoleResults(results);

      const timeDiff = comparison.differences.find((d) => d.field === 'executionTime');
      expect(timeDiff).toBeDefined();
    });
  });

  describe('importRoles', () => {
    it('should import roles from valid JSON', async () => {
      const rolesJson = JSON.stringify([testRole]);

      const imported = await service.importRoles('workspace-1', rolesJson);

      expect(imported).toHaveLength(1);
      expect(imported[0].id).toBe('admin');
    });

    it('should reject invalid JSON', async () => {
      const invalidJson = 'not valid json';

      await expect(service.importRoles('workspace-1', invalidJson)).rejects.toThrow(
        'Invalid JSON format'
      );
    });

    it('should reject non-array JSON', async () => {
      const nonArrayJson = JSON.stringify({ role: testRole });

      await expect(service.importRoles('workspace-1', nonArrayJson)).rejects.toThrow(
        'array of roles'
      );
    });

    it('should validate role structure during import', async () => {
      const invalidRoles = JSON.stringify([{ id: 'test' }]);

      await expect(service.importRoles('workspace-1', invalidRoles)).rejects.toThrow(
        'Invalid role structure'
      );
    });
  });

  describe('exportRoles', () => {
    it('should export roles as JSON', async () => {
      const json = await service.exportRoles('workspace-1');

      expect(json).toBeDefined();
      const parsed = JSON.parse(json);
      expect(Array.isArray(parsed)).toBe(true);
    });

    it('should preserve role structure in export', async () => {
      const json = await service.exportRoles('workspace-1');
      const parsed = JSON.parse(json);

      expect(parsed[0]).toHaveProperty('id');
      expect(parsed[0]).toHaveProperty('name');
      expect(parsed[0]).toHaveProperty('permissions');
      expect(parsed[0]).toHaveProperty('attributes');
      expect(parsed[0]).toHaveProperty('metadata');
    });
  });

  describe('import/export round-trip', () => {
    it('should preserve data through export and import', async () => {
      const exported = await service.exportRoles('workspace-1');
      const imported = await service.importRoles('workspace-2', exported);

      expect(imported).toHaveLength(1);
      expect(imported[0].id).toBe(mockRoleData.role_id);
      expect(imported[0].name).toBe(mockRoleData.name);
      expect(imported[0].permissions).toEqual(mockRoleData.permissions);
    });
  });
});
