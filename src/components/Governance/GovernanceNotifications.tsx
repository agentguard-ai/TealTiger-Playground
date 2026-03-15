// GovernanceNotifications - Real-time approval notifications
// Requirements: 7.6

import React, { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

interface Notification {
  id: string;
  type: 'approval_request' | 'approval_approved' | 'approval_rejected' | 'state_changed';
  title: string;
  message: string;
  timestamp: Date;
  policyId: string;
  policyName: string;
}

interface GovernanceNotificationsProps {
  userId: string;
  workspaceId: string;
}

export const GovernanceNotifications: React.FC<GovernanceNotificationsProps> = ({
  userId,
  workspaceId
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    // Subscribe to audit log for governance events
    const subscription = supabase!
      .channel('governance-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_log',
          filter: `workspace_id=eq.${workspaceId}`
        },
        (payload) => {
          handleAuditEvent(payload.new);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId, workspaceId]);

  const handleAuditEvent = async (event: any) => {
    // Only show notifications for governance-related events
    const governanceActions = [
      'approval_requested',
      'policy_approved',
      'policy_rejected',
      'policy_state_changed',
      'emergency_bypass'
    ];

    if (!governanceActions.includes(event.action)) return;

    // Get policy name
    const { data: policy } = await supabase!
      .from('policies')
      .select('name')
      .eq('id', event.resource_id)
      .single();

    const policyName = policy?.name || 'Unknown Policy';

    let notification: Notification | null = null;

    switch (event.action) {
      case 'approval_requested':
        if (event.metadata?.approver_ids?.includes(userId)) {
          notification = {
            id: event.id,
            type: 'approval_request',
            title: 'Approval Requested',
            message: `You have been requested to review "${policyName}"`,
            timestamp: new Date(event.created_at),
            policyId: event.resource_id,
            policyName
          };
        }
        break;

      case 'policy_approved':
        notification = {
          id: event.id,
          type: 'approval_approved',
          title: 'Policy Approved',
          message: `"${policyName}" has been approved`,
          timestamp: new Date(event.created_at),
          policyId: event.resource_id,
          policyName
        };
        break;

      case 'policy_rejected':
        notification = {
          id: event.id,
          type: 'approval_rejected',
          title: 'Policy Rejected',
          message: `"${policyName}" has been rejected`,
          timestamp: new Date(event.created_at),
          policyId: event.resource_id,
          policyName
        };
        break;

      case 'policy_state_changed':
        notification = {
          id: event.id,
          type: 'state_changed',
          title: 'Policy State Changed',
          message: `"${policyName}" moved to ${event.metadata?.to_state}`,
          timestamp: new Date(event.created_at),
          policyId: event.resource_id,
          policyName
        };
        break;
    }

    if (notification) {
      setNotifications(prev => [notification!, ...prev].slice(0, 10)); // Keep last 10
      setIsVisible(true);

      // Auto-hide after 5 seconds
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification!.id));
      }, 5000);
    }
  };

  const handleDismiss = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map(notification => (
        <div
          key={notification.id}
          className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 animate-slide-in"
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              {notification.type === 'approval_request' && <span className="text-2xl">📬</span>}
              {notification.type === 'approval_approved' && <span className="text-2xl">✅</span>}
              {notification.type === 'approval_rejected' && <span className="text-2xl">❌</span>}
              {notification.type === 'state_changed' && <span className="text-2xl">🔄</span>}
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900">{notification.title}</h4>
              <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
              <p className="text-xs text-gray-500 mt-1">
                {notification.timestamp.toLocaleTimeString()}
              </p>
            </div>

            <button
              onClick={() => handleDismiss(notification.id)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600"
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
