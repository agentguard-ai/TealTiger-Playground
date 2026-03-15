# Video Tutorial Scripts

Production-ready scripts for recording TealTiger Playground video tutorials. Each tutorial includes timestamps, narration text, and screen actions so that anyone on the team can record a consistent, professional walkthrough.

> These scripts reference the written guides in `playground/docs/`. Use them alongside the guides for detailed technical context.

## Table of Contents

- [Tutorial 1: Workspace Setup](#tutorial-1-workspace-setup)
- [Tutorial 2: Policy Governance Workflow](#tutorial-2-policy-governance-workflow)
- [Tutorial 3: Compliance Framework Mapping](#tutorial-3-compliance-framework-mapping)
- [Tutorial 4: CI/CD Integration with GitHub Actions](#tutorial-4-cicd-integration-with-github-actions)
- [Recording Guidelines](#recording-guidelines)
- [Publishing Checklist](#publishing-checklist)

---

## Tutorial 1: Workspace Setup

**Duration:** ~8 minutes
**Audience:** New users, team leads setting up their organization
**Prerequisites:** A GitHub account
**Related Guide:** [Getting Started](./getting-started.md)

### Script

#### [0:00–0:30] Introduction

**Screen:** TealTiger Playground landing page

**Narration:**
> Welcome to TealTiger. In this tutorial, you'll go from zero to a fully configured team workspace in under ten minutes. We'll sign in with GitHub, create a workspace, invite team members, assign roles, and write your first policy — all on free-tier infrastructure. No credit card required.

**Action:** Show the playground URL in the browser address bar.

---

#### [0:30–1:30] Sign In with GitHub

**Screen:** Top navigation bar → "Sign in with GitHub" button

**Narration:**
> Click "Sign in with GitHub" in the top-right corner. GitHub's authorization page opens — the playground requests three read-only permissions: your profile, your email, and your organization memberships. It cannot modify your repos or settings. Click "Authorize" and you're redirected back, now signed in. Your avatar and username appear in the nav bar.

**Actions:**
1. Click "Sign in with GitHub"
2. Show the GitHub authorization page — highlight the three permission scopes
3. Click "Authorize"
4. Show the signed-in state with avatar in the top-right corner

---

#### [1:30–2:00] Anonymous Mode

**Screen:** Sign-out state

**Narration:**
> Quick note — the playground works without signing in. The policy editor and evaluation engine are fully functional in anonymous mode. Team features like workspaces, collaboration, and governance require authentication. If you're just exploring, you can skip sign-in entirely.

**Action:** Briefly show the editor working without authentication.

---

#### [2:00–3:30] Create a Workspace

**Screen:** Workspace Selector dropdown

**Narration:**
> Open the Workspace Selector in the nav bar and click "Create New Workspace." Give it a name — something like "security-team" or "platform-policies." Click Create. You're now the Owner of this workspace with full control over settings and members.
>
> Workspaces isolate your policies, audit trail, and settings from other teams. Supabase Row Level Security enforces this at the database level — users in workspace A can never see workspace B's data.

**Actions:**
1. Open the Workspace Selector dropdown
2. Click "Create New Workspace"
3. Type a workspace name (e.g., `acme-security-policies`)
4. Click "Create"
5. Show the new workspace selected in the dropdown

---

#### [3:30–5:00] Invite Team Members and Assign Roles

**Screen:** Workspace Settings panel

**Narration:**
> Open Workspace Settings from the dropdown. Click "Invite Member" and enter a GitHub username or email. Choose a role — there are three:
>
> **Owner** has full control: manage members, settings, and policies. **Editor** can create, edit, and delete policies but can't manage members. **Viewer** is read-only — they can view policies and run evaluations but can't change anything.
>
> Click Invite. The user sees this workspace in their Workspace Selector after they sign in. You can change roles or remove members anytime from this settings panel.

**Actions:**
1. Open Workspace Settings
2. Click "Invite Member"
3. Enter a GitHub username
4. Select "Editor" role from the dropdown — briefly hover over each role to show the tooltip descriptions
5. Click "Invite"
6. Show the updated member list with role badges

---

#### [5:00–6:30] Create Your First Policy

**Screen:** Policy Registry → Create Policy modal

**Narration:**
> Navigate to the Policy Registry and click "Create Policy." Fill in a name — policy names must be unique within the workspace. Add a description, pick a category, and add some tags for searchability.
>
> The Monaco Editor opens with full syntax highlighting and autocomplete. Let's write a simple cost control policy that denies requests exceeding five cents.

**Actions:**
1. Click "Create Policy"
2. Fill in: Name = `cost-control-basic`, Description = "Limits per-request cost to $0.05", Category = "Cost Control", Tags = ["cost", "budget"]
3. Type the following policy code in the editor:

```typescript
export default function costControlPolicy(context) {
  const maxCost = 0.05;
  if (context.estimatedCost > maxCost) {
    return { decision: 'DENY', reason: `Cost ${context.estimatedCost} exceeds limit` };
  }
  return { decision: 'ALLOW', metadata: { estimatedCost: context.estimatedCost } };
}
```

4. Click "Save" — show the policy created in Draft state with version `1.0.0`

---

#### [6:30–7:30] Use a Policy Template

**Screen:** Template Library sidebar

**Narration:**
> Don't want to start from scratch? The Template Library has fifteen-plus enterprise-ready templates. Browse by category — Security, Cost Control, Reliability, Compliance, Routing — or search by name.
>
> Click a template to open the customizer. Adjust parameters like thresholds and provider lists using the form, preview the generated code, and click "Save to Workspace" to create a new policy from the template.

**Actions:**
1. Open the Template Library from the sidebar
2. Browse the categories — show a few template cards
3. Click the "PII Detection and Redaction" template
4. Show the Template Customizer with parameter inputs
5. Click "Save to Workspace"

---

#### [7:30–8:00] Wrap-Up

**Screen:** Workspace overview with the new policies visible

**Narration:**
> That's it — you've signed in, created a workspace, invited your team, and written your first policy. Everything runs on Supabase and Vercel free tiers. In the next tutorial, we'll walk through the governance workflow — how policies move from Draft through Review and Approval to Production. See you there.

**Action:** Show the workspace with the two policies listed, both in Draft state.

---

## Tutorial 2: Policy Governance Workflow

**Duration:** ~10 minutes
**Audience:** Policy authors, reviewers, compliance officers
**Prerequisites:** A workspace with at least one policy and two team members
**Related Guide:** [Governance Workflow Guide](./governance-workflow.md)

### Script

#### [0:00–0:30] Introduction

**Screen:** A workspace with a policy in Draft state

**Narration:**
> In this tutorial, we'll walk through the full policy governance lifecycle — from Draft to Production. You'll learn how to configure approvers, submit policies for review, approve or reject changes, run impact analysis, and handle emergencies. Every action is logged in an immutable audit trail.

---

#### [0:30–1:30] Understanding Policy States

**Screen:** A policy card showing the Draft badge

**Narration:**
> Every policy has one of four states, shown as a colored badge. **Draft** — gray — means work in progress. **Review** — yellow — means it's waiting for approval. **Approved** — green — means all required approvals are in. **Production** — blue — means it's deployed and active.
>
> The key rule: policies in Approved or Production state are immutable. To make changes, you create a new version. The original stays intact in the version history.

**Actions:**
1. Show a policy card with the Draft badge
2. Display a diagram or overlay showing the four states with their colors
3. Highlight the immutability rule

---

#### [1:30–3:00] Configure Approvers

**Screen:** Workspace Settings → Governance section

**Narration:**
> Before submitting anything for review, configure your approval settings. Open Workspace Settings and scroll to the Governance section. Set the number of required approvers — one to five. Then add team members as designated approvers.
>
> Only workspace Owners can change these settings. A good starting point is two approvers from different roles — say, one developer and one security lead.

**Actions:**
1. Open Workspace Settings
2. Scroll to the Governance section
3. Set required approvers to `2`
4. Add two team members as approvers from the member list
5. Click "Save"

---

#### [3:00–4:30] Submit a Policy for Review

**Screen:** Policy editor with a Draft policy

**Narration:**
> Open a policy in Draft state and click "Request Approval." The policy moves to Review and all designated approvers are notified. While in Review, the author can still edit the policy until the first approval comes in — after that, edits require withdrawing the review request.
>
> Notice the badge changed from gray Draft to yellow Review.

**Actions:**
1. Open a policy in Draft state
2. Click "Request Approval"
3. Show the badge change to yellow "Review"
4. Show the notification that approvers received

---

#### [4:30–6:30] Review and Approve a Policy

**Screen:** Switch to an approver's perspective — Approval Panel visible

**Narration:**
> Now let's switch to an approver's view. Open the policy — you'll see the Approval Panel on the right side showing the approval status: "0 of 2 approvals."
>
> First, review the changes. Click "Diff View" to compare this version with the previous one. Changes are color-coded — green for added lines, red for removed, yellow for modified.
>
> If you have feedback, add inline comments on specific lines. When you're satisfied, click "Approve" and add an optional comment. If something needs work, click "Reject" with a required reason — the policy returns to Draft.

**Actions:**
1. Open the policy as an approver
2. Show the Approval Panel with "0 of 2 approvals"
3. Click "Diff View" — show the side-by-side comparison
4. Add an inline comment on a specific line
5. Click "Approve" and type a comment: "Looks good — cost threshold is reasonable"
6. Show the panel update to "1 of 2 approvals"
7. (Optionally) Show a second approver approving — panel shows "2 of 2 approvals"

---

#### [6:30–7:30] Run Impact Analysis

**Screen:** Impact Analysis Panel

**Narration:**
> Before promoting a policy, run an impact analysis. Click "Run Impact Analysis" — the system evaluates all test scenarios against both the old and new versions and flags changes.
>
> Decision changes — like ALLOW becoming DENY — are flagged as breaking. Cost changes above ten percent and latency changes above twenty percent are warnings. The summary tells you how many scenarios are affected and gives a recommendation: Approve, Review, or Reject.

**Actions:**
1. Click "Run Impact Analysis"
2. Show the loading state while scenarios run
3. Show the results panel with the summary: affected scenarios, breaking changes, warnings
4. Show the recommendation (e.g., "Approve — no breaking changes detected")
5. Briefly show the severity filter options

---

#### [7:30–8:30] Promote to Production

**Screen:** Policy with all approvals received

**Narration:**
> With all approvals in and impact analysis clean, promote the policy. Click "Deploy to Production" and confirm in the dialog. The badge changes to blue Production. The policy is now immutable at this version.
>
> Every state transition — Draft to Review, Review to Approved, Approved to Production — is logged in the audit trail with the actor, timestamp, and any comments.

**Actions:**
1. Show the policy with "2 of 2 approvals" and green Approved badge
2. Click "Deploy to Production"
3. Confirm in the dialog
4. Show the badge change to blue "Production"

---

#### [8:30–9:30] Emergency Bypass

**Screen:** Emergency Bypass Modal

**Narration:**
> Sometimes you need to skip the approval process for a critical fix. If emergency bypass is enabled in your workspace settings, Owners can click "Emergency Bypass." A modal appears with a red warning banner. Enter a detailed reason — this is required — and confirm.
>
> The policy is promoted immediately. But here's the important part: every bypass is logged in the audit trail with the reason, the user, and the state transition. These events are prominently flagged in compliance reports. Use this for genuine emergencies, not convenience.

**Actions:**
1. Click "Emergency Bypass" on a Draft policy
2. Show the Emergency Bypass Modal with the red warning
3. Type a reason: "Critical security vulnerability — prompt injection detected in production"
4. Click "Confirm Bypass"
5. Show the policy promoted to Production
6. Open the Audit Trail and show the `emergency_bypass` event

---

#### [9:30–10:00] Wrap-Up

**Screen:** Audit Trail showing the governance events

**Narration:**
> That's the full governance lifecycle — from Draft through Review and Approval to Production, with impact analysis and emergency bypass when you need it. Every action is logged immutably. In the next tutorial, we'll cover compliance framework mapping — connecting your policies to OWASP, NIST, SOC2, and more.

---

## Tutorial 3: Compliance Framework Mapping

**Duration:** ~9 minutes
**Audience:** Compliance officers, security leads, policy authors
**Prerequisites:** A workspace with at least two policies
**Related Guide:** [Compliance Mapping Guide](./compliance-mapping.md)

### Script

#### [0:00–0:30] Introduction

**Screen:** Compliance Dashboard (empty state)

**Narration:**
> In this tutorial, you'll learn how to map your TealTiger policies to regulatory compliance frameworks — OWASP, NIST, SOC2, ISO 27001, and GDPR. We'll track coverage, identify gaps, generate reports for auditors, and create a custom framework for your organization's internal requirements.

---

#### [0:30–1:30] Supported Frameworks Overview

**Screen:** Compliance Dashboard → Framework Selector

**Narration:**
> The playground ships with five built-in frameworks. OWASP ASI 2024 covers the top ten security risks for AI agents — prompt injection, data disclosure, unbounded consumption, and more. NIST AI RMF covers risk governance. SOC2 Type II covers security and availability controls. ISO 27001 covers information security management. And GDPR covers data protection.
>
> Each framework has a set of controls or requirements. Your job is to map your policies to these requirements to demonstrate coverage.

**Actions:**
1. Open the Framework Selector dropdown
2. Show each framework name and its control count
3. Select "OWASP ASI 2024" to show its ten requirements listed

---

#### [1:30–3:00] Map a Policy to a Framework Requirement

**Screen:** Policy detail view → Compliance tab

**Narration:**
> Let's map a PII detection policy to OWASP ASI02 — Sensitive Information Disclosure. Open the policy and click the Compliance tab. Select OWASP ASI 2024 from the framework dropdown. You'll see the list of requirements — unmapped ones are highlighted.
>
> Find ASI02 and click "Map." Add a note explaining how the policy addresses this requirement — for example, "Detects and redacts PII patterns in LLM outputs including emails, phone numbers, and SSNs." Click Save.
>
> A single policy can map to multiple requirements across different frameworks. And multiple policies can share the same requirement.

**Actions:**
1. Open a PII detection policy
2. Click the "Compliance" tab
3. Select "OWASP ASI 2024" from the dropdown
4. Find ASI02 — show it highlighted as unmapped
5. Click "Map"
6. Type the mapping note
7. Click "Save"
8. Show ASI02 now marked as mapped

---

#### [3:00–4:30] Cross-Framework Mapping

**Screen:** Same policy, switching frameworks

**Narration:**
> A single policy often addresses controls in several frameworks. Let's map the same PII detection policy to GDPR Article 25 — Data Protection by Design — and ISO 27001 A.8.3 — Information Access Restriction.
>
> Switch the framework dropdown to GDPR, find Article 25, click Map, and add a note. Repeat for ISO 27001. Now this one policy contributes to coverage across three frameworks.

**Actions:**
1. Switch framework to "GDPR 2018"
2. Map to Article 25 with a note
3. Switch framework to "ISO 27001:2022"
4. Map to A.8.3 with a note
5. Show the policy's Compliance tab listing all three mappings

---

#### [4:30–5:30] Coverage Tracking

**Screen:** Compliance Dashboard with coverage percentages

**Narration:**
> Navigate to the Compliance Dashboard from the sidebar. You'll see coverage percentages for each framework — calculated as mapped requirements divided by total requirements. If you've mapped seven of ten OWASP requirements, that's seventy percent coverage.
>
> The Unmapped Requirements section shows exactly which controls still need policies. Use this to prioritize what to build next and prepare for audits.

**Actions:**
1. Open the Compliance Dashboard
2. Show coverage percentages for each framework (e.g., OWASP 70%, NIST 50%)
3. Click into OWASP to show the unmapped requirements list
4. Highlight a gap — e.g., ASI04 (Data and Model Poisoning) has no policy mapped

---

#### [5:30–7:00] Generate a Compliance Report

**Screen:** Compliance Dashboard → Generate Report

**Narration:**
> Click "Generate Report" to create a compliance snapshot. Select a framework — or generate for all. Optionally filter by date range or policy state. Click Generate.
>
> The report includes an executive summary with coverage statistics, a detailed table of every policy with its version, author, approval status, and mapped requirements, test coverage metrics, evaluation success rates, and an audit summary.
>
> Export as PDF for auditors — you can add your organization's branding with a name, logo, and colors. Or export as CSV for spreadsheet analysis.

**Actions:**
1. Click "Generate Report"
2. Select "OWASP ASI 2024"
3. Click "Generate"
4. Show the report preview — executive summary, policy table, audit summary
5. Click "Export as PDF"
6. Show the PDF branding options (organization name, logo, color)
7. Download the PDF

---

#### [7:00–8:30] Create a Custom Framework

**Screen:** Compliance Dashboard → Add Custom Framework

**Narration:**
> If your organization has internal compliance requirements, you can define a custom framework using JSON. Click "Add Custom Framework" and paste your definition. Each framework needs an ID, name, version, and an array of requirements with codes, titles, descriptions, and categories.
>
> The system validates the schema — any missing fields are flagged. Once loaded, your custom framework appears alongside the built-in ones and works exactly the same way for mapping and reporting.

**Actions:**
1. Click "Add Custom Framework"
2. Paste a JSON definition:

```json
{
  "id": "acme-ai-governance-2026",
  "name": "Acme AI Governance Framework",
  "version": "2.0",
  "requirements": [
    {
      "id": "aig-001",
      "frameworkId": "acme-ai-governance-2026",
      "code": "AIG-001",
      "title": "Human Oversight",
      "description": "All AI decisions affecting customers must have human review capability",
      "category": "Governance"
    }
  ]
}
```

3. Click "Load Framework"
4. Show the custom framework in the Framework Selector
5. Map a policy to AIG-001

---

#### [8:30–9:00] Wrap-Up

**Screen:** Compliance Dashboard with improved coverage

**Narration:**
> You've mapped policies to multiple frameworks, tracked coverage, generated a report for auditors, and created a custom framework. All mapping changes are logged in the audit trail. In the next tutorial, we'll set up CI/CD integration with GitHub Actions to automate policy testing and deployment.

---

## Tutorial 4: CI/CD Integration with GitHub Actions

**Duration:** ~10 minutes
**Audience:** DevOps engineers, policy authors, team leads
**Prerequisites:** A GitHub repository with the playground source code, repository admin access
**Related Guide:** [CI/CD Integration Guide](./cicd-integration.md)

### Script

#### [0:00–0:30] Introduction

**Screen:** GitHub repository with the playground code

**Narration:**
> In this tutorial, we'll set up automated policy testing and deployment using GitHub Actions. You'll configure CI to run lint, type checks, unit tests, property-based tests, and E2E tests on every pull request — and CD to deploy automatically when you merge to main. Everything stays within the GitHub Actions free tier.

---

#### [0:30–2:00] Configure Repository Secrets

**Screen:** GitHub → Settings → Secrets and variables → Actions

**Narration:**
> First, set up the secrets your workflows need. Go to your repository's Settings, then Secrets and variables, then Actions.
>
> For the CD workflow, add three secrets: VERCEL_TOKEN — your Vercel API token, VERCEL_ORG_ID — your Vercel organization ID, and VERCEL_PROJECT_ID — your Vercel project ID. You can find the Vercel IDs by running "vercel link" in the playground directory and checking the generated project.json.
>
> For custom policy workflows, add TEALTIGER_WORKSPACE_ID and TEALTIGER_DEPLOY_TOKEN.

**Actions:**
1. Navigate to Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add `VERCEL_TOKEN` (show the name, blur the value)
4. Add `VERCEL_ORG_ID`
5. Add `VERCEL_PROJECT_ID`
6. Show all five secrets listed

---

#### [2:00–3:30] The CI Workflow

**Screen:** `.github/workflows/playground-ci.yml` in the code editor

**Narration:**
> The CI workflow lives at `.github/workflows/playground-ci.yml`. It triggers on every push to main and on pull requests that touch playground files. Path filters keep unrelated commits fast and free.
>
> It runs four jobs. First, lint and type check — TypeScript compilation and ESLint. Second, unit and property-based tests with Vitest and fast-check, including coverage reporting. Third, E2E tests with Playwright against the built output. Fourth, a PR comment job that posts a summary table with results from all three test jobs.

**Actions:**
1. Open the CI workflow file
2. Highlight the trigger configuration (paths filter)
3. Scroll through each job — briefly show the key steps
4. Highlight the concurrency setting (cancel in-progress runs)

---

#### [3:30–5:00] See CI in Action

**Screen:** GitHub → Pull Request with CI running

**Narration:**
> Let's see it in action. Create a branch, make a change to a policy, and open a pull request. The CI workflow triggers automatically. You can watch the jobs run in the Actions tab.
>
> When all jobs complete, a comment appears on the PR with a summary table — lint status, test counts, coverage percentages. If any job fails, the PR is blocked from merging — assuming you've enabled branch protection rules.

**Actions:**
1. Show a pull request with the CI workflow running
2. Click into the Actions tab — show the four jobs in progress
3. Wait for completion (or show a pre-recorded completion)
4. Switch back to the PR — show the summary comment:

```
## 🐯 TealTiger Playground CI Results

| Check | Status |
|-------|--------|
| Lint & Type Check | ✅ Passed |
| Unit & Property Tests | ✅ 142/142 passed |
| E2E Tests (Playwright) | ✅ 28/28 passed |
| Coverage | Lines: 83% |
```

5. Show the merge button enabled (or blocked if a job failed)

---

#### [5:00–6:30] The CD Workflow

**Screen:** `.github/workflows/playground-deploy.yml`

**Narration:**
> The CD workflow triggers on pushes to main — typically after merging a PR. It builds the playground, deploys to Vercel production, runs smoke tests against the live URL, and sets a deployment status on the commit.
>
> Smoke tests verify three things: the deployment returns HTTP 200, the page contains expected content like "TealTiger," and static assets are accessible. If smoke tests fail, the deployment status is marked as failed.

**Actions:**
1. Open the CD workflow file
2. Highlight the deploy job — show the Vercel CLI commands
3. Highlight the smoke test job — show the three checks
4. Show a successful deployment status on a commit in GitHub

---

#### [6:30–8:00] Generate a Custom Workflow

**Screen:** Playground UI → CI/CD Integration panel (or code editor)

**Narration:**
> The playground includes a workflow generator for custom pipelines. Use the CICDIntegrationService to generate a GitHub Actions YAML tailored to your policy testing needs.
>
> Pass in your workspace ID, repository name, branch, test suite ID, and whether to auto-deploy on merge. The generated workflow includes policy syntax validation, test suite execution, property-based tests, coverage reporting, and PR comments.
>
> Save the output as a workflow file in your repository's `.github/workflows` directory.

**Actions:**
1. Show the CICDIntegrationService usage:

```typescript
const cicd = new CICDIntegrationService();
const yaml = await cicd.generateWorkflow({
  workspaceId: 'ws-abc123',
  githubRepo: 'acme/policies',
  branch: 'main',
  testSuiteId: 'suite-xyz',
  autoDeployOnMerge: true,
  targetEnvironment: 'production',
});
```

2. Show the generated YAML output
3. Show saving it to `.github/workflows/policy-validation.yml`

---

#### [8:00–9:00] Branch Protection Rules

**Screen:** GitHub → Settings → Branches → Branch protection rules

**Narration:**
> To enforce that CI passes before merging, set up branch protection rules. Go to Settings, Branches, and add a rule for main. Enable "Require status checks to pass before merging" and select the three CI jobs: Lint and Type Check, Unit and Property-Based Tests, and E2E Tests.
>
> Now no one can merge a PR until all checks are green. This is your safety net for production quality.

**Actions:**
1. Navigate to Settings → Branches
2. Click "Add rule" for `main`
3. Enable "Require status checks to pass before merging"
4. Search for and select the three status checks
5. Click "Save changes"

---

#### [9:00–9:30] Free Tier Budget Tips

**Screen:** GitHub → Settings → Billing → Actions usage

**Narration:**
> GitHub Actions gives you two thousand free minutes per month for private repos — unlimited for public. A full CI run uses about six to ten minutes. Path filters, concurrency controls, and caching keep usage efficient. Check your usage under Settings, Billing, Actions. If you're approaching the limit, reduce E2E test frequency or split workflows.

**Action:** Show the Actions usage page with minutes consumed.

---

#### [9:30–10:00] Wrap-Up

**Screen:** GitHub Actions tab showing green checks

**Narration:**
> You've set up automated CI with lint, type checks, unit tests, property-based tests, and E2E tests — plus CD that deploys to Vercel on merge. Every pull request gets a summary comment, and branch protection ensures nothing reaches main without passing. All within the free tier. Check the written CI/CD Integration Guide for troubleshooting tips and additional workflow examples.

---

## Recording Guidelines

Follow these guidelines for a consistent look and feel across all tutorials.

### Environment Setup

- Use a clean browser profile with no extensions visible
- Set browser zoom to 100% (or 110% for readability on smaller screens)
- Use a 1920×1080 resolution for recording
- Close all unrelated browser tabs
- Use a workspace named `demo-workspace` with pre-populated sample data
- Sign in with a demo GitHub account (not a personal account with sensitive data)

### Screen Recording

- Record at 1080p (1920×1080) minimum, 4K (3840×2160) preferred
- Use 30fps for screen recordings (60fps is unnecessary for UI walkthroughs)
- Capture system audio off — narration is added separately or recorded live
- Use a tool like OBS Studio, ScreenFlow, or Loom
- Keep mouse movements deliberate and slow — avoid rapid clicking

### Narration

- Speak at a moderate pace — aim for 130–150 words per minute
- Use a quality USB microphone in a quiet room
- Record narration in a single pass per section, then edit
- Pause briefly (1–2 seconds) between sections for editing flexibility
- Avoid filler words ("um," "uh," "so") — re-record if needed

### Visual Aids

- Use cursor highlights or zoom-ins when clicking small UI elements
- Add callout boxes or arrows for important UI elements (post-production)
- Use lower-third text overlays for key terms (e.g., "Draft → Review → Approved → Production")
- Add chapter markers matching the timestamp sections in each script

### Accessibility

- Include closed captions for all narration (auto-generated + reviewed)
- Ensure sufficient color contrast in any overlays or annotations
- Describe visual elements verbally — don't rely solely on "click here" without context
- Provide a text transcript alongside each published video

### Branding

- Use the TealTiger color palette for any custom overlays
- Include the TealTiger logo in the intro and outro slides
- Add a consistent intro card: "TealTiger Playground — [Tutorial Title]"
- Add a consistent outro card with links to the documentation site and next tutorial

---

## Publishing Checklist

Use this checklist before publishing each tutorial.

### Pre-Publish

- [ ] Script reviewed by at least one team member
- [ ] Recording matches the script timestamps (±30 seconds per section)
- [ ] Audio levels are consistent throughout (normalize to -16 LUFS)
- [ ] Closed captions are accurate and synced
- [ ] No sensitive data visible (API keys, real emails, personal repos)
- [ ] All UI elements are legible at 720p playback
- [ ] Chapter markers added matching the script sections

### YouTube Upload

- [ ] Title format: `TealTiger Playground: [Tutorial Name] | Getting Started`
- [ ] Description includes: summary, timestamps, links to written guides, links to other tutorials
- [ ] Tags: `TealTiger`, `AI security`, `policy management`, `LLM guardrails`, `compliance`, `OWASP`, `GitHub Actions`
- [ ] Thumbnail: consistent template with tutorial title and TealTiger branding
- [ ] Playlist: "TealTiger Playground Tutorials" (create if it doesn't exist)
- [ ] End screen: link to next tutorial in the series
- [ ] Cards: link to the written guide at relevant timestamps

### Documentation Site

- [ ] Embed video on the corresponding guide page (Getting Started, Governance, Compliance, CI/CD)
- [ ] Add a "Video Tutorial" section at the top of each guide with the embed
- [ ] Update the docs Table of Contents to include video links
- [ ] Cross-link between tutorials in the description and end cards

### Sample YouTube Description Template

```
TealTiger Playground: [Tutorial Title]

[One-sentence summary of what the viewer will learn.]

⏱️ Timestamps:
0:00 Introduction
0:30 [Section 2 title]
...

📖 Written Guide: [link to corresponding .md guide]
🐯 TealTiger Playground: [link to live playground]
📂 Source Code: [link to GitHub repo]

🎬 More Tutorials:
• Tutorial 1: Workspace Setup — [link]
• Tutorial 2: Policy Governance — [link]
• Tutorial 3: Compliance Mapping — [link]
• Tutorial 4: CI/CD Integration — [link]

#TealTiger #AISecurity #LLMGuardrails #PolicyManagement #Compliance
```
