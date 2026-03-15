import { supabase } from '../lib/supabase';
import type {
  Workspace,
  WorkspaceMember,
  WorkspaceRole,
  WorkspaceAction,
  WorkspaceSettings,
  WorkspaceError,
} from '../types/workspace';

/**
 * WorkspaceService - Manages team workspaces and member permissions
 * Requirements: 5.1-5.10
 */
export class WorkspaceService {
  /**
   * Creates a new team workspace
   * Requirements: 5.1
   */
  async createWorkspace(name: string, ownerId: string): Promise<Workspace> {
    try {
      // Generate slug from name
      const slug = this.generateSlug(name);

      // Default workspace settings
      const defaultSettings: WorkspaceSettings = {
        requiredApprovers: 1,
        approverUserIds: [ownerId],
        allowEmergencyBypass: false,
        autoApprovalRules: [],
        rateLimitPool: {
          enabled: false,
        },
        budgetAlerts: [],
      };

      // Create workspace
      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .insert({
          name,
          slug,
          owner_id: ownerId,
          settings: defaultSettings,
        })
        .select()
        .single();

      if (workspaceError) throw workspaceError;

      // Add owner as member
      const { error: memberError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspace.id,
          user_id: ownerId,
          role: 'owner',
        });

      if (memberError) throw memberError;

      return this.mapWorkspace(workspace);
    } catch (error) {
      throw this.handleError(error, 'Failed to create workspace');
    }
  }

  /**
   * Invites a user to workspace
   * Requirements: 5.2, 5.3
   */
  async inviteMember(
    workspaceId: string,
    emailOrGithubUsername: string,
    role: WorkspaceRole
  ): Promise<WorkspaceMember> {
    try {
      // Find user by email or GitHub username
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .or(`email.eq.${emailOrGithubUsername},username.eq.${emailOrGithubUsername}`)
        .single();

      if (userError || !user) {
        throw new Error('User not found');
      }

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .single();

      if (existingMember) {
        throw new Error('User is already a member of this workspace');
      }

      // Add member
      const { data: member, error: memberError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspaceId,
          user_id: user.id,
          role,
        })
        .select()
        .single();

      if (memberError) throw memberError;

      return this.mapWorkspaceMember(member);
    } catch (error) {
      throw this.handleError(error, 'Failed to invite member');
    }
  }

  /**
   * Removes a member from workspace (owners only)
   * Requirements: 5.8
   */
  async removeMember(workspaceId: string, memberId: string): Promise<void> {
    try {
      // Check if member is the owner
      const { data: member } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('id', memberId)
        .eq('workspace_id', workspaceId)
        .single();

      if (member?.role === 'owner') {
        throw new Error('Cannot remove workspace owner. Transfer ownership first.');
      }

      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('id', memberId)
        .eq('workspace_id', workspaceId);

      if (error) throw error;
    } catch (error) {
      throw this.handleError(error, 'Failed to remove member');
    }
  }

  /**
   * Updates member role (owners only)
   * Requirements: 5.4
   */
  async updateMemberRole(
    workspaceId: string,
    memberId: string,
    newRole: WorkspaceRole
  ): Promise<void> {
    try {
      // Prevent changing owner role
      const { data: member } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('id', memberId)
        .eq('workspace_id', workspaceId)
        .single();

      if (member?.role === 'owner' && newRole !== 'owner') {
        throw new Error('Cannot change owner role. Transfer ownership instead.');
      }

      const { error } = await supabase
        .from('workspace_members')
        .update({ role: newRole })
        .eq('id', memberId)
        .eq('workspace_id', workspaceId);

      if (error) throw error;
    } catch (error) {
      throw this.handleError(error, 'Failed to update member role');
    }
  }

  /**
   * Transfers ownership to another member
   * Requirements: 5.9
   */
  async transferOwnership(
    workspaceId: string,
    newOwnerId: string
  ): Promise<void> {
    try {
      // Verify new owner is a member
      const { data: newOwnerMember } = await supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('user_id', newOwnerId)
        .single();

      if (!newOwnerMember) {
        throw new Error('New owner must be a workspace member');
      }

      // Get current owner
      const { data: currentOwnerMember } = await supabase
        .from('workspace_members')
        .select('id, user_id')
        .eq('workspace_id', workspaceId)
        .eq('role', 'owner')
        .single();

      if (!currentOwnerMember) {
        throw new Error('Current owner not found');
      }

      // Update workspace owner_id
      const { error: workspaceError } = await supabase
        .from('workspaces')
        .update({ owner_id: newOwnerId })
        .eq('id', workspaceId);

      if (workspaceError) throw workspaceError;

      // Update new owner's role
      const { error: newOwnerError } = await supabase
        .from('workspace_members')
        .update({ role: 'owner' })
        .eq('workspace_id', workspaceId)
        .eq('user_id', newOwnerId);

      if (newOwnerError) throw newOwnerError;

      // Downgrade previous owner to editor
      const { error: oldOwnerError } = await supabase
        .from('workspace_members')
        .update({ role: 'editor' })
        .eq('id', currentOwnerMember.id);

      if (oldOwnerError) throw oldOwnerError;
    } catch (error) {
      throw this.handleError(error, 'Failed to transfer ownership');
    }
  }

  /**
   * Lists all workspaces for a user
   * Requirements: 5.7
   */
  async listWorkspaces(userId: string): Promise<Workspace[]> {
    try {
      const { data, error } = await supabase
        .from('workspace_members')
        .select(`
          workspace_id,
          workspaces (
            id,
            name,
            slug,
            owner_id,
            settings,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', userId);

      if (error) throw error;

      return data
        .map((item: any) => item.workspaces)
        .filter(Boolean)
        .map(this.mapWorkspace);
    } catch (error) {
      throw this.handleError(error, 'Failed to list workspaces');
    }
  }

  /**
   * Gets workspace members with roles
   * Requirements: 5.7
   */
  async getMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    try {
      const { data, error } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('joined_at', { ascending: true });

      if (error) throw error;

      return data.map(this.mapWorkspaceMember);
    } catch (error) {
      throw this.handleError(error, 'Failed to get workspace members');
    }
  }

  /**
   * Gets a single workspace by ID
   */
  async getWorkspace(workspaceId: string): Promise<Workspace | null> {
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', workspaceId)
        .single();

      if (error) throw error;
      if (!data) return null;

      return this.mapWorkspace(data);
    } catch (error) {
      throw this.handleError(error, 'Failed to get workspace');
    }
  }

  /**
   * Checks if user has permission for action
   * Requirements: 5.4, 5.5, 5.6
   */
  async checkPermission(
    workspaceId: string,
    userId: string,
    action: WorkspaceAction
  ): Promise<boolean> {
    try {
      // Get user's role in workspace
      const { data: member, error } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .single();

      if (error || !member) return false;

      return this.hasPermission(member.role as WorkspaceRole, action);
    } catch (error) {
      return false;
    }
  }

  /**
   * Determines if a role has permission for an action
   * Requirements: 5.4, 5.5, 5.6
   */
  private hasPermission(role: WorkspaceRole, action: WorkspaceAction): boolean {
    const permissions: Record<WorkspaceRole, WorkspaceAction[]> = {
      [WorkspaceRole.Owner]: [
        'manage_members',
        'manage_settings',
        'create_policy',
        'edit_policy',
        'delete_policy',
        'approve_policy',
        'view_policy',
        'run_evaluation',
      ],
      [WorkspaceRole.Editor]: [
        'create_policy',
        'edit_policy',
        'delete_policy',
        'view_policy',
        'run_evaluation',
      ],
      [WorkspaceRole.Viewer]: [
        'view_policy',
        'run_evaluation',
      ],
    };

    return permissions[role]?.includes(action) ?? false;
  }

  /**
   * Generates a URL-friendly slug from workspace name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }

  /**
   * Maps database workspace to domain model
   */
  private mapWorkspace(data: any): Workspace {
    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      ownerId: data.owner_id,
      settings: data.settings || {},
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  /**
   * Maps database workspace member to domain model
   */
  private mapWorkspaceMember(data: any): WorkspaceMember {
    return {
      id: data.id,
      workspaceId: data.workspace_id,
      userId: data.user_id,
      role: data.role as WorkspaceRole,
      joinedAt: new Date(data.joined_at),
    };
  }

  /**
   * Handles errors and wraps them in WorkspaceError
   */
  private handleError(error: any, defaultMessage: string): WorkspaceError {
    console.error('WorkspaceService error:', error);
    return {
      message: error?.message || defaultMessage,
      code: error?.code,
    };
  }
}

// Export singleton instance
export const workspaceService = new WorkspaceService();
