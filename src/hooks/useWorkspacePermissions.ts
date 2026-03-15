import { useEffect, useState } from 'react';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useAuthStore } from '../store/authStore';
import type { WorkspaceAction, WorkspaceRole } from '../types/workspace';

/**
 * Hook for checking workspace permissions
 * Requirements: 5.4, 5.5, 5.6
 */
export const useWorkspacePermissions = () => {
  const { user } = useAuthStore();
  const { currentWorkspaceId, members, checkPermission } = useWorkspaceStore();
  const [permissions, setPermissions] = useState<Record<WorkspaceAction, boolean>>({
    manage_members: false,
    manage_settings: false,
    create_policy: false,
    edit_policy: false,
    delete_policy: false,
    approve_policy: false,
    view_policy: false,
    run_evaluation: false,
  });

  const currentMember = members.find((m) => m.userId === user?.id);
  const role = currentMember?.role as WorkspaceRole | undefined;

  useEffect(() => {
    const loadPermissions = async () => {
      if (!user?.id || !currentWorkspaceId) {
        // Reset permissions if not authenticated or no workspace
        setPermissions({
          manage_members: false,
          manage_settings: false,
          create_policy: false,
          edit_policy: false,
          delete_policy: false,
          approve_policy: false,
          view_policy: false,
          run_evaluation: false,
        });
        return;
      }

      // Check all permissions
      const actions: WorkspaceAction[] = [
        'manage_members',
        'manage_settings',
        'create_policy',
        'edit_policy',
        'delete_policy',
        'approve_policy',
        'view_policy',
        'run_evaluation',
      ];

      const permissionChecks = await Promise.all(
        actions.map((action) => checkPermission(user.id, action))
      );

      const newPermissions = actions.reduce((acc, action, index) => {
        acc[action] = permissionChecks[index];
        return acc;
      }, {} as Record<WorkspaceAction, boolean>);

      setPermissions(newPermissions);
    };

    loadPermissions();
  }, [user?.id, currentWorkspaceId, role, checkPermission]);

  return {
    permissions,
    role,
    isOwner: role === 'owner',
    isEditor: role === 'editor',
    isViewer: role === 'viewer',
    canManageMembers: permissions.manage_members,
    canManageSettings: permissions.manage_settings,
    canCreatePolicy: permissions.create_policy,
    canEditPolicy: permissions.edit_policy,
    canDeletePolicy: permissions.delete_policy,
    canApprovePolicy: permissions.approve_policy,
    canViewPolicy: permissions.view_policy,
    canRunEvaluation: permissions.run_evaluation,
  };
};

/**
 * Hook for checking a specific permission
 */
export const useHasPermission = (action: WorkspaceAction): boolean => {
  const { permissions } = useWorkspacePermissions();
  return permissions[action];
};

/**
 * Hook for getting current user's role
 */
export const useWorkspaceRole = (): WorkspaceRole | null => {
  const { role } = useWorkspacePermissions();
  return role || null;
};
