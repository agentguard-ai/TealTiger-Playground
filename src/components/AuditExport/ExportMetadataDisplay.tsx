import React from 'react';
import { Info, Calendar, User, Filter as FilterIcon } from 'lucide-react';
import type { AuditFilters } from '../../types/audit';

export interface ExportMetadataDisplayProps {
  timestamp: Date;
  exportedBy: string;
  filters: AuditFilters;
  totalEvents: number;
}

/**
 * ExportMetadataDisplay - Show timestamp, user, filters applied
 * Requirements: 11.7, 11.8
 */
export const ExportMetadataDisplay: React.FC<ExportMetadataDisplayProps> = ({
  timestamp,
  exportedBy,
  filters,
  totalEvents,
}) => {
  const formatDate = (date: Date): string => {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <Info className="w-4 h-4" />
        <span>Export Metadata</span>
      </div>

      <div className="space-y-2 text-sm">
        {/* Timestamp */}
        <div className="flex items-start gap-2">
          <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
          <div>
            <div className="text-xs text-gray-500">Export Timestamp</div>
            <div className="text-gray-700">{formatDate(timestamp)}</div>
          </div>
        </div>

        {/* Exported by */}
        <div className="flex items-start gap-2">
          <User className="w-4 h-4 text-gray-400 mt-0.5" />
          <div>
            <div className="text-xs text-gray-500">Exported By</div>
            <div className="text-gray-700">{exportedBy}</div>
          </div>
        </div>

        {/* Total events */}
        <div className="flex items-start gap-2">
          <FilterIcon className="w-4 h-4 text-gray-400 mt-0.5" />
          <div>
            <div className="text-xs text-gray-500">Total Events</div>
            <div className="text-gray-700">{totalEvents.toLocaleString()}</div>
          </div>
        </div>

        {/* Applied filters */}
        {(filters.dateRange || filters.actions || filters.actor || filters.resourceType) && (
          <div className="pt-2 border-t border-gray-200">
            <div className="text-xs font-medium text-gray-500 mb-1">Applied Filters</div>
            <div className="space-y-1">
              {filters.dateRange && (
                <div className="text-xs text-gray-600">
                  <span className="font-medium">Date Range:</span>{' '}
                  {formatDate(filters.dateRange.start)} - {formatDate(filters.dateRange.end)}
                </div>
              )}
              {filters.actions && filters.actions.length > 0 && (
                <div className="text-xs text-gray-600">
                  <span className="font-medium">Event Types:</span>{' '}
                  {filters.actions.length} selected
                </div>
              )}
              {filters.actor && (
                <div className="text-xs text-gray-600">
                  <span className="font-medium">Actor:</span> {filters.actor}
                </div>
              )}
              {filters.resourceType && (
                <div className="text-xs text-gray-600">
                  <span className="font-medium">Resource Type:</span> {filters.resourceType}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
