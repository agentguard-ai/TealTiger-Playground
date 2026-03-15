// Governance types for approval workflow
// Requirements: 7.1-7.10

import type { Policy } from './policy';
import { PolicyState } from './policy';

export interface PolicyApproval {
  id: string;
  policyId: string;
  versionId: string;
  approverId: string;
  status: 'pending' | 'approved' | 'rejected';
  comment: string;
  createdAt: Date;
  decidedAt?: Date;
}

export interface GovernanceWorkflow {
  policyId: string;
  currentState: PolicyState;
  requiredApprovals: number;
  approvals: PolicyApproval[];
  canPromote: boolean;
}

export interface AutoApprovalRule {
  name: string;
  condition: 'lines_changed_lt' | 'metadata_only' | 'comment_only';
  threshold: number;
  enabled: boolean;
}

export interface WorkspaceSettings {
  requiredApprovers: number; // 1-5
  approverUserIds: string[];
  allowEmergencyBypass: boolean;
  autoApprovalRules: AutoApprovalRule[];
}

export interface PromotePolicyInput {
  policyId: string;
  targetState: PolicyState;
  userId: string;
}

export interface RequestApprovalInput {
  policyId: string;
  versionId: string;
  approverIds: string[];
  userId: string;
}

export interface ApprovePolicyInput {
  policyId: string;
  versionId: string;
  approverId: string;
  comment: string;
}

export interface RejectPolicyInput {
  policyId: string;
  versionId: string;
  approverId: string;
  reason: string;
}

export interface EmergencyBypassInput {
  policyId: string;
  userId: string;
  reason: string;
  targetState: PolicyState;
}

export interface StateTransition {
  from: PolicyState;
  to: PolicyState;
  requiresApproval: boolean;
}

// Valid state transitions
export const STATE_TRANSITIONS: StateTransition[] = [
  { from: PolicyState.Draft, to: PolicyState.Review, requiresApproval: false },
  { from: PolicyState.Review, to: PolicyState.Approved, requiresApproval: true },
  { from: PolicyState.Approved, to: PolicyState.Production, requiresApproval: false },
  { from: PolicyState.Review, to: PolicyState.Draft, requiresApproval: false }, // Reject back to draft
  { from: PolicyState.Approved, to: PolicyState.Draft, requiresApproval: false }, // Rollback
  { from: PolicyState.Production, to: PolicyState.Draft, requiresApproval: false }, // Rollback
];

export function isValidTransition(from: PolicyState, to: PolicyState): boolean {
  return STATE_TRANSITIONS.some(t => t.from === from && t.to === to);
}

export function requiresApproval(from: PolicyState, to: PolicyState): boolean {
  const transition = STATE_TRANSITIONS.find(t => t.from === from && t.to === to);
  return transition?.requiresApproval || false;
}
