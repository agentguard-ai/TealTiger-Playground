# RBAC Simulator Guide

The RBAC Simulator lets you test how your policies behave under different user roles and permissions. Define roles like Admin, User, and Guest, run policy evaluations with each role's context injected, and compare results side-by-side to verify your access control logic works as expected.

> The simulator runs entirely in the browser using your workspace's role definitions stored in Supabase.

## Table of Contents

- [Overview](#overview)
- [1. Defining Roles](#1-defining-roles)
- [2. Running Simulations](#2-running-simulations)
- [3. Comparing Role Results](#3-comparing-role-results)
- [4. Importing and Exporting Roles](#4-importing-and-exporting-roles)
- [5. Examples](#5-examples)
- [6. Tips and Best Practices](#6-tips-and-best-practices)

---

## Overview

The RBAC Simulator is available inside any policy view in your workspace. It has three tabs:

| Tab          | Purpose                                                    |
|--------------|------------------------------------------------------------|
| **Roles**    | Create, edit, and manage role definitions                  |
| **Simulate** | Run a policy evaluation with a selected role               |
| **Compare**  | View simulation results across multiple roles side-by-side |

Open the simulator from the policy editor — it appears below the code editor when you select a policy.

---

## 1. Defining Roles

A role represents a user type in your system. Each role has a name, a set of permissions, custom attributes, and metadata.

### Role Structure

```typescript
interface RoleDefinition {
  id: string;            // Unique identifier (e.g., "admin")
  name: string;          // Display name (e.g., "Administrator")
  permissions: string[]; // Permission strings (e.g., ["read", "write", "delete"])
  attributes: Record<string, any>; // Custom attributes injected into policy context
  metadata: {
    description: string;           // Human-readable description
    groups: string[];              // Group memberships
    level: number;                 // Numeric privilege level
    customFields: Record<string, any>; // Any additional fields
  };
}
```

### Creating a Role

1. Open the RBAC Simulator and go to the **Roles** tab
2. Click **"+ New Role"**
3. Fill in the role definition form:
   - **ID**: A unique slug (e.g., `data-analyst`)
   - **Name**: A display name (e.g., `Data Analyst`)
   - **Permissions**: A list of permission strings your policy checks against
   - **Attributes**: Key-value pairs representing user properties (department, clearance level, PII access, etc.)
   - **Metadata**: Description, group memberships, and privilege level
4. Click **Save**

The role is stored in your workspace and available for all team members.

### Editing a Role

Click **Edit** on any role card in the Roles tab. The role editor opens with the current values pre-filled. Make your changes and click Save.

### Built-in Example Roles

The simulator ships with three example roles to get you started:

| Role              | Permissions                              | Level | Key Attributes                     |
|-------------------|------------------------------------------|-------|------------------------------------|
| **Administrator** | read, write, delete, approve, manage_users | 10    | clearanceLevel: high, canAccessPII: true  |
| **Standard User** | read, write                              | 5     | clearanceLevel: medium, canAccessPII: false |
| **Guest**         | read                                     | 1     | clearanceLevel: low, canAccessPII: false   |

These load automatically when your workspace has no custom roles defined.

---

## 2. Running Simulations

Simulations execute your policy code with a specific role's context injected, so you can see exactly what decision the policy makes for each user type.

### How It Works

1. Go to the **Simulate** tab
2. Select one or more roles from the role list
3. Configure an evaluation scenario:
   - **Prompt**: The user prompt to evaluate
   - **Provider**: The LLM provider (e.g., `openai`)
   - **Model**: The model name (e.g., `gpt-4`)
   - **Parameters**: Any additional parameters your policy uses
4. Click **Run Simulation**

The simulator calls `simulateWithRole()` for each selected role. Your policy's `evaluate()` function receives a context object containing the role:

```typescript
// What your policy receives during simulation
{
  role: {
    id: "admin",
    name: "Administrator",
    permissions: ["read", "write", "delete", "approve", "manage_users"],
    attributes: { department: "IT", clearanceLevel: "high", canAccessPII: true },
    metadata: { ... }
  },
  user: {
    id: "sim-user-admin",
    attributes: { department: "IT", clearanceLevel: "high", canAccessPII: true }
  },
  environment: {
    timestamp: "2026-03-15T10:30:00Z",
    simulation: true
  }
}
```

### Simulation Results

Each result shows:

- **Decision**: ALLOW or DENY
- **Reason**: The policy's explanation for the decision
- **Execution time**: How long the evaluation took (in milliseconds)
- **Metadata**: Any additional data returned by the policy

### Simulating Across All Roles

Select multiple roles and run the simulation to evaluate the same scenario against every role at once. Results are collected and available in the Compare tab.

---

## 3. Comparing Role Results

The Compare tab shows simulation results side-by-side and highlights where roles produce different outcomes.

### What Gets Compared

The comparator checks three dimensions for every pair of roles:

| Dimension          | Flagged When                                    |
|--------------------|-------------------------------------------------|
| **Decision**       | One role gets ALLOW, another gets DENY          |
| **Reason**         | The policy returns different reason strings      |
| **Execution Time** | Difference exceeds 100ms between roles          |

### Reading the Comparison

- **Side-by-Side Results**: Each role's decision, reason, and timing displayed in columns
- **Difference Highlighter**: Flags specific differences with the two roles and the field that differs
- **Summary**: A plain-English summary like: *"Found 3 total difference(s) across 3 roles: 1 decision difference(s), 2 reason difference(s)."*

If all roles produce identical results, the summary reads: *"All 3 roles produced identical results."*

---

## 4. Importing and Exporting Roles

Role definitions can be shared across workspaces or teams using JSON import/export.

### Exporting Roles

1. Click the **Export** button in the simulator header
2. All roles in the current workspace are exported as a JSON file

The exported format is an array of `RoleDefinition` objects:

```json
[
  {
    "id": "admin",
    "name": "Administrator",
    "permissions": ["read", "write", "delete", "approve", "manage_users"],
    "attributes": {
      "department": "IT",
      "clearanceLevel": "high",
      "canAccessPII": true
    },
    "metadata": {
      "description": "Full system access with all permissions",
      "groups": ["admins", "power_users"],
      "level": 10,
      "customFields": {}
    }
  }
]
```

### Importing Roles

1. Click the **Import** button in the simulator header
2. Select a JSON file containing an array of role definitions
3. The simulator validates each role's structure (id, name, permissions, attributes, metadata are all required)
4. Valid roles are added to your workspace

Invalid roles are skipped with a console warning. The import reports how many roles were successfully added.

---

## 5. Examples

### Example 1: PII Access Control Policy

This policy allows or denies access to PII data based on the role's `canAccessPII` attribute.

```typescript
function evaluate(context, scenario) {
  const containsPII = scenario.parameters.containsPII || false;

  if (containsPII && !context.role.attributes.canAccessPII) {
    return {
      allowed: false,
      reason: `Role "${context.role.name}" does not have PII access`,
      metadata: { blockedField: 'canAccessPII' }
    };
  }

  return {
    allowed: true,
    reason: 'Access granted',
    metadata: {}
  };
}
```

**Simulation results across roles:**

| Role           | Decision | Reason                                        |
|----------------|----------|-----------------------------------------------|
| Administrator  | ALLOW    | Access granted                                |
| Standard User  | DENY     | Role "Standard User" does not have PII access |
| Guest          | DENY     | Role "Guest" does not have PII access         |

### Example 2: Permission-Based Write Guard

This policy checks whether the role has the `write` permission before allowing content generation.

```typescript
function evaluate(context, scenario) {
  if (!context.role.permissions.includes('write')) {
    return {
      allowed: false,
      reason: `Role "${context.role.name}" lacks write permission`,
      metadata: { requiredPermission: 'write' }
    };
  }

  return {
    allowed: true,
    reason: 'Write access confirmed',
    metadata: {}
  };
}
```

**Simulation results:**

| Role           | Decision | Reason                                  |
|----------------|----------|-----------------------------------------|
| Administrator  | ALLOW    | Write access confirmed                  |
| Standard User  | ALLOW    | Write access confirmed                  |
| Guest          | DENY     | Role "Guest" lacks write permission     |

### Example 3: Clearance-Level Gating

Gate access to sensitive models based on the role's clearance level.

```typescript
function evaluate(context, scenario) {
  const sensitiveModels = ['gpt-4', 'claude-3-opus'];
  const requiredLevel = 5;

  if (sensitiveModels.includes(scenario.model) && context.role.metadata.level < requiredLevel) {
    return {
      allowed: false,
      reason: `Level ${context.role.metadata.level} insufficient for ${scenario.model} (requires ${requiredLevel})`,
      metadata: { requiredLevel, actualLevel: context.role.metadata.level }
    };
  }

  return {
    allowed: true,
    reason: 'Model access granted',
    metadata: {}
  };
}
```

### Example 4: Custom Role for Data Analyst

Define a role tailored to a data analytics team:

```json
{
  "id": "data-analyst",
  "name": "Data Analyst",
  "permissions": ["read", "write", "export_data"],
  "attributes": {
    "department": "Analytics",
    "clearanceLevel": "medium",
    "canAccessPII": false,
    "maxCostPerRequest": 0.10
  },
  "metadata": {
    "description": "Analytics team member with data export access",
    "groups": ["analysts", "data_team"],
    "level": 6,
    "customFields": { "region": "us-east" }
  }
}
```

---

## 6. Tips and Best Practices

- **Start with the built-in roles.** Admin, User, and Guest cover the most common access patterns. Customize from there.
- **Use attributes for business logic.** Permissions control what actions are allowed; attributes (department, clearance, region) let your policies make context-aware decisions.
- **Test edge cases.** Create a role with zero permissions or conflicting attributes to verify your policy handles unexpected inputs gracefully.
- **Export roles to version control.** Keep your role definitions in your repo alongside your policies for reproducibility and CI/CD testing.
- **Check the `simulation: true` flag.** Your policy receives `context.environment.simulation = true` during simulations — use this to skip side effects (logging, external calls) in test runs.
- **Compare after every policy change.** Run a quick simulation across all roles after editing a policy to catch unintended access changes.

---

## Related Guides

- [Getting Started](./getting-started.md) — Workspace setup and policy basics
- [Governance Workflow](./governance-workflow.md) — Approval processes and policy lifecycle
- [CI/CD Integration](./cicd-integration.md) — Automated policy testing with GitHub Actions
- [Policy Templates](./policy-templates.md) — Pre-built templates including RBAC Enforcement
