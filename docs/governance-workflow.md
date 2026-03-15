# Governance Workflow Guide

This guide covers the policy governance workflow in the TealTiger Playground — how policies move through approval stages, how to handle emergencies, and how to use impact analysis to make informed decisions before promoting changes.

> Governance features require authentication and a team workspace. See the [Getting Started Guide](./getting-started.md) for setup.

## Table of Contents

- [Policy States](#policy-states)
- [State Transitions](#state-transitions)
- [Approval Process](#approval-process)
- [Emergency Bypass](#emergency-bypass)
- [Impact Analysis](#impact-analysis)
- [Auto-Approval Rules](#auto-approval-rules)
- [Best Practices](#best-practices)

---

## Policy States

Every policy in a workspace has one of four states, shown as a colored badge on the policy card:

| State          | Badge Color | Description                                      |
|----------------|-------------|--------------------------------------------------|
| **Draft**      | Gray        | Work in progress. Authors can freely edit the policy code and metadata. |
| **Review**     | Yellow      | Submitted for approval. Designated approvers are notified and can approve or reject. |
| **Approved**   | Green       | All required approvals received. The policy is locked — edits require a new version. |
| **Production** | Blue        | Deployed and active. Like Approved, the policy is immutable at this version. |

### Immutability Rule

Policies in **Approved** or **Production** state cannot be edited directly. To make changes, create a new version — the original version remains intact in the version history. This ensures a complete audit trail of every policy that was ever approved or deployed.

---

## State Transitions

Policies follow a forward lifecycle, with rollback paths available when needed:

```
         ┌──────────────────────────────────────┐
         │            Rollback paths             │
         ▼                                       │
      Draft ──→ Review ──→ Approved ──→ Production
         ▲         │                       │
         │         │       Rollback        │
         └─────────┘◄──────────────────────┘
        (Rejection)
```

### Forward Transitions

| From       | To         | Requires Approval? | Who Can Do It          |
|------------|------------|--------------------|-----------------------|
| Draft      | Review     | No                 | Policy author (Editor/Owner) |
| Review     | Approved   | **Yes**            | Designated approvers   |
| Approved   | Production | No                 | Owner/Editor           |

### Rollback Transitions

| From       | To    | Requires Approval? | When to Use                    |
|------------|-------|--------------------|---------------------------------|
| Review     | Draft | No                 | Rejection — approver sends policy back for changes |
| Approved   | Draft | No                 | Rollback before deployment       |
| Production | Draft | No                 | Rollback a deployed policy       |

Rolling back creates a new Draft version, preserving the full history.

---

## Approval Process

The approval workflow ensures policies are reviewed before reaching production. Workspace owners configure how many approvers are required and who can approve.

### Configuring Approvers

1. Open **Workspace Settings** from the workspace dropdown
2. Under **Governance**, set the number of required approvers (1–5)
3. Add team members as designated approvers by selecting from the member list
4. Click **Save**

Only workspace **Owners** can configure approval settings.

### Submitting for Review

1. Open a policy in **Draft** state
2. Click **"Request Approval"**
3. The policy moves to **Review** state
4. All designated approvers receive a notification

While in Review, the policy remains editable by the author until the first approval is submitted. After that, further edits require withdrawing the review request.

### Reviewing a Policy

When you're a designated approver and a policy enters Review:

1. Open the policy — you'll see the **Approval Panel** on the right side
2. Review the code changes using the **Diff View** (compare with the previous version)
3. Add inline comments on specific lines if you have feedback
4. Choose one of:
   - **Approve** — add an optional comment explaining your approval
   - **Reject** — provide a reason (required); the policy returns to Draft

### Approval Status

The Approval Panel shows real-time status:

- Number of approvals received vs. required (e.g., "1 of 2 approvals")
- Each approver's decision: pending, approved, or rejected
- Approver comments and timestamps

Once all required approvals are received, the `canPromote` flag is set to `true` and the policy can be promoted to **Approved**.

### Promoting to Production

After a policy reaches **Approved** state:

1. Open the policy
2. Click **"Deploy to Production"**
3. Confirm the deployment in the dialog
4. The policy moves to **Production** state

All state transitions are logged in the [Audit Trail](./audit-trail.md).

---

## Emergency Bypass

Sometimes a critical fix needs to skip the normal approval process. The emergency bypass feature allows authorized users to promote a policy directly, with full audit logging.

### Prerequisites

- Emergency bypass must be **enabled** in Workspace Settings (`allowEmergencyBypass: true`)
- Only workspace **Owners** can perform an emergency bypass

### Using Emergency Bypass

1. Open the policy that needs an urgent change
2. Click the **"Emergency Bypass"** button (shown with a warning icon)
3. The **Emergency Bypass Modal** appears with:
   - A red warning banner explaining this action skips normal approval
   - The current state and target state displayed (e.g., Draft → Production)
   - A **reason field** (required) — explain why the bypass is necessary
4. Enter a detailed reason and click **"Confirm Bypass"**
5. The policy is promoted immediately to the target state

### What Gets Logged

Every emergency bypass creates an audit event with:

- `action`: `emergency_bypass`
- The user who performed the bypass
- The reason provided
- The state transition (from → to)
- Timestamp

These events are prominently flagged in the audit trail and compliance reports. Auditors can filter specifically for emergency bypass events.

### When to Use Emergency Bypass

- **Critical security vulnerability** discovered in a production policy
- **Regulatory deadline** requiring immediate policy deployment
- **Production incident** where a policy is causing failures

Emergency bypass is not a shortcut for convenience — every use is visible to the entire team and to auditors.

---

## Impact Analysis

Before promoting a policy, run an impact analysis to understand how changes affect existing test scenarios. This helps catch breaking changes before they reach production.

### Running Impact Analysis

1. Open a policy with pending changes (a new version compared to the current one)
2. Click **"Run Impact Analysis"**
3. The system runs all test scenarios against both the old and new versions
4. Results appear in the **Impact Analysis Panel**

### Understanding Results

The analysis compares evaluation results across all test scenarios and flags changes:

| Change Type | Threshold | Severity | Example                          |
|-------------|-----------|----------|----------------------------------|
| **Decision** | Any change | Breaking | `ALLOW → DENY` or `DENY → ALLOW` |
| **Cost**     | ±10%      | Warning  | Estimated cost changed by more than 10% |
| **Latency**  | ±20%      | Warning  | Execution time changed by more than 20% |
| **Metadata** | Any change | Info     | Tags, description, or other metadata changed |

### Impact Summary

The summary panel shows:

- **Total scenarios** tested
- **Affected scenarios** — how many had changes
- **Breaking changes** — decision changes that could affect production behavior
- **Warnings** — cost or latency changes above thresholds
- **Info changes** — non-critical metadata differences

### Recommendations

Based on the analysis, the system provides a recommendation:

| Recommendation | Meaning                                                    |
|----------------|------------------------------------------------------------|
| **Approve**    | No breaking changes detected. Safe to promote.             |
| **Review**     | Warnings found. Review the changes before promoting.       |
| **Reject**     | Breaking changes detected. Address issues before promoting. |

### Filtering by Severity

Use the severity filter to focus on what matters:

- **Breaking** — show only scenarios with decision changes
- **Warning** — show cost/latency threshold violations
- **Info** — show all changes including metadata

### Exporting Impact Reports

Impact analysis results can be exported for documentation or compliance:

- **CSV** — tabular data for spreadsheet analysis
- **PDF** — formatted report for stakeholders

All impact analyses are logged in the audit trail with the full results.

---

## Auto-Approval Rules

For low-risk changes, you can configure rules that automatically approve policy versions without manual review. This speeds up iteration on minor fixes.

### Available Rules

| Rule              | Condition                  | Default Threshold | Description                                |
|-------------------|----------------------------|-------------------|--------------------------------------------|
| **Lines Changed** | `lines_changed_lt`         | 5 lines           | Auto-approve if fewer than N lines changed |
| **Metadata Only** | `metadata_only`            | N/A               | Auto-approve if only metadata changed (tags, description) |
| **Comment Only**  | `comment_only`             | N/A               | Auto-approve if only code comments changed |

### Configuring Auto-Approval

1. Open **Workspace Settings** → **Governance**
2. Under **Auto-Approval Rules**, toggle rules on or off
3. For `lines_changed_lt`, set the threshold (number of lines)
4. Click **Save**

### How It Works

When a policy version is submitted for review, the system checks:

1. Calculate the diff between the new version and the previous version
2. Evaluate each enabled auto-approval rule against the diff
3. If any rule matches, the version is automatically approved
4. An audit event is logged with `auto_approval` as the approval type

Auto-approval still creates a full audit trail entry — the only difference is that no human approver action is required.

---

## Best Practices

### Workspace Setup

- **Start with 2 required approvers** for production policies — this balances speed with oversight
- **Assign approvers from different roles** (e.g., one developer, one security lead) for diverse review perspectives
- **Enable emergency bypass** but establish team norms for when it's acceptable to use

### Policy Development

- **Keep policies small and focused** — a single policy per concern (cost, security, compliance) is easier to review and approve
- **Write test scenarios before requesting review** — reviewers can verify behavior against concrete examples
- **Use meaningful version bumps** — patch for typos, minor for new rules, major for decision logic changes

### Review Process

- **Run impact analysis before submitting for review** — address breaking changes proactively
- **Add inline comments** explaining non-obvious logic — this helps approvers understand intent
- **Respond to rejection feedback** in the comment thread before resubmitting

### Production Governance

- **Review emergency bypass events weekly** — ensure they were justified and follow up with proper reviews
- **Use auto-approval only for truly low-risk changes** — when in doubt, require manual review
- **Monitor the audit trail** for unusual patterns (frequent bypasses, rejected policies being resubmitted without changes)
- **Export compliance reports monthly** to maintain a paper trail for auditors

### Team Norms

- Define a **response time SLA** for approvals (e.g., 24 hours for standard reviews, 1 hour for urgent)
- Rotate approver assignments periodically to avoid bottlenecks
- Use the **Analytics Dashboard** to track approval velocity and identify process improvements

---

## Related Guides

- [Getting Started](./getting-started.md) — Sign in, create workspaces, write your first policy
- [Compliance Mapping Guide](./compliance-mapping.md) — Map policies to OWASP, NIST, SOC2, ISO 27001, GDPR
- [Audit Trail Guide](./audit-trail.md) — Immutable logging, filtering, and export
- [CI/CD Integration Guide](./cicd-integration.md) — Automated policy testing with GitHub Actions
