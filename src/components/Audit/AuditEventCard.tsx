import React from 'react';
import type { AuditEvent } from '../../types/audit';
import { auditTrailService } from '../../services/AuditTrailService';

interface AuditEventCardProps {
  event: AuditEvent;
}

/**
 * AuditEventCard - Displays individual audit event with human-readable description
 * Requirements: 10.10
 */
export const AuditEventCard: React.FC<AuditEventCardProps> = ({ event }) => {
  const description = auditTrailService.formatEventDescription(event);
  
  // Action type color coding
  const getActionColor = (action: string): string => {
    if (action.includes('created') || action.includes('approved')) return 'text-green-600 bg-green-50';
    if (action.includes('deleted') || action.includes('rejected')) return 'text-red-600 bg-red-50';
    if (action.includes('updated') || action.includes('changed')) return 'text-yellow-600 bg-yellow-50';
    if (action.includes('deployed')) return 'text-blue-600 bg-blue-50';
    if (action.includes('emergency')) return 'text-orange-600 bg-orange-50';
    return 'text-gray-600 bg-gray-50';
  };

  const formatTimestamp = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 7) {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Action badge */}
          <div className="flex items-center gap-2 mb-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(event.action)}`}>
              {event.action.replace(/_/g, ' ')}
            </span>
            <span className="text-xs text-gray-500">
              {event.resourceType}
            </span>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-900 mb-2">
            {description}
          </p>

          {/* Metadata */}
          {Object.keys(event.metadata).length > 0 && (
            <details className="text-xs text-gray-600">
              <summary className="cursor-pointer hover:text-gray-900">
                View details
              </summary>
              <pre className="mt-2 p-2 bg-gray-100 rounded overflow-x-auto">
                {JSON.stringify(event.metadata, null, 2)}
              </pre>
            </details>
          )}
        </div>

        {/* Timestamp */}
        <div className="flex-shrink-0 text-right">
          <p className="text-xs text-gray-500" title={event.createdAt.toISOString()}>
            {formatTimestamp(event.createdAt)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            ID: {event.id.substring(0, 8)}
          </p>
        </div>
      </div>
    </div>
  );
};
