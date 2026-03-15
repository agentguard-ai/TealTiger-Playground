// SideBySideDiffView - Side-by-side policy diff comparison
// Requirements: 4.1, 4.2, 4.3, 4.4, 4.5

import React from 'react';
import type { PolicyDiff } from '../../types/policy';

interface SideBySideDiffViewProps {
  diff: PolicyDiff;
}

export const SideBySideDiffView: React.FC<SideBySideDiffViewProps> = ({ diff }) => {
  const oldLines = diff.oldVersion.code.split('\n');
  const newLines = diff.newVersion.code.split('\n');
  const maxLines = Math.max(oldLines.length, newLines.length);

  // Build a map of line numbers to changes for quick lookup
  const changeMap = new Map<number, typeof diff.changes[0]>();
  diff.changes.forEach(change => {
    changeMap.set(change.lineNumber, change);
  });

  const getLineStyle = (lineNum: number, side: 'old' | 'new') => {
    const change = changeMap.get(lineNum);
    if (!change) return '';

    if (change.type === 'added' && side === 'new') {
      return 'bg-green-50 border-l-4 border-green-500';
    }
    if (change.type === 'removed' && side === 'old') {
      return 'bg-red-50 border-l-4 border-red-500';
    }
    if (change.type === 'modified') {
      return side === 'old' 
        ? 'bg-yellow-50 border-l-4 border-yellow-500'
        : 'bg-yellow-50 border-l-4 border-yellow-500';
    }
    return '';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-2 border-b border-gray-200 bg-gray-50">
        <div className="px-4 py-3 border-r border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700">
            Version {diff.oldVersion.version}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {new Date(diff.oldVersion.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-700">
            Version {diff.newVersion.version}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {new Date(diff.newVersion.createdAt).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Diff Content */}
      <div className="grid grid-cols-2 font-mono text-sm">
        {/* Old Version Column */}
        <div className="border-r border-gray-200 overflow-x-auto">
          {oldLines.map((line, idx) => {
            const lineNum = idx + 1;
            const lineStyle = getLineStyle(lineNum, 'old');
            return (
              <div
                key={`old-${idx}`}
                className={`flex ${lineStyle}`}
              >
                <span className="inline-block w-12 text-right pr-2 text-gray-400 select-none flex-shrink-0">
                  {lineNum}
                </span>
                <span className="flex-1 px-2 py-1 whitespace-pre-wrap break-all">
                  {line || ' '}
                </span>
              </div>
            );
          })}
        </div>

        {/* New Version Column */}
        <div className="overflow-x-auto">
          {newLines.map((line, idx) => {
            const lineNum = idx + 1;
            const lineStyle = getLineStyle(lineNum, 'new');
            return (
              <div
                key={`new-${idx}`}
                className={`flex ${lineStyle}`}
              >
                <span className="inline-block w-12 text-right pr-2 text-gray-400 select-none flex-shrink-0">
                  {lineNum}
                </span>
                <span className="flex-1 px-2 py-1 whitespace-pre-wrap break-all">
                  {line || ' '}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
