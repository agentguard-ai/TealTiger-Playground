// GitHub Actions workflow templates for TealTiger CI/CD integration
// Requirements: 15.1, 15.10

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  filename: string;
  category: 'validation' | 'testing' | 'deployment';
  yaml: string;
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'policy-validation',
    name: 'Policy Validation',
    description: 'Validates policy syntax and structure on every push and PR. Catches errors before they reach production.',
    filename: 'policy-validation.yml',
    category: 'validation',
    yaml: `# TealTiger Policy Validation Workflow
# Validates policy syntax and structure on push/PR
name: TealTiger Policy Validation

on:
  push:
    branches: [main]
    paths:
      - 'policies/**'
  pull_request:
    branches: [main]
    paths:
      - 'policies/**'

permissions:
  contents: read

jobs:
  validate:
    name: Validate Policies
    runs-on: ubuntu-latest
    timeout-minutes: 5

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Validate policy syntax
        run: npm run lint:policies

      - name: Check policy structure
        run: npm run validate:policies
`,
  },
  {
    id: 'policy-testing',
    name: 'Policy Testing',
    description: 'Runs the full policy test suite including property-based tests, generates coverage reports, and posts results to PRs.',
    filename: 'policy-testing.yml',
    category: 'testing',
    yaml: `# TealTiger Policy Testing Workflow
# Runs policy tests and posts results to PRs
name: TealTiger Policy Testing

on:
  push:
    branches: [main, staging]
    paths:
      - 'policies/**'
      - 'tests/**'
  pull_request:
    branches: [main]
    paths:
      - 'policies/**'
      - 'tests/**'

permissions:
  contents: read
  pull-requests: write

jobs:
  test:
    name: Run Policy Tests
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Run policy test suite
        run: npm run test:policies
        env:
          TEALTIGER_WORKSPACE_ID: \${{ secrets.TEALTIGER_WORKSPACE_ID }}

      - name: Run property-based tests
        run: npm run test:policies:pbt

      - name: Generate coverage report
        run: npm run test:policies:coverage

      - name: Upload coverage artifact
        uses: actions/upload-artifact@v4
        with:
          name: policy-coverage
          path: coverage/
          retention-days: 30

      - name: Post test results to PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const results = JSON.parse(fs.readFileSync('test-results.json', 'utf8'));
            const body = [
              '## 🐯 TealTiger Policy Test Results',
              '',
              \`✅ Passed: \${results.passed}\`,
              \`❌ Failed: \${results.failed}\`,
              \`⏭️ Skipped: \${results.skipped}\`,
              \`📊 Coverage: \${results.coverage}%\`,
              '',
              \`⏱️ Duration: \${results.duration}ms\`,
            ].join('\\n');
            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body,
            });
`,
  },
  {
    id: 'policy-deployment',
    name: 'Policy Deployment',
    description: 'Automatically deploys validated policies to the target environment after tests pass on merge to main.',
    filename: 'policy-deployment.yml',
    category: 'deployment',
    yaml: `# TealTiger Policy Deployment Workflow
# Auto-deploys policies after successful validation
name: TealTiger Policy Deployment

on:
  push:
    branches: [main]
    paths:
      - 'policies/**'

permissions:
  contents: read
  deployments: write

jobs:
  validate-and-deploy:
    name: Validate and Deploy
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Validate policy syntax
        run: npm run lint:policies

      - name: Run policy tests
        run: npm run test:policies
        env:
          TEALTIGER_WORKSPACE_ID: \${{ secrets.TEALTIGER_WORKSPACE_ID }}

      - name: Deploy to staging
        if: success()
        run: npm run deploy:policy -- --env staging
        env:
          TEALTIGER_WORKSPACE_ID: \${{ secrets.TEALTIGER_WORKSPACE_ID }}
          TEALTIGER_DEPLOY_TOKEN: \${{ secrets.TEALTIGER_DEPLOY_TOKEN }}

      - name: Run smoke tests
        run: npm run test:smoke
        env:
          TEALTIGER_WORKSPACE_ID: \${{ secrets.TEALTIGER_WORKSPACE_ID }}

      - name: Promote to production
        if: success()
        run: npm run deploy:policy -- --env production
        env:
          TEALTIGER_WORKSPACE_ID: \${{ secrets.TEALTIGER_WORKSPACE_ID }}
          TEALTIGER_DEPLOY_TOKEN: \${{ secrets.TEALTIGER_DEPLOY_TOKEN }}
`,
  },
];

/**
 * Returns a workflow template by ID
 */
export function getWorkflowTemplate(id: string): WorkflowTemplate | undefined {
  return WORKFLOW_TEMPLATES.find((t) => t.id === id);
}

/**
 * Returns workflow templates filtered by category
 */
export function getWorkflowsByCategory(category: WorkflowTemplate['category']): WorkflowTemplate[] {
  return WORKFLOW_TEMPLATES.filter((t) => t.category === category);
}
