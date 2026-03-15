import { create } from 'zustand';
import type { Workspace, WorkspaceMember, WorkspaceAction } from '../types/workspace';
import { workspaceService } from '../services/WorkspaceService';

interface WorkspaceState {
  // State
  workspaces: Workspace[];
  currentWorkspaceId: string | null;
  members: WorkspaceMember[];
  isLoading: boolean;
  error: string | null;

  // Computed
  currentWorkspace: Workspace | null;
  currentUserRole: string | null;

  // Actions
  loadWorkspaces: (userId: string) => Promise<void>;
  setCurrentWorkspace: (workspaceId: string) => Promise<void>;
  createWorkspace: (name: string, ownerId: string) => Promise<void>;
  inviteMember: (workspaceId: string, emailOrUsername: string, role: any) => Promise<void>;
  removeMember: (workspaceId: string, memberId: string) => Promise<void>;
  updateMemberRole: (workspaceId: string, memberId: string, newRole: any) => Promise<void>;
  transferOwnership: (workspaceId: string, newOwnerId: string) => Promise<void>;
  checkPermission: (userId: string, action: WorkspaceAction) => Promise<boolean>;
  clearError: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  // Initial state
  workspaces: [],
  currentWorkspaceId: null,
  members: [],
  isLoading: false,
  error: null,
  currentWorkspace: null,
  currentUserRole: null,

  // Load all workspaces for a user
  loadWorkspaces: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const workspaces = await workspaceService.listWorkspaces(userId);
      set({ workspaces, isLoading: false });

      // Auto-select first workspace if none selected
      const state = get();
      if (!state.currentWorkspaceId && workspaces.length > 0) {
        await get().setCurrentWorkspace(workspaces[0].id);
      }
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  // Set current workspace and load its members
  setCurrentWorkspace: async (workspaceId: string) => {
    set({ isLoading: true, error: null });
    try {
      const workspace = await workspaceService.getWorkspace(workspaceId);
      const members = await workspaceService.getMembers(workspaceId);
      
      set({
        currentWorkspaceId: workspaceId,
        currentWorkspace: workspace,
        members,
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  // Create a new workspace
  createWorkspace: async (name: string, ownerId: string) => {
    set({ isLoading: true, error: null });
    try {
      const workspace = await workspaceService.createWorkspace(name, ownerId);
      set((state) => ({
        workspaces: [...state.workspaces, workspace],
        isLoading: false,
      }));

      // Auto-select the new workspace
      await get().setCurrentWorkspace(workspace.id);
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Invite a member to the workspace
  inviteMember: async (workspaceId: string, emailOrUsername: string, role: any) => {
    set({ isLoading: true, error: null });
    try {
      const member = await workspaceService.inviteMember(workspaceId, emailOrUsername, role);
      set((state) => ({
        members: [...state.members, member],
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Remove a member from the workspace
  removeMember: async (workspaceId: string, memberId: string) => {
    set({ isLoading: true, error: null });
    try {
      await workspaceService.removeMember(workspaceId, memberId);
      set((state) => ({
        members: state.members.filter((m) => m.id !== memberId),
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Update a member's role
  updateMemberRole: async (workspaceId: string, memberId: string, newRole: any) => {
    set({ isLoading: true, error: null });
    try {
      await workspaceService.updateMemberRole(workspaceId, memberId, newRole);
      set((state) => ({
        members: state.members.map((m) =>
          m.id === memberId ? { ...m, role: newRole } : m
        ),
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Transfer ownership to another member
  transferOwnership: async (workspaceId: string, newOwnerId: string) => {
    set({ isLoading: true, error: null });
    try {
      await workspaceService.transferOwnership(workspaceId, newOwnerId);
      
      // Reload workspace and members to reflect changes
      await get().setCurrentWorkspace(workspaceId);
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Check if user has permission for an action
  checkPermission: async (userId: string, action: WorkspaceAction) => {
    const state = get();
    if (!state.currentWorkspaceId) return false;

    try {
      return await workspaceService.checkPermission(
        state.currentWorkspaceId,
        userId,
        action
      );
    } catch (error) {
      return false;
    }
  },

  // Clear error state
  clearError: () => set({ error: null }),
}));
