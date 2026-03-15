/**
 * Property Test: Team Data Isolation
 * Property 1: Team Data Isolation
 * Validates: Requirements 1.5, 5.10, 30.1
 * 
 * This test verifies that workspace A users never see workspace B data,
 * ensuring complete data isolation between teams through RLS enforcement.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// Mock types matching database schema
interface User {
  id: string;
  github_id: string;
  username: string;
  email: string;
  avatar_url: string;
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
}

interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
}

interface Policy {
  id: string;
  workspace_id: string;
  name: string;
  description: string;
  current_version: string;
  state: 'draft' | 'review' | 'approved' | 'production';
  created_by: string;
}

interface Comment {
  id: string;
  policy_id: string;
  line_number: number;
  content: string;
  author_id: string;
  resolved: boolean;
}

interface AuditEvent {
  id: string;
  workspace_id: string;
  actor_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
}

/**
 * Mock Supabase client with RLS enforcement
 * Simulates PostgreSQL Row Level Security policies
 */
class MockSupabaseClientWithRLS {
  private users: Map<string, User> = new Map();
  private workspaces: Map<string, Workspace> = new Map();
  private workspaceMembers: Map<string, WorkspaceMember> = new Map();
  private policies: Map<string, Policy> = new Map();
  private comments: Map<string, Comment> = new Map();
  private auditEvents: Map<string, AuditEvent> = new Map();
  
  // Current authenticated user (simulates auth.uid())
  private currentUserId: string | null = null;

  setCurrentUser(userId: string | null) {
    this.currentUserId = userId;
  }

  getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  // User operations
  async insertUser(user: User): Promise<User> {
    this.users.set(user.id, user);
    return user;
  }

  async getUser(userId: string): Promise<User | null> {
    // RLS: Users can only read their own profile
    if (this.currentUserId !== userId) {
      return null;
    }
    return this.users.get(userId) || null;
  }

  // Workspace operations
  async insertWorkspace(workspace: Workspace): Promise<Workspace> {
    this.workspaces.set(workspace.id, workspace);
    return workspace;
  }

  async getWorkspaces(): Promise<Workspace[]> {
    if (!this.currentUserId) return [];
    
    // RLS: Users can only see workspaces they are members of
    const userWorkspaceIds = Array.from(this.workspaceMembers.values())
      .filter(m => m.user_id === this.currentUserId)
      .map(m => m.workspace_id);
    
    return Array.from(this.workspaces.values())
      .filter(w => userWorkspaceIds.includes(w.id));
  }

  async getWorkspace(workspaceId: string): Promise<Workspace | null> {
    if (!this.currentUserId) return null;
    
    // RLS: Check if user is a member of this workspace
    const isMember = Array.from(this.workspaceMembers.values())
      .some(m => m.workspace_id === workspaceId && m.user_id === this.currentUserId);
    
    if (!isMember) return null;
    
    return this.workspaces.get(workspaceId) || null;
  }

  // Workspace member operations
  async insertWorkspaceMember(member: WorkspaceMember): Promise<WorkspaceMember> {
    // RLS: Only owners can insert members
    if (!this.currentUserId) throw new Error('Not authenticated');
    
    const workspace = this.workspaces.get(member.workspace_id);
    if (!workspace || workspace.owner_id !== this.currentUserId) {
      throw new Error('Permission denied: Only workspace owners can add members');
    }
    
    this.workspaceMembers.set(member.id, member);
    return member;
  }

  async getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    if (!this.currentUserId) return [];
    
    // RLS: Users can only see members of workspaces they belong to
    const isMember = Array.from(this.workspaceMembers.values())
      .some(m => m.workspace_id === workspaceId && m.user_id === this.currentUserId);
    
    if (!isMember) return [];
    
    return Array.from(this.workspaceMembers.values())
      .filter(m => m.workspace_id === workspaceId);
  }

  // Policy operations
  async insertPolicy(policy: Policy): Promise<Policy> {
    if (!this.currentUserId) throw new Error('Not authenticated');
    
    // RLS: Only editors and owners can insert policies
    const member = Array.from(this.workspaceMembers.values())
      .find(m => m.workspace_id === policy.workspace_id && m.user_id === this.currentUserId);
    
    if (!member || member.role === 'viewer') {
      throw new Error('Permission denied: Viewers cannot create policies');
    }
    
    this.policies.set(policy.id, policy);
    return policy;
  }

  async getPolicies(workspaceId?: string): Promise<Policy[]> {
    if (!this.currentUserId) return [];
    
    // RLS: Users can only see policies in their workspaces
    const userWorkspaceIds = Array.from(this.workspaceMembers.values())
      .filter(m => m.user_id === this.currentUserId)
      .map(m => m.workspace_id);
    
    return Array.from(this.policies.values())
      .filter(p => userWorkspaceIds.includes(p.workspace_id))
      .filter(p => !workspaceId || p.workspace_id === workspaceId);
  }

  async getPolicy(policyId: string): Promise<Policy | null> {
    if (!this.currentUserId) return null;
    
    const policy = this.policies.get(policyId);
    if (!policy) return null;
    
    // RLS: Check if user is a member of the policy's workspace
    const isMember = Array.from(this.workspaceMembers.values())
      .some(m => m.workspace_id === policy.workspace_id && m.user_id === this.currentUserId);
    
    return isMember ? policy : null;
  }

  // Comment operations
  async insertComment(comment: Comment): Promise<Comment> {
    if (!this.currentUserId) throw new Error('Not authenticated');
    
    const policy = this.policies.get(comment.policy_id);
    if (!policy) throw new Error('Policy not found');
    
    // RLS: All workspace members can insert comments
    const isMember = Array.from(this.workspaceMembers.values())
      .some(m => m.workspace_id === policy.workspace_id && m.user_id === this.currentUserId);
    
    if (!isMember) {
      throw new Error('Permission denied: Not a workspace member');
    }
    
    this.comments.set(comment.id, comment);
    return comment;
  }

  async getComments(policyId: string): Promise<Comment[]> {
    if (!this.currentUserId) return [];
    
    const policy = this.policies.get(policyId);
    if (!policy) return [];
    
    // RLS: Users can only see comments in their workspace policies
    const isMember = Array.from(this.workspaceMembers.values())
      .some(m => m.workspace_id === policy.workspace_id && m.user_id === this.currentUserId);
    
    if (!isMember) return [];
    
    return Array.from(this.comments.values())
      .filter(c => c.policy_id === policyId);
  }

  // Audit log operations
  async insertAuditEvent(event: AuditEvent): Promise<AuditEvent> {
    this.auditEvents.set(event.id, event);
    return event;
  }

  async getAuditEvents(workspaceId?: string): Promise<AuditEvent[]> {
    if (!this.currentUserId) return [];
    
    // RLS: Users can only see audit logs for their workspaces
    const userWorkspaceIds = Array.from(this.workspaceMembers.values())
      .filter(m => m.user_id === this.currentUserId)
      .map(m => m.workspace_id);
    
    return Array.from(this.auditEvents.values())
      .filter(e => userWorkspaceIds.includes(e.workspace_id))
      .filter(e => !workspaceId || e.workspace_id === workspaceId);
  }

  reset() {
    this.users.clear();
    this.workspaces.clear();
    this.workspaceMembers.clear();
    this.policies.clear();
    this.comments.clear();
    this.auditEvents.clear();
    this.currentUserId = null;
  }
}

// Fast-check arbitraries for generating test data
const userArbitrary = fc.record({
  id: fc.uuid(),
  github_id: fc.string({ minLength: 5, maxLength: 20 }),
  username: fc.string({ minLength: 3, maxLength: 20 }),
  email: fc.emailAddress(),
  avatar_url: fc.webUrl()
});

const workspaceArbitrary = (ownerId: string) => fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 3, maxLength: 50 }),
  slug: fc.string({ minLength: 3, maxLength: 50 }).map(s => s.toLowerCase().replace(/[^a-z0-9-]/g, '-')),
  owner_id: fc.constant(ownerId)
});

const policyArbitrary = (workspaceId: string, createdBy: string) => fc.record({
  id: fc.uuid(),
  workspace_id: fc.constant(workspaceId),
  name: fc.string({ minLength: 5, maxLength: 100 }),
  description: fc.string({ minLength: 10, maxLength: 500 }),
  current_version: fc.record({
    major: fc.integer({ min: 0, max: 10 }),
    minor: fc.integer({ min: 0, max: 20 }),
    patch: fc.integer({ min: 0, max: 50 })
  }).map(v => `${v.major}.${v.minor}.${v.patch}`),
  state: fc.constantFrom('draft', 'review', 'approved', 'production'),
  created_by: fc.constant(createdBy)
});

const commentArbitrary = (policyId: string, authorId: string) => fc.record({
  id: fc.uuid(),
  policy_id: fc.constant(policyId),
  line_number: fc.integer({ min: 1, max: 1000 }),
  content: fc.string({ minLength: 10, maxLength: 500 }),
  author_id: fc.constant(authorId),
  resolved: fc.boolean()
});

const auditEventArbitrary = (workspaceId: string, actorId: string) => fc.record({
  id: fc.uuid(),
  workspace_id: fc.constant(workspaceId),
  actor_id: fc.constant(actorId),
  action: fc.constantFrom('policy_created', 'policy_updated', 'member_added', 'workspace_settings_changed'),
  resource_type: fc.constantFrom('policy', 'workspace', 'workspace_member'),
  resource_id: fc.uuid()
});

describe('Property 1: Team Data Isolation', () => {
  let client: MockSupabaseClientWithRLS;

  beforeEach(() => {
    client = new MockSupabaseClientWithRLS();
  });

  it('should prevent workspace A users from seeing workspace B workspaces', async () => {
    await fc.assert(
      fc.asyncProperty(
        userArbitrary,
        userArbitrary,
        async (userA, userB) => {
          // Ensure users are different
          fc.pre(userA.id !== userB.id);

          // Create users
          await client.insertUser(userA);
          await client.insertUser(userB);

          // Create workspace A (owned by userA)
          client.setCurrentUser(userA.id);
          const workspaceAData = await fc.sample(workspaceArbitrary(userA.id), 1)[0];
          const workspaceA = await client.insertWorkspace(workspaceAData);
          
          // Add userA as member of workspace A
          await client.insertWorkspaceMember({
            id: fc.sample(fc.uuid(), 1)[0],
            workspace_id: workspaceA.id,
            user_id: userA.id,
            role: 'owner'
          });

          // Create workspace B (owned by userB)
          client.setCurrentUser(userB.id);
          const workspaceBData = await fc.sample(workspaceArbitrary(userB.id), 1)[0];
          const workspaceB = await client.insertWorkspace(workspaceBData);
          
          // Add userB as member of workspace B
          await client.insertWorkspaceMember({
            id: fc.sample(fc.uuid(), 1)[0],
            workspace_id: workspaceB.id,
            user_id: userB.id,
            role: 'owner'
          });

          // UserA should only see workspace A
          client.setCurrentUser(userA.id);
          const userAWorkspaces = await client.getWorkspaces();
          expect(userAWorkspaces).toHaveLength(1);
          expect(userAWorkspaces[0].id).toBe(workspaceA.id);
          expect(userAWorkspaces.find(w => w.id === workspaceB.id)).toBeUndefined();

          // UserB should only see workspace B
          client.setCurrentUser(userB.id);
          const userBWorkspaces = await client.getWorkspaces();
          expect(userBWorkspaces).toHaveLength(1);
          expect(userBWorkspaces[0].id).toBe(workspaceB.id);
          expect(userBWorkspaces.find(w => w.id === workspaceA.id)).toBeUndefined();

          // UserA should not be able to access workspace B directly
          client.setCurrentUser(userA.id);
          const workspaceBAsUserA = await client.getWorkspace(workspaceB.id);
          expect(workspaceBAsUserA).toBeNull();
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should prevent workspace A users from seeing workspace B policies', async () => {
    await fc.assert(
      fc.asyncProperty(
        userArbitrary,
        userArbitrary,
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1, max: 5 }),
        async (userA, userB, numPoliciesA, numPoliciesB) => {
          fc.pre(userA.id !== userB.id);

          // Setup users and workspaces
          await client.insertUser(userA);
          await client.insertUser(userB);

          client.setCurrentUser(userA.id);
          const workspaceA = await client.insertWorkspace(
            await fc.sample(workspaceArbitrary(userA.id), 1)[0]
          );
          await client.insertWorkspaceMember({
            id: fc.sample(fc.uuid(), 1)[0],
            workspace_id: workspaceA.id,
            user_id: userA.id,
            role: 'owner'
          });

          client.setCurrentUser(userB.id);
          const workspaceB = await client.insertWorkspace(
            await fc.sample(workspaceArbitrary(userB.id), 1)[0]
          );
          await client.insertWorkspaceMember({
            id: fc.sample(fc.uuid(), 1)[0],
            workspace_id: workspaceB.id,
            user_id: userB.id,
            role: 'owner'
          });

          // Create policies in workspace A
          client.setCurrentUser(userA.id);
          const policiesA: Policy[] = [];
          for (let i = 0; i < numPoliciesA; i++) {
            const policyData = await fc.sample(policyArbitrary(workspaceA.id, userA.id), 1)[0];
            const policy = await client.insertPolicy(policyData);
            policiesA.push(policy);
          }

          // Create policies in workspace B
          client.setCurrentUser(userB.id);
          const policiesB: Policy[] = [];
          for (let i = 0; i < numPoliciesB; i++) {
            const policyData = await fc.sample(policyArbitrary(workspaceB.id, userB.id), 1)[0];
            const policy = await client.insertPolicy(policyData);
            policiesB.push(policy);
          }

          // UserA should only see policies from workspace A
          client.setCurrentUser(userA.id);
          const userAPolicies = await client.getPolicies();
          expect(userAPolicies).toHaveLength(numPoliciesA);
          userAPolicies.forEach(p => {
            expect(p.workspace_id).toBe(workspaceA.id);
          });

          // UserB should only see policies from workspace B
          client.setCurrentUser(userB.id);
          const userBPolicies = await client.getPolicies();
          expect(userBPolicies).toHaveLength(numPoliciesB);
          userBPolicies.forEach(p => {
            expect(p.workspace_id).toBe(workspaceB.id);
          });

          // UserA should not be able to access workspace B policies directly
          client.setCurrentUser(userA.id);
          for (const policyB of policiesB) {
            const result = await client.getPolicy(policyB.id);
            expect(result).toBeNull();
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should prevent workspace A users from seeing workspace B comments', async () => {
    await fc.assert(
      fc.asyncProperty(
        userArbitrary,
        userArbitrary,
        async (userA, userB) => {
          fc.pre(userA.id !== userB.id);

          // Setup users and workspaces
          await client.insertUser(userA);
          await client.insertUser(userB);

          client.setCurrentUser(userA.id);
          const workspaceA = await client.insertWorkspace(
            await fc.sample(workspaceArbitrary(userA.id), 1)[0]
          );
          await client.insertWorkspaceMember({
            id: fc.sample(fc.uuid(), 1)[0],
            workspace_id: workspaceA.id,
            user_id: userA.id,
            role: 'owner'
          });

          client.setCurrentUser(userB.id);
          const workspaceB = await client.insertWorkspace(
            await fc.sample(workspaceArbitrary(userB.id), 1)[0]
          );
          await client.insertWorkspaceMember({
            id: fc.sample(fc.uuid(), 1)[0],
            workspace_id: workspaceB.id,
            user_id: userB.id,
            role: 'owner'
          });

          // Create policy in workspace B
          const policyB = await client.insertPolicy(
            await fc.sample(policyArbitrary(workspaceB.id, userB.id), 1)[0]
          );

          // Create comment in workspace B policy
          const commentB = await client.insertComment(
            await fc.sample(commentArbitrary(policyB.id, userB.id), 1)[0]
          );

          // UserA should not be able to see comments from workspace B
          client.setCurrentUser(userA.id);
          const userAComments = await client.getComments(policyB.id);
          expect(userAComments).toHaveLength(0);

          // UserB should see their own comments
          client.setCurrentUser(userB.id);
          const userBComments = await client.getComments(policyB.id);
          expect(userBComments).toHaveLength(1);
          expect(userBComments[0].id).toBe(commentB.id);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should prevent workspace A users from seeing workspace B audit logs', async () => {
    await fc.assert(
      fc.asyncProperty(
        userArbitrary,
        userArbitrary,
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 1, max: 10 }),
        async (userA, userB, numEventsA, numEventsB) => {
          fc.pre(userA.id !== userB.id);

          // Setup users and workspaces
          await client.insertUser(userA);
          await client.insertUser(userB);

          client.setCurrentUser(userA.id);
          const workspaceA = await client.insertWorkspace(
            await fc.sample(workspaceArbitrary(userA.id), 1)[0]
          );
          await client.insertWorkspaceMember({
            id: fc.sample(fc.uuid(), 1)[0],
            workspace_id: workspaceA.id,
            user_id: userA.id,
            role: 'owner'
          });

          client.setCurrentUser(userB.id);
          const workspaceB = await client.insertWorkspace(
            await fc.sample(workspaceArbitrary(userB.id), 1)[0]
          );
          await client.insertWorkspaceMember({
            id: fc.sample(fc.uuid(), 1)[0],
            workspace_id: workspaceB.id,
            user_id: userB.id,
            role: 'owner'
          });

          // Create audit events in workspace A
          for (let i = 0; i < numEventsA; i++) {
            const eventData = await fc.sample(auditEventArbitrary(workspaceA.id, userA.id), 1)[0];
            await client.insertAuditEvent(eventData);
          }

          // Create audit events in workspace B
          for (let i = 0; i < numEventsB; i++) {
            const eventData = await fc.sample(auditEventArbitrary(workspaceB.id, userB.id), 1)[0];
            await client.insertAuditEvent(eventData);
          }

          // UserA should only see audit events from workspace A
          client.setCurrentUser(userA.id);
          const userAEvents = await client.getAuditEvents();
          expect(userAEvents).toHaveLength(numEventsA);
          userAEvents.forEach(e => {
            expect(e.workspace_id).toBe(workspaceA.id);
          });

          // UserB should only see audit events from workspace B
          client.setCurrentUser(userB.id);
          const userBEvents = await client.getAuditEvents();
          expect(userBEvents).toHaveLength(numEventsB);
          userBEvents.forEach(e => {
            expect(e.workspace_id).toBe(workspaceB.id);
          });
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should prevent workspace A users from seeing workspace B members', async () => {
    await fc.assert(
      fc.asyncProperty(
        userArbitrary,
        userArbitrary,
        fc.array(userArbitrary, { minLength: 1, maxLength: 5 }),
        fc.array(userArbitrary, { minLength: 1, maxLength: 5 }),
        async (userA, userB, membersA, membersB) => {
          fc.pre(userA.id !== userB.id);
          fc.pre(!membersA.some(m => m.id === userA.id || m.id === userB.id));
          fc.pre(!membersB.some(m => m.id === userA.id || m.id === userB.id));

          // Setup users
          await client.insertUser(userA);
          await client.insertUser(userB);
          for (const member of [...membersA, ...membersB]) {
            await client.insertUser(member);
          }

          // Create workspace A
          client.setCurrentUser(userA.id);
          const workspaceA = await client.insertWorkspace(
            await fc.sample(workspaceArbitrary(userA.id), 1)[0]
          );
          await client.insertWorkspaceMember({
            id: fc.sample(fc.uuid(), 1)[0],
            workspace_id: workspaceA.id,
            user_id: userA.id,
            role: 'owner'
          });

          // Add members to workspace A
          for (const member of membersA) {
            await client.insertWorkspaceMember({
              id: fc.sample(fc.uuid(), 1)[0],
              workspace_id: workspaceA.id,
              user_id: member.id,
              role: fc.sample(fc.constantFrom('editor', 'viewer'), 1)[0]
            });
          }

          // Create workspace B
          client.setCurrentUser(userB.id);
          const workspaceB = await client.insertWorkspace(
            await fc.sample(workspaceArbitrary(userB.id), 1)[0]
          );
          await client.insertWorkspaceMember({
            id: fc.sample(fc.uuid(), 1)[0],
            workspace_id: workspaceB.id,
            user_id: userB.id,
            role: 'owner'
          });

          // Add members to workspace B
          for (const member of membersB) {
            await client.insertWorkspaceMember({
              id: fc.sample(fc.uuid(), 1)[0],
              workspace_id: workspaceB.id,
              user_id: member.id,
              role: fc.sample(fc.constantFrom('editor', 'viewer'), 1)[0]
            });
          }

          // UserA should only see members of workspace A
          client.setCurrentUser(userA.id);
          const workspaceAMembers = await client.getWorkspaceMembers(workspaceA.id);
          expect(workspaceAMembers.length).toBe(membersA.length + 1); // +1 for owner
          
          // UserA should not see members of workspace B
          const workspaceBMembersAsUserA = await client.getWorkspaceMembers(workspaceB.id);
          expect(workspaceBMembersAsUserA).toHaveLength(0);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should enforce complete data isolation across all tables', async () => {
    await fc.assert(
      fc.asyncProperty(
        userArbitrary,
        userArbitrary,
        async (userA, userB) => {
          fc.pre(userA.id !== userB.id);

          // Setup users and workspaces
          await client.insertUser(userA);
          await client.insertUser(userB);

          client.setCurrentUser(userA.id);
          const workspaceA = await client.insertWorkspace(
            await fc.sample(workspaceArbitrary(userA.id), 1)[0]
          );
          await client.insertWorkspaceMember({
            id: fc.sample(fc.uuid(), 1)[0],
            workspace_id: workspaceA.id,
            user_id: userA.id,
            role: 'owner'
          });

          client.setCurrentUser(userB.id);
          const workspaceB = await client.insertWorkspace(
            await fc.sample(workspaceArbitrary(userB.id), 1)[0]
          );
          await client.insertWorkspaceMember({
            id: fc.sample(fc.uuid(), 1)[0],
            workspace_id: workspaceB.id,
            user_id: userB.id,
            role: 'owner'
          });

          // Create comprehensive data in workspace B
          const policyB = await client.insertPolicy(
            await fc.sample(policyArbitrary(workspaceB.id, userB.id), 1)[0]
          );
          const commentB = await client.insertComment(
            await fc.sample(commentArbitrary(policyB.id, userB.id), 1)[0]
          );
          const auditEventB = await client.insertAuditEvent(
            await fc.sample(auditEventArbitrary(workspaceB.id, userB.id), 1)[0]
          );

          // Switch to userA and verify complete isolation
          client.setCurrentUser(userA.id);

          // UserA should not see workspace B
          const workspaces = await client.getWorkspaces();
          expect(workspaces.every(w => w.id !== workspaceB.id)).toBe(true);

          // UserA should not see workspace B policies
          const policies = await client.getPolicies();
          expect(policies.every(p => p.workspace_id !== workspaceB.id)).toBe(true);

          // UserA should not see workspace B comments
          const comments = await client.getComments(policyB.id);
          expect(comments).toHaveLength(0);

          // UserA should not see workspace B audit events
          const auditEvents = await client.getAuditEvents();
          expect(auditEvents.every(e => e.workspace_id !== workspaceB.id)).toBe(true);

          // UserA should not see workspace B members
          const members = await client.getWorkspaceMembers(workspaceB.id);
          expect(members).toHaveLength(0);

          // Verify userA cannot access workspace B data directly
          expect(await client.getWorkspace(workspaceB.id)).toBeNull();
          expect(await client.getPolicy(policyB.id)).toBeNull();
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should prevent viewers from creating policies (role enforcement)', async () => {
    await fc.assert(
      fc.asyncProperty(
        userArbitrary,
        userArbitrary,
        async (owner, viewer) => {
          fc.pre(owner.id !== viewer.id);

          // Setup users
          await client.insertUser(owner);
          await client.insertUser(viewer);

          // Create workspace
          client.setCurrentUser(owner.id);
          const workspace = await client.insertWorkspace(
            await fc.sample(workspaceArbitrary(owner.id), 1)[0]
          );
          await client.insertWorkspaceMember({
            id: fc.sample(fc.uuid(), 1)[0],
            workspace_id: workspace.id,
            user_id: owner.id,
            role: 'owner'
          });

          // Add viewer to workspace
          await client.insertWorkspaceMember({
            id: fc.sample(fc.uuid(), 1)[0],
            workspace_id: workspace.id,
            user_id: viewer.id,
            role: 'viewer'
          });

          // Viewer should not be able to create policies
          client.setCurrentUser(viewer.id);
          const policyData = await fc.sample(policyArbitrary(workspace.id, viewer.id), 1)[0];
          
          await expect(
            client.insertPolicy(policyData)
          ).rejects.toThrow('Permission denied: Viewers cannot create policies');
        }
      ),
      { numRuns: 30 }
    );
  });
});
