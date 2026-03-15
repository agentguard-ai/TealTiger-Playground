// Workspace types for team collaboration
// Requirements: 5.1-5.10

export enum WorkspaceRole {
  Owner = 'owner',     // Full control: manage members, settings, policies
  Editor = 'editor',   // Create, edit, delete policies
  Viewer = 'viewer'    // Read-only: view policies, run evaluations
}

export type WorkspaceAction = 
  | 'manage_members'
  | 'manage_settings'
  | 'create_policy'
  | 'edit_policy'
  | 'delete_policy'
  | 'approve_policy'
  | 'view_policy'
  | 'run_evaluation';

export interface AutoApprovalRule {
  name: string;
  condition: 'lines_changed_lt' | 'metadata_only' | 'comment_only';
  threshold: number;
  enabled: boolean;
}

export interface RateLimitConfig {
  requestsPerHour?: number;
  requestsPerDay?: number;
  enabled: boolean;
}

export interface BudgetAlert {
  threshold: number;
  currency: string;
  period: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
}

export interface WorkspaceSettings {
  requiredApprovers: number; // 1-5
  approverUserIds: string[];
  allowEmergencyBypass: boolean;
  autoApprovalRules: AutoApprovalRule[];
  rateLimitPool: RateLimitConfig;
  budgetAlerts: BudgetAlert[];
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  settings: WorkspaceSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: Date;
}

export interface WorkspaceWithMembers extends Workspace {
  members: WorkspaceMember[];
  memberCount: number;
}

export interface WorkspaceInvitation {
  workspaceId: string;
  emailOrGithubUsername: string;
  role: WorkspaceRole;
  invitedBy: string;
}

export interface WorkspaceError {
  message: string;
  code?: string;
}
