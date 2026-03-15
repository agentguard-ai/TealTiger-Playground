import React from 'react';
import type { AuditEvent } from '../../types/audit';
import { auditTrailService } from '../../services/AuditTrailService';

interface AuditTimelineProps {
  events: AuditEvent[];
}

/**
 * AuditTimeline - Visual timeline of audit events
 * Requirements: 10.8, 10.10
 */
export const AuditTimeline: React.FC<AuditTimelineProps> = ({ events }) => {
  if (events.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No audit events to display</p>
      </div>
    );
  }

  // Group events by date
  const groupedEvents = events.reduce((acc, event) => {
    const dateKey = event.createdAt.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(event);
    return acc;
  }, {} as Record<string, AuditEvent[]>);

  const getActionIcon = (action: string): string => {
    if (action.includes('created')) return '➕';
    if (action.includes('updated') || action.includes('changed')) return '✏️';
    if (action.includes('deleted')) return '🗑️';
    if (action.includes('approved')) return '✅';
    if (action.includes('rejected')) return '❌';
    if (action.includes('deployed')) return '🚀';
    if (action.includes('evaluated')) return '🔍';
    if (action.includes('login')) return '🔐';
    if (action.includes('logout')) return '🚪';
    if (action.includes('emergency')) return '⚠️';
    return '📝';
  };

  const getActionColor = (action: string): string => {
    if (action.includes('created') || action.includes('approved')) return 'bg-green-500';
    if (action.includes('deleted') || action.includes('rejected')) return 'bg-red-500';
    if (action.includes('updated') || action.includes('changed')) return 'bg-yellow-500';
    if (action.includes('deployed')) return 'bg-blue-500';
    if (action.includes('emergency')) return 'bg-orange-500';
    return 'bg-gray-500';
  };

  return (
    <div className="space-y-8">
      {Object.entries(groupedEvents).map(([date, dateEvents]) => (
        <div key={date}>
          {/* Date header */}
          <div className="sticky top-0 bg-white z-10 pb-2 mb-4">
            <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-2">
              {date}
            </h3>
          </div>

          {/* Timeline events */}
          <div className="relative pl-8 space-y-6">
            {/* Vertical line */}
            <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-200" />

            {dateEvents.map((event, index) => {
              const description = auditTrailService.formatEventDescription(event);
              const time = event.createdAt.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div key={event.id} className="relative">
                  {/* Timeline dot */}
                  <div
                    className={`absolute -left-6 w-4 h-4 rounded-full ${getActionColor(event.action)} border-2 border-white`}
                    title={event.action}
                  />

                  {/* Event card */}
                  <div className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="text-xl flex-shrink-0">
                        {getActionIcon(event.action)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-gray-500">
                            {time}
                          </span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500">
                            {event.resourceType.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900">
                          {description}
                        </p>
                        
                        {/* Metadata preview */}
                        {event.metadata && Object.keys(event.metadata).length > 0 && (
                          <div className="mt-2 text-xs text-gray-600">
                            {Object.entries(event.metadata)
                              .slice(0, 3)
                              .map(([key, value]) => (
                                <div key={key} className="truncate">
                                  <span className="font-medium">{key}:</span>{' '}
                                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
