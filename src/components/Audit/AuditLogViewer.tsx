import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { AuditEvent, AuditFilters, PaginatedResult } from '../../types/audit';
import { auditTrailService } from '../../services/AuditTrailService';
import { AuditEventCard } from './AuditEventCard';
import { AuditFilterBar } from './AuditFilterBar';
import { AuditTimeline } from './AuditTimeline';

interface AuditLogViewerProps {
  workspaceId: string;
}

type ViewMode = 'list' | 'timeline';

/**
 * AuditLogViewer - Main viewer with virtual scrolling for performance
 * Requirements: 10.8, 29.3
 */
export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ workspaceId }) => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AuditFilters>({});
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  
  const observerTarget = useRef<HTMLDivElement>(null);
  const pageSize = 100;

  // Load audit events
  const loadEvents = useCallback(async (pageNum: number, append: boolean = false) => {
    try {
      setLoading(true);
      setError(null);

      let result: PaginatedResult<AuditEvent>;

      if (Object.keys(filters).length > 0) {
        // Use filter endpoint
        const filtered = await auditTrailService.filterEvents(workspaceId, filters);
        // Manually paginate filtered results
        const start = (pageNum - 1) * pageSize;
        const end = start + pageSize;
        result = {
          items: filtered.slice(start, end),
          total: filtered.length,
          page: pageNum,
          pageSize,
          hasMore: end < filtered.length,
        };
      } else {
        // Use paginated endpoint
        result = await auditTrailService.getEvents(workspaceId, {
          page: pageNum,
          pageSize,
          sortBy: 'created_at',
          sortOrder: 'desc',
        });
      }

      setEvents(prev => append ? [...prev, ...result.items] : result.items);
      setHasMore(result.hasMore);
      setTotal(result.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load audit events');
      console.error('Error loading audit events:', err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, filters]);

  // Initial load
  useEffect(() => {
    setPage(1);
    loadEvents(1, false);
  }, [loadEvents]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          const nextPage = page + 1;
          setPage(nextPage);
          loadEvents(nextPage, true);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loading, page, loadEvents]);

  const handleFilterChange = (newFilters: AuditFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleRefresh = () => {
    setPage(1);
    loadEvents(1, false);
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-800">Error: {error}</p>
        <button
          onClick={handleRefresh}
          className="mt-2 text-sm text-red-600 hover:text-red-700 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Audit Log</h2>
          <p className="text-sm text-gray-600">
            {total.toLocaleString()} event{total !== 1 ? 's' : ''} total
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex border border-gray-300 rounded-md overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'timeline'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Timeline
            </button>
          </div>

          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Filters sidebar */}
        <div className="lg:col-span-1">
          <AuditFilterBar
            onFilterChange={handleFilterChange}
            currentFilters={filters}
          />
        </div>

        {/* Events display */}
        <div className="lg:col-span-3">
          {events.length === 0 && !loading ? (
            <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
              <p className="text-gray-500">No audit events found</p>
              {Object.keys(filters).length > 0 && (
                <button
                  onClick={() => handleFilterChange({})}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700 underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {viewMode === 'list' ? (
                <>
                  {/* List view */}
                  {events.map((event) => (
                    <AuditEventCard key={event.id} event={event} />
                  ))}

                  {/* Infinite scroll trigger */}
                  {hasMore && (
                    <div ref={observerTarget} className="py-4 text-center">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                      <p className="text-sm text-gray-500 mt-2">Loading more events...</p>
                    </div>
                  )}

                  {!hasMore && events.length > 0 && (
                    <div className="py-4 text-center text-sm text-gray-500">
                      End of audit log
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Timeline view */}
                  <AuditTimeline events={events} />

                  {/* Infinite scroll trigger */}
                  {hasMore && (
                    <div ref={observerTarget} className="py-4 text-center">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                      <p className="text-sm text-gray-500 mt-2">Loading more events...</p>
                    </div>
                  )}

                  {!hasMore && events.length > 0 && (
                    <div className="py-4 text-center text-sm text-gray-500">
                      End of audit log
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
