// PolicyDiffViewer - Main component for viewing policy diffs
// Requirements: 4.1-4.10

import React, { useState, useEffect } from 'react';
import type { PolicyDiff } from '../../types/policy';
import { policyDiffService } from '../../services/PolicyDiffService';
import { SideBySideDiffView } from './SideBySideDiffView';
import { UnifiedDiffView } from './UnifiedDiffView';
import { MetadataChangeDisplay } from './MetadataChangeDisplay';
import { DiffExportButton } from './DiffExportButton';

interface PolicyDiffViewerProps {
  oldVersionId: string;
  newVersionId: string;
  onClose?: () => void;
}

type ViewMode = 'side-by-side' | 'unified';

export const PolicyDiffViewer: React.FC<PolicyDiffViewerProps> = ({
  oldVersionId,
  newVersionId,
  onClose
}) => {
  const [diff, setDiff] = useState<PolicyDiff | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('side-by-side');

  useEffect(() => {
    loadDiff();
  }, [oldVersionId, newVersionId]);

  const loadDiff = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await policyDiffService.calculateDiff(oldVersionId, newVersionId);
      setDiff(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load diff');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading diff...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-800 font-semibold mb-2">Error Loading Diff</h3>
        <p className="text-red-700 text-sm">{error}</p>
        {onClose && (
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Close
          </button>
        )}
      </div>
    );
  }

  if (!diff) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Policy Diff</h2>
            <p className="text-sm text-gray-600 mt-1">
              Comparing version {diff.oldVersion.version} with {diff.newVersion.version}
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-green-50 border border-green-200 rounded p-3">
            <div className="text-2xl font-bold text-green-700">
              {diff.summary.linesAdded}
            </div>
            <div className="text-xs text-green-600 mt-1">Lines Added</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <div className="text-2xl font-bold text-red-700">
              {diff.summary.linesRemoved}
            </div>
            <div className="text-xs text-red-600 mt-1">Lines Removed</div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
            <div className="text-2xl font-bold text-yellow-700">
              {diff.summary.linesModified}
            </div>
            <div className="text-xs text-yellow-600 mt-1">Lines Modified</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <div className="text-2xl font-bold text-blue-700">
              {diff.metadataChanges.length}
            </div>
            <div className="text-xs text-blue-600 mt-1">Metadata Changes</div>
          </div>
        </div>

        {/* View Mode Toggle and Export */}
        <div className="flex items-center justify-between">
          <div className="inline-flex rounded-md shadow-sm" role="group">
            <button
              onClick={() => setViewMode('side-by-side')}
              className={`px-4 py-2 text-sm font-medium rounded-l-md border ${
                viewMode === 'side-by-side'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Side by Side
            </button>
            <button
              onClick={() => setViewMode('unified')}
              className={`px-4 py-2 text-sm font-medium rounded-r-md border-t border-r border-b ${
                viewMode === 'unified'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Unified
            </button>
          </div>

          <DiffExportButton diff={diff} />
        </div>
      </div>

      {/* Code Diff View */}
      {viewMode === 'side-by-side' ? (
        <SideBySideDiffView diff={diff} />
      ) : (
        <UnifiedDiffView diff={diff} />
      )}

      {/* Metadata Changes */}
      {diff.metadataChanges.length > 0 && (
        <MetadataChangeDisplay changes={diff.metadataChanges} />
      )}
    </div>
  );
};
