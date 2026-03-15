# CI/CD Integration Guide

Automate policy testing and deployment with GitHub Actions. The TealTiger Playground ships with two pre-configured workflows — one for continuous integration (CI) and one for continuous deployment (CD) — plus a built-in workflow generator for custom pipelines.

> All workflows run within the GitHub Actions free tier (2,000 minutes/month). Estimated usage per CI run: ~2 minutes.

## Table of Contents

- [Overview](#overview)
- [1. GitHub Actions Setup](#1-github-actions-setup)
- [2. CI Workflow — Automated Testing](#2-ci-workflow--automated-testing)
- [3. CD Workflow — Automated Deployment](#3-cd-workflow--automated-deployment)
- [4. Generating Custom Workflows](#4-generating-custom-workflows)
- [5. Automated Testing in Detail](#5-automated-testing-in-detail)
- [6. PR Comments and Test Reporting](#6-pr-comments-and-test-reporting)
- [7. Example Workflows](#7-example-workflows)
- [8. Free Tier Budget Management](#8-free-tier-budget-management)
- [9. Troubleshooting](#9-troubleshooting)
- [10. Next Steps](#10-next-steps)

---

## Overview

The CI/CD integration covers three layers:

| Layer | What it does | Workflow file |
|-------|-------------|---------------|
| **CI** | Lint, type-check, unit/property-based tests, E2E tests, coverage | `.github/workflows/playground-ci.yml` |
| **CD** | Build, deploy to Vercel, smoke tests, status notification | `.github/workflows/playground-deploy.yml` |
| **Custom** | Generate workflow YAML from the playground UI via `CICDIntegrationService` | On-demand |

Both pre-built workflows trigger only when files under `playground/` change, keeping unrelated commits fast and free.

---

## 1. GitHub Actions Setup

### Prerequisites

- A GitHub repository with the playground source code
- Repository admin access (to configure secrets)
- A Vercel account on the free tier (for CD only)

### Required Secrets

Navigate to your repository's **Settings → Secrets and variables → Actions** and add:

| Secret | Required by | Description |
|--------|------------|-------------|
| `VERCEL_TOKEN` | CD workflow | Vercel API token ([create one here](https://vercel.com/account/tokens)) |
| `VERCEL_ORG_ID` | CD workflow | Your Vercel organization/team ID |
| `VERCEL_PROJECT_ID` | CD workflow | The Vercel project ID for the playground |
| `TEALTIGER_WORKSPACE_ID` | Custom workflows | Your TealTiger workspace ID (for policy test suites) |
| `TEALTIGER_DEPLOY_TOKEN` | Custom workflows | Deploy token for automated policy deployment |

To find your Vercel IDs, run `vercel link` in the `playground/` directory and check the generated `.vercel/project.json`.

### Required Permissions

The CI workflow needs `pull-requests: write` permission to post test result comments on PRs. This is already configured in the workflow file:

```yaml
permissions:
  pull-requests: write
```

The CD workflow needs `statuses: write` to set commit deployment status:

```yaml
permissions:
  statuses: write
```

---

## 2. CI Workflow — Automated Testing

**File:** `.github/workflows/playground-ci.yml`

The CI workflow runs on every push to `main` and on pull requests that touch playground files.

### Trigger Configuration

```yaml
on:
  push:
    branches: [main]
    paths:
      - 'playground/**'
      - '.github/workflows/playground-ci.yml'
  pull_request:
    branches: [main]
    paths:
      - 'playground/**'
      - '.github/workflows/playground-ci.yml'
```

### Jobs

The workflow runs four jobs:

#### 1. Lint & Type Check

Runs TypeScript compilation and ESLint to catch syntax and style issues early.

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: actions/setup-node@v4
    with:
      node-version: 20
      cache: npm
      cache-dependency-path: playground/package-lock.json
  - run: npm ci
  - run: npx tsc -b --noEmit    # Type check
  - run: npm run lint            # ESLint
```

#### 2. Unit & Property-Based Tests

Runs all Vitest tests (unit tests and fast-check property-based tests) with coverage reporting.

```yaml
- name: Run unit and property-based tests with coverage
  run: npx vitest --run --coverage --reporter=default --reporter=json --outputFile=test-results.json
```

Coverage reports and test results are uploaded as artifacts and retained for 7 days.

#### 3. E2E Tests (Playwright)

Builds the playground and runs Playwright end-to-end tests against the built output.

```yaml
- name: Build playground
  run: npm run build
- name: Run E2E tests
  run: npx playwright test --reporter=list,json
```

Playwright browsers are cached between runs to save time. Test results, reports, and screenshots are uploaded as artifacts.

#### 4. PR Comment with Results

On pull requests, a summary comment is posted (or updated) with results from all three test jobs:

```
## 🐯 TealTiger Playground CI Results

| Check | Status |
|-------|--------|
| Lint & Type Check | ✅ Passed |
| Unit & Property Tests | ✅ 142/142 passed |
| E2E Tests (Playwright) | ✅ 28/28 passed |
| Coverage | Lines: 83% | Branches: 71% | Functions: 79% | Statements: 82% |
```

### Concurrency

Only one CI run per branch at a time. New pushes cancel in-progress runs:

```yaml
concurrency:
  group: playground-ci-${{ github.ref }}
  cancel-in-progress: true
```

### Blocking PRs on Failure

To require passing CI before merging, enable branch protection rules:

1. Go to **Settings → Branches → Branch protection rules**
2. Click **Add rule** for `main`
3. Enable **Require status checks to pass before merging**
4. Search for and select these status checks:
   - `Lint & Type Check`
   - `Unit & Property-Based Tests`
   - `E2E Tests (Playwright)`
5. Save changes

Now PRs cannot be merged until all three jobs pass.

---

## 3. CD Workflow — Automated Deployment

**File:** `.github/workflows/playground-deploy.yml`

The CD workflow triggers on pushes to `main` (after a PR merge) when playground files change.

### Jobs

#### 1. Deploy to Vercel

Builds the playground and deploys to Vercel production:

```yaml
- name: Install Vercel CLI
  run: npm install -g vercel@latest

- name: Pull Vercel environment
  run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}

- name: Deploy to Vercel (Production)
  run: |
    DEPLOYMENT_URL=$(vercel deploy --prod --token=${{ secrets.VERCEL_TOKEN }} 2>&1 | tail -1)
    echo "deployment-url=$DEPLOYMENT_URL" >> "$GITHUB_OUTPUT"
```

The deployment URL is passed to downstream jobs.

#### 2. Smoke Tests

After deployment, three smoke tests verify the deployment is healthy:

- **Health check** — Confirms HTTP 200 from the deployment URL
- **Content verification** — Checks the page contains expected keywords (TealTiger, playground)
- **Static asset check** — Verifies `index.html` is accessible

#### 3. Deployment Status Notification

Sets a commit status on GitHub indicating whether the deployment and smoke tests succeeded or failed. This status appears on the commit and in PR merge checks.

### Concurrency

Deployments run sequentially (no cancellation) to avoid partial deploys:

```yaml
concurrency:
  group: playground-deploy-${{ github.ref }}
  cancel-in-progress: false
```

---

## 4. Generating Custom Workflows

The playground includes a `CICDIntegrationService` that generates GitHub Actions workflow YAML tailored to your policy testing needs.

### Using the Service

```typescript
import { CICDIntegrationService } from '../services/CICDIntegrationService';

const cicd = new CICDIntegrationService();

// Generate a workflow for your repository
const workflowYaml = await cicd.generateWorkflow({
  workspaceId: 'your-workspace-id',
  githubRepo: 'your-org/your-repo',
  branch: 'main',
  testSuiteId: 'suite-abc123',
  autoDeployOnMerge: true,
  targetEnvironment: 'production',
});

console.log(workflowYaml);
```

### Configuration Options

| Option | Type | Description |
|--------|------|-------------|
| `workspaceId` | `string` | Your TealTiger workspace ID |
| `githubRepo` | `string` | GitHub repository (e.g., `org/repo`) |
| `branch` | `string` | Branch to trigger on (e.g., `main`) |
| `testSuiteId` | `string` | ID of the policy test suite to run |
| `autoDeployOnMerge` | `boolean` | Add a deploy job after tests pass |
| `targetEnvironment` | `string` | Deploy target: `development`, `staging`, or `production` |

### Generated Workflow Structure

The generated workflow includes:

1. **Policy syntax validation** — `npm run lint:policies`
2. **Policy test suite execution** — Runs the specified test suite
3. **Property-based tests** — `npm run test:policies:pbt`
4. **Coverage report generation** — Uploaded as an artifact
5. **PR comment** — Posts test results on pull requests
6. **Auto-deploy** (optional) — Deploys to the target environment on merge

### Saving the Workflow

Save the generated YAML to your repository:

```bash
# Copy the generated YAML to your workflows directory
mkdir -p .github/workflows
# Save the output as a workflow file
cat > .github/workflows/policy-validation.yml << 'EOF'
# Paste generated YAML here
EOF

git add .github/workflows/policy-validation.yml
git commit -m "Add TealTiger policy validation workflow"
git push
```

---

## 5. Automated Testing in Detail

### Policy Syntax Validation

The `CICDIntegrationService.validateSyntax()` method checks policy code for errors before execution:

```typescript
const result = await cicd.validateSyntax(policyCode);

if (!result.isValid) {
  console.error('Syntax errors:', result.errors);
  // Each error includes: { line, column, message }
}

if (result.warnings.length > 0) {
  console.warn('Warnings:', result.warnings);
}
```

In CI, this runs as `npm run lint:policies` and blocks the pipeline on errors.

### Running Test Suites

Run a full test suite against a policy version:

```typescript
const results = await cicd.runTestSuite(
  'policy-id',
  'version-id',
  'test-suite-id'
);

console.log(`Passed: ${results.passed}`);
console.log(`Failed: ${results.failed}`);
console.log(`Coverage: ${results.coverage}%`);

// Inspect failures
for (const failure of results.failures) {
  console.log(`${failure.testName}: expected ${failure.expected}, got ${failure.actual}`);
  console.log(`  Error: ${failure.error}`);
}
```

### Coverage Reports

Generate a coverage report from test results:

```typescript
const coverage = await cicd.generateCoverageReport(testRunResult);

console.log(`Coverage: ${coverage.coveragePercentage}%`);
console.log(`Lines: ${coverage.coveredLines}/${coverage.totalLines}`);
console.log(`Uncovered lines: ${coverage.uncoveredLines.join(', ')}`);
```

Coverage artifacts are uploaded in CI and retained for 30 days.

### Property-Based Tests

Property-based tests (powered by fast-check) run alongside unit tests. They verify that policies hold universal properties across randomized inputs — for example, that a cost-control policy always denies requests above the budget threshold regardless of the provider or model.

In CI, these run as part of the Vitest suite:

```bash
npx vitest --run --coverage
```

---

## 6. PR Comments and Test Reporting

### Automatic PR Comments

The CI workflow posts a formatted comment on every pull request with a summary table of all test results. If a comment already exists from a previous push, it updates the existing comment instead of creating a new one.

### Posting Custom PR Comments

Use the `CICDIntegrationService.postPRComment()` method to post policy-specific test results:

```typescript
await cicd.postPRComment(
  'your-org/your-repo',
  42,  // PR number
  testRunResult
);
```

This posts a comment like:

```
## 🐯 TealTiger Policy Test Results

✅ Passed: 15
❌ Failed: 0
⏭️ Skipped: 2
📊 Coverage: 87%

⏱️ Duration: 1234ms
```

---

## 7. Example Workflows

### Example 1: Policy-Only CI (Minimal)

A lightweight workflow that only validates policy syntax and runs tests — no E2E or deployment:

```yaml
name: Policy Validation

on:
  pull_request:
    branches: [main]
    paths:
      - 'policies/**'
      - 'tests/**'

jobs:
  validate:
    name: Validate Policies
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm
      - run: npm ci
      - name: Validate policy syntax
        run: npm run lint:policies
      - name: Run policy tests
        run: npx vitest --run --reporter=default
```

### Example 2: Full CI + CD Pipeline

Combines testing with automatic deployment on merge:

```yaml
name: TealTiger Full Pipeline

on:
  push:
    branches: [main]
    paths: ['playground/**']
  pull_request:
    branches: [main]
    paths: ['playground/**']

concurrency:
  group: pipeline-${{ github.ref }}
  cancel-in-progress: true

jobs:
  test:
    name: Test
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm
          cache-dependency-path: playground/package-lock.json
      - run: npm ci
        working-directory: playground
      - name: Lint & type check
        run: npx tsc -b --noEmit && npm run lint
        working-directory: playground
      - name: Unit & property-based tests
        run: npx vitest --run --coverage
        working-directory: playground
      - name: Build
        run: npm run build
        working-directory: playground
      - name: E2E tests
        run: npx playwright test
        working-directory: playground

  deploy:
    name: Deploy
    needs: test
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm
          cache-dependency-path: playground/package-lock.json
      - run: npm ci
        working-directory: playground
      - run: npm run build
        working-directory: playground
      - name: Deploy to Vercel
        run: |
          npm install -g vercel@latest
          vercel deploy --prod --token=${{ secrets.VERCEL_TOKEN }}
        working-directory: playground
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
```

### Example 3: Scheduled Policy Regression Tests

Run policy tests on a schedule to catch regressions from dependency updates:

```yaml
name: Scheduled Policy Regression

on:
  schedule:
    - cron: '0 6 * * 1'  # Every Monday at 6:00 UTC
  workflow_dispatch:        # Allow manual trigger

jobs:
  regression:
    name: Policy Regression Tests
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm
          cache-dependency-path: playground/package-lock.json
      - run: npm ci
        working-directory: playground
      - name: Run full test suite
        run: npx vitest --run --coverage --reporter=json --outputFile=regression-results.json
        working-directory: playground
      - name: Upload results
        uses: actions/upload-artifact@v4
        with:
          name: regression-results
          path: playground/regression-results.json
          retention-days: 90
```

### Example 4: Policy Deployment with Environment Promotion

Deploy policies through environments (development → staging → production):

```yaml
name: Policy Environment Promotion

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Target environment'
        required: true
        type: choice
        options:
          - development
          - staging
          - production
      policy_id:
        description: 'Policy ID to deploy'
        required: true
        type: string

jobs:
  deploy-policy:
    name: Deploy to ${{ inputs.environment }}
    runs-on: ubuntu-latest
    timeout-minutes: 5
    environment: ${{ inputs.environment }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm
          cache-dependency-path: playground/package-lock.json
      - run: npm ci
        working-directory: playground
      - name: Deploy policy
        run: npm run deploy:policy -- --env ${{ inputs.environment }} --policy ${{ inputs.policy_id }}
        working-directory: playground
        env:
          TEALTIGER_WORKSPACE_ID: ${{ secrets.TEALTIGER_WORKSPACE_ID }}
          TEALTIGER_DEPLOY_TOKEN: ${{ secrets.TEALTIGER_DEPLOY_TOKEN }}
```

---

## 8. Free Tier Budget Management

GitHub Actions provides 2,000 free minutes per month for private repositories (unlimited for public repos).

### Estimated Usage Per Run

| Job | Estimated Duration |
|-----|-------------------|
| Lint & Type Check | ~1-2 min |
| Unit & Property Tests | ~2-3 min |
| E2E Tests (Playwright) | ~3-5 min |
| Deploy to Vercel | ~2-3 min |
| Smoke Tests | ~1 min |

A full CI run uses roughly 6-10 minutes. A CD run adds another 3-4 minutes.

### Tips to Stay Within Limits

- **Path filters** — Both workflows only trigger on `playground/**` changes, skipping unrelated commits
- **Concurrency controls** — In-progress CI runs are cancelled when new commits are pushed
- **Caching** — npm dependencies and Playwright browsers are cached between runs
- **Timeout limits** — Each job has a timeout to prevent runaway builds
- **Scheduled runs** — Use `workflow_dispatch` or weekly schedules for regression tests instead of running on every push

### Monitoring Usage

Check your usage at **Settings → Billing → Actions** in your GitHub repository. If you're approaching the limit, consider:

1. Reducing E2E test frequency (run only on PRs, not on push to main)
2. Splitting workflows so only relevant jobs run
3. Using `paths-ignore` to skip documentation-only changes

---

## 9. Troubleshooting

### CI workflow not triggering

- Verify the workflow file is at `.github/workflows/playground-ci.yml`
- Check that your changes are under the `playground/` directory
- Ensure the branch matches the trigger configuration (`main`)

### PR comment not appearing

- Confirm the workflow has `pull-requests: write` permission
- Check that the `pr-comment` job ran (it requires all three test jobs to complete)
- Look for errors in the Actions log under the "Post or update PR comment" step

### Vercel deployment failing

- Verify all three secrets are set: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
- Run `vercel link` locally to confirm the project is linked correctly
- Check that the Vercel token hasn't expired

### Playwright tests failing in CI

- Playwright browsers are cached — if the cache is stale, delete the cache from **Actions → Caches**
- Ensure `npx playwright install --with-deps chromium` runs when the cache misses
- Check that `npm run build` succeeds before E2E tests run

### Tests pass locally but fail in CI

- CI uses `npm ci` (clean install) — check that `package-lock.json` is committed and up to date
- CI runs on `ubuntu-latest` — check for OS-specific path or timing issues
- Environment variables may differ — verify secrets are set correctly

---

## 10. Next Steps

- [Getting Started Guide](./getting-started.md) — Initial setup and workspace creation
- [Governance Workflow Guide](./governance-workflow.md) — Approval processes, emergency bypass, impact analysis
- [Compliance Mapping Guide](./compliance-mapping.md) — Map policies to OWASP, NIST, SOC2, ISO 27001, GDPR
- [Audit Trail Guide](./audit-trail.md) — Immutable logging, filtering, and export
