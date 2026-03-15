// Policy types for registry and versioning
// Requirements: 3.1-3.10

export enum PolicyState {
  Draft = 'draft',           // Work in progress
  Review = 'review',         // Awaiting approval
  Approved = 'approved',     // Approved, not deployed
  Production = 'production'  // Deployed to production
}

export interface PolicyMetadata {
  tags: string[];
  category: string;
  providers: string[]; // ['openai', 'anthropic']
  models: string[];
  estimatedCost: number;
  testCoverage: number;
}

export interface Policy {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  currentVersion: string; // Semantic version: 1.0.0
  state: PolicyState;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PolicyVersion {
  id: string;
  policyId: string;
  version: string;
  code: string;
  metadata: PolicyMetadata;
  createdBy: string;
  createdAt: Date;
}

export interface PolicyFilters {
  tags?: string[];
  category?: string;
  author?: string;
  state?: PolicyState;
  dateRange?: { start: Date; end: Date };
}

export interface CreatePolicyInput {
  workspaceId: string;
  name: string;
  description?: string;
  code: string;
  metadata: PolicyMetadata;
  userId: string;
}

export interface SaveVersionInput {
  policyId: string;
  code: string;
  versionType: 'major' | 'minor' | 'patch';
  userId: string;
  metadata?: PolicyMetadata;
}

export interface SearchPoliciesInput {
  workspaceId: string;
  query: string;
  filters?: PolicyFilters;
}

export interface BranchPolicyInput {
  policyId: string;
  branchName: string;
  userId: string;
}

// Policy Diff types
// Requirements: 3.8, 4.1-4.10

export interface DiffChange {
  type: 'added' | 'removed' | 'modified';
  lineNumber: number;
  oldContent?: string;
  newContent?: string;
}

export interface MetadataChange {
  field: string;
  oldValue: any;
  newValue: any;
}

export interface DiffSummary {
  linesAdded: number;
  linesRemoved: number;
  linesModified: number;
  metadataChanged: boolean;
}

export interface PolicyDiff {
  oldVersion: PolicyVersion;
  newVersion: PolicyVersion;
  changes: DiffChange[];
  metadataChanges: MetadataChange[];
  summary: DiffSummary;
}
