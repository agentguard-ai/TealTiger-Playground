# Audit Trail Guide

This guide covers the immutable audit trail in the TealTiger Playground — what gets logged, how to filter and search events, how to export audit data for compliance, and practical examples for common audit scenarios.

> Audit trail features require authentication and a team workspace. See the [Getting Started Guide](./getting-started.md) for setup.

## Table of Contents

- [Overview](#overview)
- [Audit Event Types](#audit-event-types)
- [Viewing the Audit Trail](#viewing-the-audit-trail)
- [Filtering and Search](#filtering-and-search)
- [Exporting Audit Data](#exporting-audit-data)
- [Tamper Detection](#tamper-detection)
- [Sensitive Data Redaction](#sensitive-data-redaction)
- [Compliance Use Cases](#compliance-use-cases)
- [Audit Report Examples](#audit-report-examples)
- [Best Practices](#best-practices)

---

## Overview

The audit trail is an append-only, immutable log of every significant action in your workspace. Events cannot be modified or deleted — this guarantees a complete, tamper-evident history for compliance audits and security investigations.

Every audit event includes:

| Field | Description |
|-------|-------------|
| `id` | Unique event identifier (UUID) |
| `workspaceId` | Workspace where the event occurred |
| `actorId` | User who performed the action |
| `action` | Event type (e.g., `policy_created`, `member_added`) |
| `resourceType` | Type of resource affected (e.g., `policy`, `workspace_member`) |
| `resourceId` | ID of the affected resource |
| `metadata` | Additional context (policy name, version, reason, etc.) |
| `createdAt` | Timestamp of the event |

Events are stored in the `audit_log` table in Supabase with Row Level Security (RLS) — users can only read audit events for workspaces they belong to. No update or delete operations are permitted on this table.

---

## Audit Event Types

The audit trail captures 14 event types across five categories.

### Policy Operations

| Action | Description | Metadata |
|--------|-------------|----------|
| `policy_created` | A new policy was created | `policyName` |
| `policy_updated` | A policy was updated (new version saved) | `policyName`, `version` |
| `policy_deleted` | A policy was deleted | `policyName` |
| `policy_deployed` | A policy was deployed to an environment | `policyName`, `environment` |
| `policy_evaluated` | A policy was evaluated against a scenario | `policyName`, `decision` |

### Approval Actions

| Action | Description | Metadata |
|--------|-------------|----------|
| `policy_approved` | An approver approved a policy version | `policyName` |
| `policy_rejected` | An approver rejected a policy version | `policyName`, `reason` |

### Membership Changes

| Action | Description | Metadata |
|--------|-------------|----------|
| `member_added` | A user was added to the workspace | `username`, `role` |
| `member_removed` | A user was removed from the workspace | `username` |
| `member_role_changed` | A user's role was changed | `username`, `oldRole`, `newRole` |

### Configuration Changes

| Action | Description | Metadata |
|--------|-------------|----------|
| `workspace_settings_changed` | Workspace settings were updated | `changedFields` |

### Authentication and Security

| Action | Description | Metadata |
|--------|-------------|----------|
| `auth_login` | A user signed in | `provider` |
| `auth_logout` | A user signed out | — |
| `emergency_bypass` | A policy skipped the approval workflow | `policyName`, `reason` |

### Resource Types

Each event is associated with one of these resource types:

| Resource Type | Used By |
|---------------|---------|
| `policy` | Policy CRUD, approvals, deployments, evaluations |
| `policy_version` | Version-specific operations |
| `workspace` | Settings changes |
| `workspace_member` | Membership changes |
| `comment` | Comment operations |
| `compliance_mapping` | Compliance mapping changes |

---

## Viewing the Audit Trail

### Audit Log Viewer

Open the **Audit Trail** from the sidebar to see a chronological list of all events in your workspace. The viewer uses virtual scrolling to handle large datasets efficiently.

Each event card shows:

- A human-readable description (e.g., "Created policy "pii-detection-v1"")
- The actor's name and avatar
- Timestamp
- Action badge with color coding
- Resource type and ID

### Pagination

Events are loaded in pages of 100. Scroll to the bottom to load more, or use the pagination controls to jump to a specific page. Events are sorted by most recent first by default.

### Sorting

You can sort the audit log by:

- **Timestamp** (default) — most recent first or oldest first
- **Action** — group events by type
- **Actor** — group events by user

---

## Filtering and Search

The **Audit Filter Bar** lets you narrow down events using four filter dimensions. Filters can be combined for precise queries.

### Filter by Date Range

Select a start and end date to see events within a specific period. Common presets:

| Preset | Range |
|--------|-------|
| Last 30 days | Events from the past month |
| Last 90 days | Events from the past quarter |
| Last 365 days | Events from the past year |
| Custom | Pick any start and end date |

### Filter by Actor

Select a workspace member to see only their actions. Useful for:

- Reviewing a specific user's activity
- Investigating who made a particular change
- Generating per-user activity reports

### Filter by Action Type

Check one or more action types to filter by category. For example, select only `policy_approved` and `policy_rejected` to review all approval decisions.

You can select multiple actions at once:

- All policy operations: `policy_created`, `policy_updated`, `policy_deleted`, `policy_deployed`, `policy_evaluated`
- All approval actions: `policy_approved`, `policy_rejected`
- All membership changes: `member_added`, `member_removed`, `member_role_changed`
- Security events: `emergency_bypass`, `auth_login`, `auth_logout`

### Filter by Resource Type

Narrow results to a specific resource type (e.g., show only `policy` events or only `workspace_member` events).

### Combining Filters

Filters are applied together with AND logic. For example:

- **Actor** = "alice" + **Action** = `policy_approved` → shows all policies Alice approved
- **Date Range** = last 30 days + **Action** = `emergency_bypass` → shows recent emergency bypasses
- **Resource Type** = `workspace_member` + **Date Range** = last 90 days → shows all membership changes in the past quarter

---

## Exporting Audit Data

Audit data can be exported in three formats for external analysis, compliance evidence, or archival.

### CSV Export

Best for spreadsheet analysis and importing into GRC (Governance, Risk, Compliance) platforms.

The CSV includes these columns:

| Column | Description |
|--------|-------------|
| ID | Event UUID |
| Timestamp | ISO 8601 timestamp |
| Actor ID | User who performed the action |
| Action | Event type |
| Resource Type | Type of affected resource |
| Resource ID | ID of affected resource |
| Description | Human-readable event description |
| Metadata | JSON-encoded additional context |

### JSON Export

Best for programmatic analysis and integration with external tools.

The JSON export includes full event details plus export metadata:

```json
{
  "metadata": {
    "exportedAt": "2026-04-15T14:30:00.000Z",
    "exportedBy": "user-uuid-here",
    "filters": {
      "dateRange": {
        "start": "2026-03-15T00:00:00.000Z",
        "end": "2026-04-15T23:59:59.000Z"
      },
      "actions": ["policy_approved", "policy_rejected"]
    },
    "totalEvents": 42
  },
  "events": [
    {
      "id": "evt-a1b2c3d4-...",
      "workspaceId": "ws-e5f6g7h8-...",
      "actorId": "user-i9j0k1l2-...",
      "action": "policy_approved",
      "resourceType": "policy",
      "resourceId": "pol-m3n4o5p6-...",
      "metadata": {
        "policyName": "pii-detection-v1"
      },
      "createdAt": "2026-04-10T09:15:00.000Z"
    }
  ]
}
```

### PDF Export

Best for sharing with auditors and stakeholders who need a formatted, printable report.

The PDF includes:

- Title and export timestamp
- Total event count
- Applied filters (date range, action types)
- Formatted event table with timestamp, action, resource type, and description
- Page numbers on every page

### How to Export

1. Open the **Audit Trail** from the sidebar
2. Apply any filters you want (date range, actor, action types)
3. Click **"Export"**
4. Select a format: CSV, JSON, or PDF
5. The file downloads to your browser

Filters applied in the viewer carry over to the export — what you see is what you get.

---

## Tamper Detection

Every export includes a SHA-256 digital signature for tamper detection. This lets you verify that an exported file hasn't been modified after it was generated.

### How It Works

1. When you export audit data, the system computes a SHA-256 hash of the export content
2. The hash is included in the export metadata (for JSON) or as a separate `.sig` file
3. To verify, re-compute the hash and compare it to the original signature

### Verifying an Export

```typescript
import { auditTrailService } from './services/AuditTrailService';

// After exporting
const exportData = await auditTrailService.exportJSON(workspaceId, filters);
const signature = await auditTrailService.signExport(exportData);

// Later, to verify the export hasn't been tampered with
const isValid = await auditTrailService.verifySignature(exportData, signature);
console.log('Export integrity:', isValid ? 'VALID' : 'TAMPERED');
```

This is particularly useful when providing audit evidence to external auditors — the signature proves the data hasn't been altered since export.

---

## Sensitive Data Redaction

The audit trail automatically redacts sensitive information before storing events. This ensures that API keys, passwords, and personally identifiable information (PII) never appear in the audit log.

### What Gets Redacted

| Category | Patterns Detected | Replacement |
|----------|-------------------|-------------|
| API keys and tokens | `apiKey`, `api_key`, `token`, `accessToken`, `refreshToken` | `[REDACTED]` |
| Passwords and secrets | `password`, `secret`, `privateKey`, `private_key` | `[REDACTED]` |
| Financial data | `creditCard`, `credit_card`, `ssn` | `[REDACTED]` |
| Email addresses | Any `user@domain.tld` pattern | `[EMAIL_REDACTED]` |
| Phone numbers | Patterns like `555-123-4567` or `5551234567` | `[PHONE_REDACTED]` |

### Redaction Example

If an event's metadata contains:

```json
{
  "policyName": "cost-control",
  "apiKey": "sk-abc123...",
  "userEmail": "alice@example.com",
  "decision": "ALLOW"
}
```

It is stored as:

```json
{
  "policyName": "cost-control",
  "apiKey": "[REDACTED]",
  "userEmail": "[EMAIL_REDACTED]",
  "decision": "ALLOW"
}
```

Redaction happens at write time — sensitive data never reaches the database. Exports inherit the same redacted data.

---

## Compliance Use Cases

The audit trail supports several common compliance and governance scenarios.

### SOC2 Type II — Demonstrating Access Controls

SOC2 auditors need evidence that access controls are enforced and changes are logged. Use the audit trail to show:

1. **Filter** by `member_added`, `member_removed`, `member_role_changed` to show all access control changes
2. **Export as PDF** for the audit period (typically 6–12 months)
3. The report demonstrates that membership changes are tracked with actor, timestamp, and role details

### GDPR — Data Processing Accountability

GDPR Article 5 requires accountability for data processing activities. The audit trail provides:

1. **Filter** by `policy_evaluated` to show all AI evaluation events
2. Sensitive data is automatically redacted (emails, phone numbers) per Article 25 (Data Protection by Design)
3. **Export as JSON** for integration with your organization's data processing register

### OWASP ASI — Security Event Monitoring

For OWASP ASI10 (Unbounded Consumption) and general security monitoring:

1. **Filter** by `emergency_bypass` to review all instances where the approval workflow was skipped
2. **Filter** by `policy_deployed` to track what's running in production
3. **Combine** date range + action filters to investigate security incidents

### ISO 27001 — Change Management Evidence

ISO 27001 A.8.16 (Monitoring Activities) requires logging of system changes:

1. **Filter** by `policy_created`, `policy_updated`, `policy_deleted` for a complete change history
2. **Filter** by `workspace_settings_changed` to show configuration change management
3. **Export as CSV** and import into your ISMS (Information Security Management System)

### Internal Audit — Governance Compliance

For internal governance reviews:

1. **Filter** by `policy_approved` and `policy_rejected` to review the approval process
2. Check that all production policies went through the [governance workflow](./governance-workflow.md)
3. **Filter** by `emergency_bypass` and verify each bypass has a documented reason

---

## Audit Report Examples

### Example 1: Monthly Compliance Export

Generate a monthly audit export for your compliance team:

1. Open the **Audit Trail**
2. Set **Date Range** to the previous calendar month
3. Click **Export** → **JSON**
4. Sign the export for tamper detection
5. Share the JSON file and signature with your compliance team

### Example 2: Investigating a Policy Change

A production policy is behaving unexpectedly. Trace what happened:

1. Open the **Audit Trail**
2. Filter by **Resource Type** = `policy`
3. Filter by **Action** = `policy_updated`, `policy_deployed`, `emergency_bypass`
4. Narrow the **Date Range** to the period when the issue started
5. Review the events to identify who changed the policy, what version was deployed, and whether an emergency bypass was used

### Example 3: User Activity Review

Review a specific team member's actions for an access review:

1. Open the **Audit Trail**
2. Filter by **Actor** = the user in question
3. Set **Date Range** to the review period
4. **Export as PDF** for the access review documentation

### Example 4: Emergency Bypass Audit

Review all emergency bypasses for the quarter:

1. Open the **Audit Trail**
2. Filter by **Action** = `emergency_bypass`
3. Set **Date Range** to the past 90 days
4. Review each event's metadata for the bypass reason
5. **Export as CSV** for tracking in a spreadsheet

### Example 5: Pre-Audit Preparation Checklist

Before an external audit, generate a comprehensive evidence package:

| Step | Filter | Export Format | Purpose |
|------|--------|---------------|---------|
| 1 | All events, past 12 months | JSON (signed) | Complete audit trail with tamper-detection signature |
| 2 | `policy_approved` + `policy_rejected`, past 12 months | PDF | Governance evidence — approval decisions |
| 3 | `member_added` + `member_removed` + `member_role_changed`, past 12 months | PDF | Access control evidence — membership changes |
| 4 | `emergency_bypass`, past 12 months | CSV | Exception tracking — bypasses with reasons |
| 5 | `policy_deployed`, past 12 months | CSV | Deployment history — what reached production |

Pair these exports with [compliance reports](./compliance-mapping.md) for a complete audit evidence package.

---

## Best Practices

### Monitoring

- **Review emergency bypasses weekly** — every bypass should have a clear, documented reason
- **Check for unusual patterns** — frequent policy deletions, role changes, or late-night deployments may warrant investigation
- **Use the governance workflow** — policies that go through the full [approval process](./governance-workflow.md) create a richer audit trail

### Exporting

- **Export monthly** — maintain a regular cadence of signed JSON exports for your compliance archive
- **Use JSON for archival** — it preserves full event details and metadata; use CSV for spreadsheet analysis
- **Always sign exports** — the SHA-256 signature proves the data hasn't been modified since export
- **Apply filters before exporting** — export only what's needed rather than the entire log

### Compliance Readiness

- **Map audit events to framework controls** — use the [Compliance Mapping Guide](./compliance-mapping.md) to connect your audit trail to specific regulatory requirements
- **Pair audit exports with compliance reports** — auditors expect both the raw evidence (audit trail) and the analysis (compliance report)
- **Keep exports for your retention period** — most frameworks require 1–7 years of audit data retention

### Storage

- The audit trail is stored in Supabase's free tier (500 MB database limit)
- Events are compact — typical workspaces generate a few hundred events per month
- If approaching storage limits, export older events and archive them externally
- The playground displays warnings when free tier limits are approached

---

## Related Guides

- [Getting Started](./getting-started.md) — Sign in, create workspaces, write your first policy
- [Governance Workflow Guide](./governance-workflow.md) — Approval processes, emergency bypass, impact analysis
- [Compliance Mapping Guide](./compliance-mapping.md) — Map policies to OWASP, NIST, SOC2, ISO 27001, GDPR
- [CI/CD Integration Guide](./cicd-integration.md) — Automated policy testing with GitHub Actions
