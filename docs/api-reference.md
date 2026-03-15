# TealTiger Playground API Reference

Complete reference for all service classes, data models, and interfaces in the TealTiger Playground enterprise platform.

> Source: `playground/src/services/` and `playground/src/types/`

## Table of Contents

- [Authentication](#authentication)
  - [AuthenticationService](#authenticationservice)
  - [SessionManager](#sessionmanager)
- [Workspace Management](#workspace-management)
  - [WorkspaceService](#workspaceservice)
- [Policy Management](#policy-management)
  - [PolicyRegistryService](#policyregistryservice)
  - [PolicyDiffService](#policydiffservice)
  - [PolicyTemplateService](#policytemplateservice)
  - [PolicyImpactAnalysisService](#policyimpactanalysisservice)
- [Collaboration](#collaboration)
  - [CollaborationService](#collaborationservice)
  - [RealtimeCollaborationService](#realtimecollaborationservice)
- [Governance](#governance)
  - [GovernanceService](#governanceservice)
- [Compliance & Audit](#compliance--audit)
  - [ComplianceService](#complianceservice)
  - [ComplianceReportService](#compliancereportservice)
  - [AuditTrailService](#audittrailservice)
- [Enterprise Features](#enterprise-features)
  - [RBACSimulatorService](#rbacsimulatorservice)
  - [EnvironmentService](#environmentservice)
  - [CICDIntegrationService](#cicdintegrationservice)
- [Infrastructure](#infrastructure)
  - [FreeTierMonitoringService](#freetiermonitoringservice)
  - [DataExportService](#dataexportservice)
  - [DataImportService](#dataimportservice)
  - [CacheService](#cacheservice)
  - [DatabaseQueryOptimizer](#databasequeryoptimizer)
- [Data Models](#data-models)
- [Error Handling](#error-handling)
- [TypeDoc Generation](#typedoc-generation)

---

## Authentication

### AuthenticationService

`src/services/AuthenticationService.ts`

Handles GitHub OAuth authentication via Supabase Auth. Exported as singleton `authService`.

| Method | Signature | Description |
|--------|-----------|-------------|
| `signInWithGitHub` | `() => Promise<void>` | Initiates GitHub OAuth flow. Redirects to GitHub authorization page. |
| `handleCallback` | `() => Promise<AuthUser>` | Handles OAuth callback, creates/updates user profile in Supabase. |
| `signOut` | `() => Promise<void>` | Signs out user and clears session. |
| `getCurrentUser` | `() => Promise<AuthUser \| null>` | Returns current authenticated user or `null`. |
| `syncOrganizations` | `(userId: string) => Promise<void>` | Syncs GitHub organization memberships in the background. |

```typescript
import { authService } from '@/services/AuthenticationService';

// Sign in
await authService.signInWithGitHub();

// After callback
const user = await authService.handleCallback();
console.log(user.username, user.organizations);
```

### SessionManager

`src/services/SessionManager.ts`

Manages session persistence across browser restarts with automatic token refresh. Exported as singleton `sessionManager`.

| Method | Signature | Description |
|--------|-----------|-------------|
| `persistSession` | `(session: Session) => Promise<void>` | Stores session in localStorage. |
| `restoreSession` | `() => Promise<Session \| null>` | Restores session from Supabase or localStorage. Refreshes if expired. |
| `refreshSession` | `(refreshToken: string) => Promise<Session>` | Refreshes expired access token using refresh token. |
| `clearSession` | `() => Promise<void>` | Removes session from all storage layers. |
| `isSessionValid` | `(session: Session) => boolean` | Checks if session is valid (includes 5-minute expiry buffer). |
| `setupAutoRefresh` | `(session: Session) => () => void` | Sets up automatic refresh before expiry. Returns cleanup function. |

---

## Workspace Management

### WorkspaceService

`src/services/WorkspaceService.ts`

Manages team workspaces with role-based permissions. Exported as singleton `workspaceService`.

| Method | Signature | Description |
|--------|-----------|-------------|
| `createWorkspace` | `(name: string, ownerId: string) => Promise<Workspace>` | Creates a new workspace. Owner is automatically added as a member. |
| `inviteMember` | `(workspaceId: string, emailOrUsername: string, role: WorkspaceRole, invitedBy: string) => Promise<void>` | Invites a user by email or GitHub username. |
| `removeMember` | `(workspaceId: string, memberId: string) => Promise<void>` | Removes a member from the workspace. |
| `updateMemberRole` | `(workspaceId: string, memberId: string, newRole: WorkspaceRole) => Promise<void>` | Changes a member's role. |
| `transferOwnership` | `(workspaceId: string, currentOwnerId: string, newOwnerId: string) => Promise<void>` | Transfers workspace ownership. |
| `listWorkspaces` | `(userId: string) => Promise<Workspace[]>` | Lists all workspaces the user belongs to. |
| `getMembers` | `(workspaceId: string) => Promise<WorkspaceMember[]>` | Returns all members of a workspace. |
| `getWorkspace` | `(workspaceId: string) => Promise<Workspace \| null>` | Gets a workspace by ID. |
| `checkPermission` | `(workspaceId: string, userId: string, action: WorkspaceAction) => Promise<boolean>` | Checks if a user has permission for an action. |

```typescript
import { workspaceService } from '@/services/WorkspaceService';

const workspace = await workspaceService.createWorkspace('My Team', userId);
await workspaceService.inviteMember(workspace.id, 'teammate', 'editor', userId);
const canEdit = await workspaceService.checkPermission(workspace.id, userId, 'edit_policy');
```

---

## Policy Management

### PolicyRegistryService

`src/services/PolicyRegistryService.ts`

Central policy registry with semantic versioning, search, and branching. Exported as singleton `policyRegistryService`.

| Method | Signature | Description |
|--------|-----------|-------------|
| `createPolicy` | `(input: CreatePolicyInput) => Promise<Policy>` | Creates a new policy in Draft state with version `1.0.0`. |
| `saveVersion` | `(input: SaveVersionInput) => Promise<PolicyVersion>` | Saves a new version (major/minor/patch bump). |
| `revertToVersion` | `(policyId: string, versionId: string, userId: string) => Promise<PolicyVersion>` | Reverts policy to a previous version. Creates a new version with the old code. |
| `listVersions` | `(policyId: string) => Promise<PolicyVersion[]>` | Lists all versions of a policy, newest first. |
| `getVersion` | `(versionId: string) => Promise<PolicyVersion>` | Gets a specific version by ID. |
| `searchPolicies` | `(input: SearchPoliciesInput) => Promise<Policy[]>` | Searches policies by name, tag, author, or category. |
| `branchPolicy` | `(input: BranchPolicyInput) => Promise<Policy>` | Creates a branch (copy) of a policy for experimental changes. |
| `validateUniqueName` | `(workspaceId: string, name: string) => Promise<boolean>` | Checks if a policy name is unique within a workspace. |
| `getPolicy` | `(policyId: string) => Promise<Policy>` | Gets a policy by ID. |
| `listPolicies` | `(workspaceId: string) => Promise<Policy[]>` | Lists all policies in a workspace. |

### PolicyDiffService

`src/services/PolicyDiffService.ts`

Calculates and exports diffs between policy versions. Exported as singleton `policyDiffService`.

| Method | Signature | Description |
|--------|-----------|-------------|
| `calculateDiff` | `(oldVersion: PolicyVersion, newVersion: PolicyVersion) => Promise<PolicyDiff>` | Calculates line-by-line diff between two versions. |
| `exportUnifiedDiff` | `(diff: PolicyDiff) => Promise<string>` | Exports diff in unified format with `+`/`-` indicators. |
| `exportHtmlDiff` | `(diff: PolicyDiff) => Promise<string>` | Exports diff as syntax-highlighted HTML. |
| `compareMetadata` | `(oldMeta: PolicyMetadata, newMeta: PolicyMetadata) => MetadataChange[]` | Compares metadata fields between versions. |

### PolicyTemplateService

`src/services/PolicyTemplateService.ts`

Manages the 15+ enterprise policy template library. Exported as singleton `policyTemplateService`.

| Method | Signature | Description |
|--------|-----------|-------------|
| `listTemplates` | `() => PolicyTemplate[]` | Returns all available templates. |
| `getTemplate` | `(templateId: string) => PolicyTemplate \| undefined` | Gets a template by ID. |
| `getTemplatesByCategory` | `(category: string) => PolicyTemplate[]` | Filters templates by category. |
| `getTemplatesByTags` | `(tags: string[]) => PolicyTemplate[]` | Filters templates by tags. |
| `searchTemplates` | `(query: string) => PolicyTemplate[]` | Searches templates by name, description, or tags. |
| `customizeTemplate` | `(templateId: string, parameters: Record<string, unknown>) => string` | Applies parameter values to a template. Returns customized code. |
| `validateParameters` | `(templateId: string, parameters: Record<string, unknown>) => TemplateValidationResult` | Validates parameters against template schema. |
| `saveCustomizedTemplate` | `(customized: Omit<CustomizedTemplate, 'createdAt'>) => Promise<CustomizedTemplate>` | Saves a customized template to workspace. |
| `getCategories` | `() => string[]` | Returns all template categories. |
| `getTags` | `() => string[]` | Returns all template tags. |

### PolicyImpactAnalysisService

`src/services/PolicyImpactAnalysisService.ts`

Analyzes the impact of policy changes by running test scenarios against old and new versions. Exported as singleton `policyImpactAnalysisService`.

| Method | Signature | Description |
|--------|-----------|-------------|
| `analyzeImpact` | `(policyId: string, oldVersionId: string, newVersionId: string) => Promise<ImpactAnalysis>` | Full impact analysis comparing two versions. |
| `runImpactTests` | `(policyCode: string, scenarios: EvaluationScenario[]) => Promise<ScenarioResult[]>` | Runs test scenarios against a policy version. |
| `compareResults` | `(oldResults: ScenarioResult[], newResults: ScenarioResult[]) => AffectedScenario[]` | Compares results between versions. Detects decision, cost (±10%), and latency (±20%) changes. |
| `filterBySeverity` | `(scenarios: AffectedScenario[], severity: ImpactSeverity) => AffectedScenario[]` | Filters affected scenarios by severity (breaking/warning/info). |
| `exportImpactReport` | `(analysis: ImpactAnalysis, format: 'csv' \| 'pdf') => Promise<string \| Blob>` | Exports impact report as CSV or PDF. |
| `logImpactAnalysis` | `(analysis: ImpactAnalysis, userId: string) => Promise<void>` | Logs impact analysis to the audit trail. |

---

## Collaboration

### CollaborationService

`src/services/CollaborationService.ts`

Manages inline code comments with threading, mentions, and version persistence. Exported as singleton `collaborationService`.

| Method | Signature | Description |
|--------|-----------|-------------|
| `addComment` | `(input: AddCommentInput) => Promise<Comment>` | Adds a comment to a specific line of policy code. |
| `addReply` | `(input: AddReplyInput) => Promise<CommentReply>` | Adds a threaded reply to a comment. |
| `resolveComment` | `(commentId: string) => Promise<void>` | Marks a comment as resolved. |
| `reopenComment` | `(commentId: string) => Promise<void>` | Reopens a resolved comment. |
| `getComments` | `(policyId: string, versionId?: string) => Promise<CommentThread[]>` | Gets all comment threads for a policy. |
| `filterComments` | `(policyId: string, filters: CommentFilters) => Promise<CommentThread[]>` | Filters comments by author, status, or date range. |
| `countUnresolved` | `(policyId: string) => Promise<number>` | Returns count of unresolved comments. |
| `notifyMentions` | `(comment: Comment) => Promise<void>` | Sends notifications for @mentioned users. |
| `migrateComments` | `(policyId: string, oldVersionId: string, newVersionId: string) => Promise<void>` | Migrates comments to a new policy version. |

### RealtimeCollaborationService

`src/services/RealtimeCollaborationService.ts`

Real-time synchronization via Supabase channels with offline support. Exported as singleton `realtimeCollaborationService`.

| Method | Signature | Description |
|--------|-----------|-------------|
| `subscribeToPolicyChanges` | `(policyId: string, callback: (change: PolicyChange) => void) => Promise<void>` | Subscribes to live policy edits via Supabase real-time. |
| `subscribeToComments` | `(policyId: string, callback: (comment: Comment) => void) => Promise<void>` | Subscribes to live comment updates. |
| `broadcastPresence` | `(workspaceId: string, userId: string, metadata?: object) => Promise<void>` | Broadcasts user presence (active editing). |
| `getActiveUsers` | `(workspaceId: string) => Promise<PresenceState[]>` | Returns currently active users in a workspace. |
| `syncOfflineChanges` | `(changes: PendingChange[]) => Promise<SyncResult>` | Syncs queued offline changes with conflict resolution. |
| `queueOfflineChange` | `(type: string, data: any) => void` | Queues a change for later sync when offline. |
| `getOfflineQueue` | `() => PendingChange[]` | Returns pending offline changes. |
| `isServiceOnline` | `() => boolean` | Returns current online/offline status. |
| `unsubscribeAll` | `() => Promise<void>` | Cleans up all subscriptions. |

---

## Governance

### GovernanceService

`src/services/GovernanceService.ts`

Manages the policy approval workflow: Draft → Review → Approved → Production. Exported as singleton `governanceService`.

| Method | Signature | Description |
|--------|-----------|-------------|
| `promotePolicy` | `(input: PromotePolicyInput) => Promise<Policy>` | Promotes a policy to the next state. Validates transition rules and approval requirements. |
| `requestApproval` | `(input: RequestApprovalInput) => Promise<void>` | Sends approval requests to designated approvers. |
| `approvePolicy` | `(input: ApprovePolicyInput) => Promise<PolicyApproval>` | Records an approval with comment. |
| `rejectPolicy` | `(input: RejectPolicyInput) => Promise<PolicyApproval>` | Records a rejection with reason. |
| `getApprovalStatus` | `(policyId: string) => Promise<GovernanceWorkflow>` | Returns current approval status including all approvals and whether promotion is possible. |
| `notifyApprovers` | `(policyId: string, approverIds: string[]) => Promise<void>` | Sends notifications to approvers. |
| `validateEditPermission` | `(policyId: string, userId: string) => Promise<boolean>` | Checks if a policy can be edited (blocked for Approved/Production states). |
| `emergencyBypass` | `(input: EmergencyBypassInput) => Promise<void>` | Emergency state promotion bypassing approvals. Logged in audit trail. |
| `checkAutoApproval` | `(policyId: string, oldCode: string, newCode: string) => Promise<boolean>` | Checks if a change qualifies for auto-approval based on workspace rules. |

```typescript
import { governanceService } from '@/services/GovernanceService';

// Promote from Draft to Review
await governanceService.promotePolicy({
  policyId: 'policy-123',
  targetState: PolicyState.Review,
  userId: 'user-456',
});

// Check approval status
const status = await governanceService.getApprovalStatus('policy-123');
console.log(status.canPromote); // true when all required approvals are met
```

---

## Compliance & Audit

### ComplianceService

`src/services/ComplianceService.ts`

Maps policies to compliance frameworks (OWASP, NIST, SOC2, ISO 27001, GDPR). Exported as singleton `complianceService`.

| Method | Signature | Description |
|--------|-----------|-------------|
| `mapPolicyToRequirement` | `(input: CreateMappingInput) => Promise<ComplianceMapping>` | Maps a policy to a framework requirement. |
| `unmapPolicy` | `(mappingId: string) => Promise<void>` | Removes a policy-to-requirement mapping. |
| `getPolicyMappings` | `(policyId: string) => Promise<ComplianceMapping[]>` | Gets all compliance mappings for a policy. |
| `calculateCoverage` | `(workspaceId: string, frameworkId: string) => Promise<ComplianceCoverage>` | Calculates coverage percentage: `(mapped / total) × 100`. |
| `getUnmappedRequirements` | `(workspaceId: string, frameworkId: string) => Promise<ComplianceRequirement[]>` | Returns requirements with no mapped policies. |
| `loadCustomFramework` | `(workspaceId: string, framework: ComplianceFramework) => Promise<void>` | Loads a custom compliance framework from JSON. |
| `exportMappings` | `(input: ExportMappingsInput) => Promise<string>` | Exports mappings as CSV or JSON. |
| `getBuiltInFrameworks` | `() => ComplianceFramework[]` | Returns all built-in frameworks (OWASP, NIST, SOC2, ISO 27001, GDPR). |
| `listFrameworks` | `(workspaceId: string) => Promise<ComplianceFramework[]>` | Lists all frameworks including custom ones. |

### ComplianceReportService

`src/services/ComplianceReportService.ts`

Generates compliance reports with policy details, test coverage, and audit summaries. Exported as singleton `complianceReportService`.

| Method | Signature | Description |
|--------|-----------|-------------|
| `generateReport` | `(input: GenerateReportInput) => Promise<ComplianceReport>` | Generates a full compliance report with executive summary, policy entries, and audit data. |
| `exportPDF` | `(report: ComplianceReport, branding?: BrandingConfig) => Promise<Blob>` | Exports report as PDF with optional organization branding. |
| `exportCSV` | `(report: ComplianceReport) => Promise<string>` | Exports report as CSV for data analysis. |
| `scheduleReport` | `(input: ScheduleReportInput) => Promise<void>` | Schedules automated report generation (weekly/monthly). |

### AuditTrailService

`src/services/AuditTrailService.ts`

Immutable, append-only audit log for all platform operations. Exported as singleton `auditTrailService`.

| Method | Signature | Description |
|--------|-----------|-------------|
| `logEvent` | `(workspaceId: string, actorId: string, action: AuditAction, resourceType: ResourceType, resourceId: string, metadata?: Record<string, any>) => Promise<void>` | Logs an audit event. Automatically redacts sensitive data. |
| `getEvents` | `(workspaceId: string, options: AuditQueryOptions) => Promise<PaginatedResult<AuditEvent>>` | Gets paginated audit events. |
| `filterEvents` | `(workspaceId: string, filters: AuditFilters, options: AuditQueryOptions) => Promise<PaginatedResult<AuditEvent>>` | Filters events by date range, actor, action type, or resource type. |
| `formatEventDescription` | `(event: AuditEvent) => string` | Returns a human-readable description of an audit event. |
| `exportCSV` | `(workspaceId: string, filters?: AuditFilters) => Promise<string>` | Exports audit log as CSV. |
| `exportJSON` | `(workspaceId: string, filters?: AuditFilters) => Promise<string>` | Exports audit log as JSON with full event details. |
| `exportPDF` | `(workspaceId: string, filters?: AuditFilters) => Promise<Blob>` | Exports audit log as formatted PDF. |
| `signExport` | `(data: string) => Promise<string>` | Generates SHA-256 signature for tamper detection. |
| `verifySignature` | `(data: string, signature: string) => Promise<boolean>` | Verifies export integrity against signature. |
| `redactSensitiveData` | `(metadata: Record<string, any>) => Record<string, any>` | Redacts API keys, tokens, and PII from metadata. |

---

## Enterprise Features

### RBACSimulatorService

`src/services/RBACSimulatorService.ts`

Simulates policy evaluation across different user roles. Exported as singleton `rbacSimulatorService`.

| Method | Signature | Description |
|--------|-----------|-------------|
| `defineRole` | `(workspaceId: string, role: RoleDefinition) => Promise<RoleDefinition>` | Creates a custom role definition. |
| `listRoles` | `(workspaceId: string) => Promise<RoleDefinition[]>` | Lists all role definitions for a workspace. |
| `simulateWithRole` | `(policyId: string, versionId: string, role: RoleDefinition, scenario: EvaluationScenario) => Promise<SimulationResult>` | Simulates policy evaluation with a specific role context. |
| `simulateAcrossRoles` | `(policyId: string, versionId: string, roles: RoleDefinition[], scenario: EvaluationScenario) => Promise<SimulationResult[]>` | Runs simulation across multiple roles in parallel. |
| `compareRoleResults` | `(results: SimulationResult[]) => RoleComparison` | Compares results across roles, highlighting decision/reason/timing differences. |
| `importRoles` | `(workspaceId: string, rolesJson: string) => Promise<RoleDefinition[]>` | Imports role definitions from JSON. |
| `exportRoles` | `(workspaceId: string) => Promise<string>` | Exports role definitions as JSON. |

### EnvironmentService

`src/services/EnvironmentService.ts`

Manages deployment environments (Development, Staging, Production) with policy promotion and rollback. Exported as singleton `environmentService`.

| Method | Signature | Description |
|--------|-----------|-------------|
| `createEnvironment` | `(input: CreateEnvironmentInput) => Promise<DeploymentEnvironment>` | Creates a new environment with configuration. |
| `updateConfig` | `(input: UpdateEnvironmentConfigInput) => Promise<DeploymentEnvironment>` | Updates environment-specific configuration. |
| `promotePolicy` | `(input: PromotePolicyInput) => Promise<DeployedPolicy>` | Promotes a policy version to an environment. Logged in audit trail. |
| `rollback` | `(environmentId: string, policyId: string) => Promise<DeployedPolicy>` | Rolls back to the previous deployed version. |
| `listDeployedPolicies` | `(environmentId: string) => Promise<DeployedPolicy[]>` | Lists all policies deployed to an environment. |
| `getEnvironmentScenarios` | `(environmentId: string) => Promise<EvaluationScenario[]>` | Gets environment-specific test scenarios. |
| `listEnvironments` | `(workspaceId: string) => Promise<DeploymentEnvironment[]>` | Lists all environments for a workspace. |
| `getEnvironment` | `(environmentId: string) => Promise<DeploymentEnvironment \| null>` | Gets an environment by ID. |

### CICDIntegrationService

`src/services/CICDIntegrationService.ts`

Generates GitHub Actions workflows and manages CI/CD pipeline integration. Exported as singleton `cicdIntegrationService`.

| Method | Signature | Description |
|--------|-----------|-------------|
| `generateWorkflow` | `(config: CICDConfig) => Promise<string>` | Generates a GitHub Actions YAML workflow for policy testing. |
| `validateSyntax` | `(code: string) => Promise<SyntaxValidationResult>` | Validates policy syntax and structure. |
| `runTestSuite` | `(policyId: string, versionId: string, scenarios: EvaluationScenario[]) => Promise<TestRunResult>` | Runs a test suite against a policy version. |
| `generateCoverageReport` | `(testRunResult: TestRunResult) => Promise<CoverageReport>` | Generates test coverage report from test results. |
| `postPRComment` | `(repoOwner: string, repoName: string, prNumber: number, results: TestRunResult) => Promise<void>` | Posts test results as a GitHub PR comment. |
| `autoDeploy` | `(policyId: string, versionId: string, environment: string) => Promise<void>` | Automated policy deployment on merge to main. |

---

## Infrastructure

### FreeTierMonitoringService

`src/services/FreeTierMonitoringService.ts`

Monitors Supabase, Vercel, and GitHub Actions free tier usage with alerts. Exported as singleton `freeTierMonitoringService`.

| Method | Signature | Description |
|--------|-----------|-------------|
| `getFreeTierLimits` | `() => FreeTierLimits` | Returns default free tier limits. |
| `getSupabaseStorageUsage` | `() => Promise<ResourceLimit>` | Estimates Supabase storage usage (500MB limit). |
| `getSupabaseMAU` | `() => Promise<ResourceLimit>` | Counts monthly active users (50K limit). |
| `getVercelBandwidthUsage` | `() => Promise<ResourceLimit>` | Estimates Vercel bandwidth usage (100GB limit). |
| `getGitHubActionsUsage` | `() => Promise<ResourceLimit>` | Tracks GitHub Actions minutes (2,000 min/month limit). |
| `getUsageMetrics` | `() => Promise<UsageMetrics>` | Collects all usage metrics in a single snapshot. |
| `generateAlerts` | `(metrics: UsageMetrics) => UsageAlert[]` | Generates alerts at 80% (warning) and 95% (critical) thresholds. |
| `getUsageSummary` | `() => Promise<UsageSummary>` | Full usage summary with metrics and alerts. |
| `formatUsage` | `(resource: ResourceLimit) => string` | Human-readable usage string (e.g., `"250 MB / 500 MB"`). |
| `getUsagePercent` | `(resource: ResourceLimit) => number` | Usage percentage (0–100). |

### DataExportService

`src/services/DataExportService.ts`

Exports all workspace data as structured JSON for migration or backup. Exported as singleton `dataExportService`.

| Method | Signature | Description |
|--------|-----------|-------------|
| `exportWorkspaceData` | `(workspaceId: string, exportedBy: string) => Promise<WorkspaceExportData>` | Exports all workspace data: policies, versions, comments, audit log, compliance mappings. |
| `downloadExport` | `(exportData: WorkspaceExportData) => void` | Triggers browser download of the export as JSON. |

### DataImportService

`src/services/DataImportService.ts`

Imports workspace data from a previously exported JSON file. Exported as singleton `dataImportService`.

| Method | Signature | Description |
|--------|-----------|-------------|
| `validateSchema` | `(data: unknown) => { valid: boolean; errors: string[] }` | Validates import data against the expected schema. |
| `checkConflicts` | `(workspaceId: string, data: WorkspaceExportData) => Promise<ConflictReport>` | Checks for ID or name conflicts before importing. |
| `importWorkspaceData` | `(workspaceId: string, data: WorkspaceExportData, options?: ImportOptions) => Promise<ImportReport>` | Imports data into a workspace. Supports dry-run mode and conflict resolution strategies. |

### CacheService

`src/services/CacheService.ts`

Two-tier client-side cache: in-memory (Map) + persistent (localStorage) with TTL and hit rate tracking.

| Method | Signature | Description |
|--------|-----------|-------------|
| `get<T>` | `(key: string) => T \| undefined` | Gets a cached value. Checks memory first, then localStorage. |
| `set<T>` | `(key: string, value: T, options?: CacheOptions) => void` | Sets a value with optional TTL (default: 5 min) and persistence. |
| `invalidate` | `(key: string) => void` | Removes a key from both cache layers. |
| `invalidateByPrefix` | `(prefix: string) => void` | Removes all keys matching a prefix. |
| `clear` | `() => void` | Clears all cached data. |
| `getStats` | `() => CacheStats` | Returns hit/miss counts, hit rate, and cache sizes. |
| `has` | `(key: string) => boolean` | Checks if a key exists and is not expired. |

### DatabaseQueryOptimizer

`src/services/DatabaseQueryOptimizer.ts`

Provides optimized Supabase query builders and index recommendations.

| Method | Signature | Description |
|--------|-----------|-------------|
| `getRecommendedIndexes` | `() => IndexRecommendation[]` | Returns recommended database indexes for performance. |
| `buildPolicyListQuery` | `(options: PolicyListOptions) => SupabaseQuery` | Builds an optimized query for listing policies with filters. |
| `buildAuditLogQuery` | `(options: AuditLogOptions) => SupabaseQuery` | Builds an optimized query for audit log with pagination. |
| `buildAnalyticsQuery` | `(options: AnalyticsAggregationOptions) => SupabaseQuery` | Builds an optimized query for analytics aggregation. |
| `measureQuery<T>` | `(queryFn: () => Promise<T>) => Promise<QueryPerformanceResult<T>>` | Wraps a query to measure execution time. |

---

## Data Models

### Core Types

All types are defined in `src/types/` and imported throughout the codebase.

#### Authentication (`types/auth.ts`)

```typescript
interface AuthUser {
  id: string;
  githubId: string;
  username: string;
  email: string;
  avatarUrl: string;
  organizations: GitHubOrganization[];
}

interface Session {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;       // Unix timestamp (ms)
  user: AuthUser;
}

interface AuthError {
  message: string;
  code?: string;
}
```

#### Workspace (`types/workspace.ts`)

```typescript
enum WorkspaceRole {
  Owner = 'owner',
  Editor = 'editor',
  Viewer = 'viewer',
}

type WorkspaceAction =
  | 'manage_members' | 'manage_settings'
  | 'create_policy'  | 'edit_policy' | 'delete_policy'
  | 'approve_policy' | 'view_policy' | 'run_evaluation';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  settings: WorkspaceSettings;
  createdAt: Date;
  updatedAt: Date;
}

interface WorkspaceSettings {
  requiredApprovers: number;       // 1–5
  approverUserIds: string[];
  allowEmergencyBypass: boolean;
  autoApprovalRules: AutoApprovalRule[];
  rateLimitPool: RateLimitConfig;
  budgetAlerts: BudgetAlert[];
}
```

#### Policy (`types/policy.ts`)

```typescript
enum PolicyState {
  Draft = 'draft',
  Review = 'review',
  Approved = 'approved',
  Production = 'production',
}

interface Policy {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  currentVersion: string;    // Semantic version: "1.0.0"
  state: PolicyState;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface PolicyVersion {
  id: string;
  policyId: string;
  version: string;
  code: string;
  metadata: PolicyMetadata;
  createdBy: string;
  createdAt: Date;
}

interface PolicyMetadata {
  tags: string[];
  category: string;
  providers: string[];       // e.g., ['openai', 'anthropic']
  models: string[];
  estimatedCost: number;
  testCoverage: number;
}

interface PolicyDiff {
  oldVersion: PolicyVersion;
  newVersion: PolicyVersion;
  changes: DiffChange[];
  metadataChanges: MetadataChange[];
  summary: DiffSummary;
}
```

#### Governance (`types/governance.ts`)

```typescript
interface PolicyApproval {
  id: string;
  policyId: string;
  versionId: string;
  approverId: string;
  status: 'pending' | 'approved' | 'rejected';
  comment: string;
  createdAt: Date;
  decidedAt?: Date;
}

interface GovernanceWorkflow {
  policyId: string;
  currentState: PolicyState;
  requiredApprovals: number;
  approvals: PolicyApproval[];
  canPromote: boolean;
}

// Valid state transitions:
// Draft → Review (no approval needed)
// Review → Approved (requires approval)
// Approved → Production (no approval needed)
// Review/Approved/Production → Draft (rollback)
```

#### Comments (`types/comment.ts`)

```typescript
interface Comment {
  id: string;
  policyId: string;
  versionId: string;
  lineNumber: number;
  content: string;           // Markdown supported
  authorId: string;
  resolved: boolean;
  mentions: string[];        // User IDs from @mentions
  createdAt: Date;
  updatedAt: Date;
}

interface CommentReply {
  id: string;
  commentId: string;
  content: string;
  authorId: string;
  createdAt: Date;
}
```

#### Compliance (`types/compliance.ts`)

```typescript
interface ComplianceFramework {
  id: string;
  name: string;
  version: string;
  requirements: ComplianceRequirement[];
}

interface ComplianceMapping {
  id: string;
  policyId: string;
  frameworkId: string;
  requirementId: string;
  notes: string;
  createdAt: Date;
}

interface ComplianceCoverage {
  frameworkId: string;
  totalRequirements: number;
  mappedRequirements: number;
  coveragePercentage: number;    // (mapped / total) × 100
  unmappedRequirements: ComplianceRequirement[];
}
```

#### Audit (`types/audit.ts`)

```typescript
type AuditAction =
  | 'policy_created' | 'policy_updated' | 'policy_deleted'
  | 'policy_approved' | 'policy_rejected' | 'policy_deployed'
  | 'policy_evaluated'
  | 'member_added' | 'member_removed' | 'member_role_changed'
  | 'workspace_settings_changed'
  | 'auth_login' | 'auth_logout'
  | 'emergency_bypass';

type ResourceType =
  | 'policy' | 'policy_version' | 'workspace'
  | 'workspace_member' | 'comment' | 'compliance_mapping';

interface AuditEvent {
  id: string;
  workspaceId: string;
  actorId: string;
  action: AuditAction;
  resourceType: ResourceType;
  resourceId: string;
  metadata: Record<string, any>;
  createdAt: Date;
}
```

#### RBAC (`types/rbac.ts`)

```typescript
interface RoleDefinition {
  id: string;
  name: string;
  permissions: string[];
  attributes: Record<string, any>;
  metadata: Record<string, any>;
}

interface SimulationResult {
  role: RoleDefinition;
  decision: PolicyDecision;
  executionTime: number;
  metadata: Record<string, any>;
}

interface RoleComparison {
  differences: RoleDifference[];
  summary: string;
}
```

#### Monitoring (`types/monitoring.ts`)

```typescript
interface FreeTierLimits {
  storage: ResourceLimit;              // 500 MB (Supabase)
  mau: ResourceLimit;                  // 50,000 users (Supabase)
  bandwidth: ResourceLimit;            // 100 GB (Vercel)
  githubActionsMinutes: ResourceLimit; // 2,000 min/month
}

interface ResourceLimit {
  used: number;
  limit: number;
  unit: string;
}

interface UsageAlert {
  resource: string;
  usagePercent: number;
  message: string;
  severity: 'warning' | 'critical';
}
```

---

## Error Handling

All services follow a consistent error pattern. Each domain has a typed error interface:

```typescript
// Common error shape across all services
interface ServiceError {
  message: string;
  code?: string;
}
```

Domain-specific error types: `AuthError`, `WorkspaceError`, `AuditError`, `EnvironmentError`, `CICDError`.

### Error handling patterns

```typescript
try {
  await governanceService.promotePolicy({
    policyId: 'policy-123',
    targetState: PolicyState.Approved,
    userId: 'user-456',
  });
} catch (error) {
  // error.message: "Cannot promote: required approvals not met"
  // error.code: "APPROVAL_REQUIRED"
  console.error(error.message);
}
```

### Common error codes

| Code | Service | Description |
|------|---------|-------------|
| `SUPABASE_NOT_CONFIGURED` | All | Supabase environment variables not set. |
| `APPROVAL_REQUIRED` | GovernanceService | Policy promotion blocked — approvals needed. |
| `INVALID_TRANSITION` | GovernanceService | Invalid state transition (e.g., Draft → Production). |
| `EDIT_BLOCKED` | GovernanceService | Cannot edit Approved/Production policies. |
| `PERMISSION_DENIED` | WorkspaceService | User lacks required workspace role. |
| `NOT_FOUND` | Various | Requested resource does not exist. |
| `DUPLICATE_NAME` | PolicyRegistryService | Policy name already exists in workspace. |
| `INVALID_VERSION` | PolicyRegistryService | Invalid semantic version format. |
| `SCHEMA_VALIDATION` | DataImportService | Import data fails schema validation. |

### Sensitive data redaction

The `AuditTrailService.redactSensitiveData()` method automatically redacts:
- API keys (patterns matching `sk-*`, `key-*`, bearer tokens)
- Email addresses
- Tokens and secrets in metadata

All audit exports run through redaction before output.

---

## TypeDoc Generation

The project supports generating HTML API documentation from source code using [TypeDoc](https://typedoc.org/).

### Setup

TypeDoc is configured as a dev dependency. Generate docs with:

```bash
cd playground
npm run docs:api
```

This outputs HTML documentation to `playground/docs/typedoc/`.

### Configuration

TypeDoc is configured in `playground/typedoc.json`:

```json
{
  "$schema": "https://typedoc.org/schema.json",
  "entryPoints": ["src/services", "src/types"],
  "entryPointStrategy": "expand",
  "out": "docs/typedoc",
  "name": "TealTiger Playground API",
  "readme": "none",
  "excludePrivate": true,
  "excludeInternal": true,
  "includeVersion": true
}
```

### Adding JSDoc comments

All public methods should include JSDoc comments for TypeDoc generation:

```typescript
/**
 * Creates a new workspace with the given name.
 *
 * @param name - Workspace display name (must be unique)
 * @param ownerId - User ID of the workspace owner
 * @returns The created workspace
 * @throws {WorkspaceError} If name is taken or Supabase is not configured
 *
 * @example
 * ```typescript
 * const ws = await workspaceService.createWorkspace('My Team', userId);
 * ```
 */
async createWorkspace(name: string, ownerId: string): Promise<Workspace>
```
