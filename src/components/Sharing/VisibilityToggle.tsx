// VisibilityToggle - Toggle policy between public and private
// Requirements: 21.1, 21.2

import React, { useState, useCallback } from 'react';
import { PolicySharingService } from '../../services/PolicySharingService';
import type { PolicyVisibility } from '../../types/sharing';

interface VisibilityToggleProps {
  policyId: string;
  workspaceId: string;
  initialVisibility: PolicyVisibility;
  onChange?: (visibility: PolicyVisibility) => void;
}

export const VisibilityToggle: React.FC<VisibilityToggleProps> = ({
  policyId,
  workspaceId,
  initialVisibility,
  onChange,
}) => {
  const [visibility, setVisibility] = useState<PolicyVisibility>(initialVisibility);
  const [loading, setLoading] = useState(false);

  const toggle = useCallback(async () => {
    const next: PolicyVisibility = visibility === 'private' ? 'public' : 'private';
    setLoading(true);
    try {
      const service = new PolicySharingService();
      if (next === 'public') {
        await service.makePublic(policyId, workspaceId);
      } else {
        await service.makePrivate(policyId, workspaceId);
      }
      setVisibility(next);
      onChange?.(next);
    } catch {
      console.warn('Failed to update visibility');
    } finally {
      setLoading(false);
    }
  }, [policyId, workspaceId, visibility, onChange]);

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded transition-colors ${
        visibility === 'public'
          ? 'bg-teal-700 hover:bg-teal-600 text-white'
          : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
      } disabled:opacity-50`}
      aria-label={`Policy is ${visibility}. Click to make ${visibility === 'public' ? 'private' : 'public'}.`}
    >
      {loading ? '...' : visibility === 'public' ? '🌐 Public' : '🔒 Private'}
    </button>
  );
};
