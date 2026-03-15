# Getting Started with TealTiger Playground

Welcome to the TealTiger Interactive Web Playground — an enterprise-grade platform for developing, testing, and governing AI security policies. This guide walks you through signing in, creating your first workspace, writing policies, and collaborating with your team.

> All features run on free-tier infrastructure (Supabase, Vercel, GitHub Actions). No credit card required.

## Table of Contents

- [Prerequisites](#prerequisites)
- [1. Sign In with GitHub](#1-sign-in-with-github)
- [2. Create a Workspace](#2-create-a-workspace)
- [3. Create and Edit Policies](#3-create-and-edit-policies)
- [4. Use Policy Templates](#4-use-policy-templates)
- [5. Collaborate with Your Team](#5-collaborate-with-your-team)
- [6. Next Steps](#6-next-steps)

---

## Prerequisites

- A **GitHub account** (personal or organization)
- A modern browser (Chrome, Firefox, Safari, Edge)
- That's it — no local installation needed for the hosted version

### For Self-Hosting (Optional)

If you're running the playground locally or deploying your own instance:

1. **Node.js 18+** and npm
2. A **Supabase project** on the free tier ([supabase.com](https://supabase.com))
3. A **GitHub OAuth App** configured in Supabase (see [GitHub OAuth Setup](../GITHUB-OAUTH-SETUP.md))

Create a `.env.local` file in the `playground/` directory:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Then start the dev server:

```bash
cd playground
npm install
npm run dev
```

The playground will be available at `http://localhost:5173`.

---

## 1. Sign In with GitHub

The playground uses GitHub OAuth via Supabase Auth. No separate account creation is needed.

### How to Sign In

1. Click the **"Sign in with GitHub"** button in the top navigation bar
2. GitHub's authorization page opens — review the requested permissions:
   - `read:user` — reads your profile (username, avatar)
   - `user:email` — reads your email address
   - `read:org` — reads your organization memberships (for team features)
3. Click **"Authorize"** on GitHub
4. You're redirected back to the playground, now signed in

Your profile (avatar, username) appears in the top-right corner. Click it to see your email or sign out.

### Anonymous Mode

You can use the playground without signing in. The core policy editor and evaluation engine work in anonymous mode. Team features (workspaces, collaboration, governance) require authentication.

### Signing Out

Click your avatar in the top-right corner, then click **"Sign out"**. Your session is cleared and you return to anonymous mode.

### Permissions and Privacy

- The app requests **read-only** access — it cannot modify your GitHub repos or settings
- Organization membership data is used only to auto-create team workspaces
- You can revoke access anytime from GitHub → Settings → Applications → Authorized OAuth Apps

---

## 2. Create a Workspace

Workspaces are shared environments where your team collaborates on policies. Each workspace has its own policies, audit trail, and settings.

### Creating Your First Workspace

1. After signing in, open the **Workspace Selector** dropdown in the navigation bar
2. Click **"Create New Workspace"**
3. Enter a workspace name (e.g., `my-team-policies`)
4. Click **Create**

You're now the **Owner** of this workspace with full control over settings and members.

### Workspace Roles

| Role     | Permissions                                                    |
|----------|----------------------------------------------------------------|
| **Owner**  | Full control: manage members, settings, create/edit/delete policies, approve policies |
| **Editor** | Create, edit, and delete policies; run evaluations             |
| **Viewer** | View policies and run evaluations (read-only)                  |

### Inviting Team Members

1. Open **Workspace Settings** from the workspace dropdown
2. Click **"Invite Member"**
3. Enter a GitHub username or email address
4. Select a role: Owner, Editor, or Viewer
5. Click **Invite**

The invited user will see the workspace in their Workspace Selector after signing in.

### Switching Workspaces

Use the **Workspace Selector** dropdown to switch between your personal workspace and any team workspaces you belong to. The active workspace is highlighted with a checkmark.

---

## 3. Create and Edit Policies

Policies are the core of TealTiger — they define security rules, cost controls, and guardrails for AI agent interactions.

### Creating a New Policy

1. Navigate to the **Policy Registry** in your workspace
2. Click **"Create Policy"**
3. Fill in the policy details:
   - **Name**: A unique name within the workspace (e.g., `pii-detection-v1`)
   - **Description**: What the policy does
   - **Category**: Select a category (security, cost, compliance, etc.)
   - **Tags**: Add searchable tags
4. Write your policy code in the **Monaco Editor** (full syntax highlighting, autocomplete)
5. Click **Save** to create the policy in **Draft** state

### Example: Basic Cost Control Policy

```typescript
// Cost control policy - limits spending per request
export default function costControlPolicy(context) {
  const maxCostPerRequest = 0.05; // $0.05 per request
  const estimatedCost = context.estimatedCost || 0;

  if (estimatedCost > maxCostPerRequest) {
    return {
      decision: 'DENY',
      reason: `Estimated cost $${estimatedCost} exceeds limit of $${maxCostPerRequest}`,
    };
  }

  return {
    decision: 'ALLOW',
    metadata: { estimatedCost },
  };
}
```

### Policy Versioning

Every save creates a new **immutable version** with semantic versioning:

- **Patch** (1.0.0 → 1.0.1): Bug fixes, minor tweaks
- **Minor** (1.0.0 → 1.1.0): New features, non-breaking changes
- **Major** (1.0.0 → 2.0.0): Breaking changes

You can view the full version history in the **Version Timeline** and revert to any previous version.

### Comparing Versions (Diff View)

1. Open a policy's **Version History**
2. Select two versions to compare
3. Choose a view mode:
   - **Side-by-side**: Two columns showing old and new code
   - **Unified**: Single column with `+`/`-` indicators
4. Changes are color-coded: green (added), red (removed), yellow (modified)

---

## 4. Use Policy Templates

The playground includes **15+ enterprise-ready templates** to help you get started quickly.

### Browsing Templates

1. Open the **Template Library** from the sidebar
2. Browse by category or search by name
3. Each template card shows a description, supported providers, and use case

### Available Template Categories

| Category         | Templates                                                  |
|------------------|------------------------------------------------------------|
| **Security**     | PII Detection, Prompt Injection Detection, Content Moderation, RBAC Enforcement |
| **Cost Control** | Budget Enforcement, Rate Limiting, Token Optimization      |
| **Reliability**  | Circuit Breaker, Retry Strategy, Model Fallback, Load Balancing |
| **Compliance**   | Audit Logging, Data Residency                              |
| **Routing**      | Multi-Provider Routing, Semantic Cache                     |

### Customizing a Template

1. Click on a template card to open the **Template Customizer**
2. Adjust parameters (thresholds, provider lists, limits) using the form inputs
3. Preview the generated code with syntax highlighting
4. Click **"Save to Workspace"** to create a new policy from the template

---

## 5. Collaborate with Your Team

The playground provides real-time collaboration features for team policy development.

### Inline Comments

Add comments directly on specific lines of policy code:

1. Hover over a line number in the Monaco Editor
2. Click the **comment icon** that appears
3. Write your comment (Markdown supported)
4. Use **@username** to mention and notify team members
5. Click **Post**

Comments support threaded replies. Resolve a comment thread when the feedback has been addressed. The **unresolved comment count** badge shows how many open threads remain.

### Filtering Comments

Use the **Comment Filter Bar** to narrow down comments by:
- Author
- Status (resolved / unresolved)
- Date range

### Real-Time Updates

When multiple team members are working on the same policy:
- **Active users** are shown with their avatars
- Comments and policy changes appear in real-time via WebSocket subscriptions
- An **offline indicator** appears if your connection drops, and changes sync automatically when reconnected

### Policy Governance Workflow

Policies follow a structured lifecycle:

```
Draft → Review → Approved → Production
```

1. **Draft**: Author writes and iterates on the policy
2. **Review**: Author submits for approval; designated approvers are notified
3. **Approved**: Required approvers have signed off; policy is locked from edits
4. **Production**: Policy is deployed and active

Each state is shown as a colored **badge** on the policy card. To modify an approved or production policy, create a new version — the original remains immutable.

### Requesting Approval

1. Open a policy in **Draft** state
2. Click **"Request Approval"**
3. The policy moves to **Review** state
4. Configured approvers receive a notification
5. Approvers can **Approve** or **Reject** with a comment

---

## 6. Next Steps

Now that you're set up, explore these features:

- **[Governance Workflow Guide](./governance-workflow.md)** — Approval processes, emergency bypass, impact analysis
- **[Compliance Mapping Guide](./compliance-mapping.md)** — Map policies to OWASP, NIST, SOC2, ISO 27001, GDPR
- **[Audit Trail Guide](./audit-trail.md)** — Immutable logging, filtering, and export
- **[CI/CD Integration Guide](./cicd-integration.md)** — GitHub Actions workflows for automated policy testing
- **[RBAC Simulator Guide](./rbac-simulator.md)** — Test policies across different user roles and permissions
- **[Policy Template Guide](./policy-templates.md)** — Detailed documentation for all 15+ templates

### Useful Keyboard Shortcuts

| Shortcut         | Action                    |
|------------------|---------------------------|
| `Ctrl/Cmd + S`   | Save policy version       |
| `Ctrl/Cmd + /`   | Toggle line comment       |
| `Ctrl/Cmd + F`   | Search in editor          |
| `Escape`         | Close modals and dropdowns|

### Free Tier Limits

The playground runs entirely on free-tier infrastructure:

| Service         | Limit                          |
|-----------------|--------------------------------|
| **Supabase**    | 500 MB database, 50K monthly active users, 2 GB bandwidth |
| **Vercel**      | 100 GB bandwidth, unlimited static deploys |
| **GitHub Actions** | 2,000 minutes/month         |

Usage warnings appear automatically when you approach these limits. All data can be exported if you decide to upgrade.

### Getting Help

- Check the [Supabase Setup Guide](../SUPABASE-SETUP.md) for database configuration
- Check the [GitHub OAuth Setup Guide](../GITHUB-OAUTH-SETUP.md) for authentication setup
- Check the [Deployment Guide](../DEPLOYMENT.md) for Vercel deployment instructions
