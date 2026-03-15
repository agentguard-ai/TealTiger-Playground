/**
 * RBAC Simulator Types
 * Requirements: 13.1-13.10
 */

export interface RoleDefinition {
  id: string;
  name: string;
  permissions: string[];
  attributes: Record<string, any>;
  metadata: RoleMetadata;
}

export interface RoleMetadata {
  description: string;
  groups: string[];
  level: number;
  customFields: Record<string, any>;
}

export interface SimulationContext {
  role: RoleDefinition;
  user: {
    id: string;
    attributes: Record<string, any>;
  };
  environment: {
    timestamp: Date;
    location?: string;
    [key: string]: any;
  };
}

export interface SimulationResult {
  role: RoleDefinition;
  decision: PolicyDecision;
  executionTime: number;
  metadata: Record<string, any>;
}

export interface PolicyDecision {
  allowed: boolean;
  reason: string;
  metadata: Record<string, any>;
}

export interface EvaluationScenario {
  prompt: string;
  provider: string;
  model: string;
  parameters: Record<string, any>;
}

export interface RoleComparison {
  differences: RoleDifference[];
  summary: string;
}

export interface RoleDifference {
  role1: string;
  role2: string;
  field: string;
  difference: string;
}

// Example role definitions for common patterns
export const EXAMPLE_ROLES: RoleDefinition[] = [
  {
    id: 'admin',
    name: 'Administrator',
    permissions: ['read', 'write', 'delete', 'approve', 'manage_users'],
    attributes: {
      department: 'IT',
      clearanceLevel: 'high',
      canAccessPII: true,
    },
    metadata: {
      description: 'Full system access with all permissions',
      groups: ['admins', 'power_users'],
      level: 10,
      customFields: {},
    },
  },
  {
    id: 'user',
    name: 'Standard User',
    permissions: ['read', 'write'],
    attributes: {
      department: 'Engineering',
      clearanceLevel: 'medium',
      canAccessPII: false,
    },
    metadata: {
      description: 'Standard user with read/write access',
      groups: ['users'],
      level: 5,
      customFields: {},
    },
  },
  {
    id: 'guest',
    name: 'Guest',
    permissions: ['read'],
    attributes: {
      department: 'External',
      clearanceLevel: 'low',
      canAccessPII: false,
    },
    metadata: {
      description: 'Read-only guest access',
      groups: ['guests'],
      level: 1,
      customFields: {},
    },
  },
];
