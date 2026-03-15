// CommentFilterBar - Filter comments by author, status, date
// Requirements: 6.10

import React from 'react';
import { CommentFilters } from '../../types/comment';

interface CommentFilterBarProps {
  filters: CommentFilters;
  onFiltersChange: (filters: CommentFilters) => void;
  authors: Array<{ id: string; username: string }>;
}

export const CommentFilterBar: React.FC<CommentFilterBarProps> = ({
  filters,
  onFiltersChange,
  authors,
}) => {
  const handleAuthorChange = (authorId: string) => {
    onFiltersChange({
      ...filters,
      author: authorId || undefined,
    });
  };

  const handleStatusChange = (status: string) => {
    onFiltersChange({
      ...filters,
      resolved: status === 'all' ? undefined : status === 'resolved',
    });
  };

  const handleDateRangeChange = (range: string) => {
    const now = new Date();
    let dateRange: { start: Date; end: Date } | undefined;

    switch (range) {
      case 'today':
        dateRange = { start: new Date(now.setHours(0, 0, 0, 0)), end: new Date() };
        break;
      case 'week':
        dateRange = {
          start: new Date(now.setDate(now.getDate() - 7)),
          end: new Date(),
        };
        break;
      case 'month':
        dateRange = {
          start: new Date(now.setMonth(now.getMonth() - 1)),
          end: new Date(),
        };
        break;
      default:
        dateRange = undefined;
    }

    onFiltersChange({
      ...filters,
      dateRange,
    });
  };

  return (
    <div className="flex items-center space-x-4 p-4 bg-gray-50 border-b">
      {/* Author Filter */}
      <div className="flex items-center space-x-2">
        <label className="text-sm font-medium text-gray-700">Author:</label>
        <select
          value={filters.author || ''}
          onChange={(e) => handleAuthorChange(e.target.value)}
          className="px-2 py-1 text-sm border border-gray-300 rounded"
        >
          <option value="">All</option>
          {authors.map((author) => (
            <option key={author.id} value={author.id}>
              {author.username}
            </option>
          ))}
        </select>
      </div>

      {/* Status Filter */}
      <div className="flex items-center space-x-2">
        <label className="text-sm font-medium text-gray-700">Status:</label>
        <select
          value={
            filters.resolved === undefined
              ? 'all'
              : filters.resolved
              ? 'resolved'
              : 'unresolved'
          }
          onChange={(e) => handleStatusChange(e.target.value)}
          className="px-2 py-1 text-sm border border-gray-300 rounded"
        >
          <option value="all">All</option>
          <option value="unresolved">Unresolved</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {/* Date Range Filter */}
      <div className="flex items-center space-x-2">
        <label className="text-sm font-medium text-gray-700">Date:</label>
        <select
          onChange={(e) => handleDateRangeChange(e.target.value)}
          className="px-2 py-1 text-sm border border-gray-300 rounded"
        >
          <option value="all">All time</option>
          <option value="today">Today</option>
          <option value="week">Last 7 days</option>
          <option value="month">Last 30 days</option>
        </select>
      </div>

      {/* Clear Filters */}
      {(filters.author || filters.resolved !== undefined || filters.dateRange) && (
        <button
          onClick={() => onFiltersChange({})}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Clear filters
        </button>
      )}
    </div>
  );
};
