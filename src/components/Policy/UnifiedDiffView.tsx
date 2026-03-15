// UnifiedDiffView - Unified policy diff with +/- indicators
// Requirements: 4.6

import React from 'react';
import type { PolicyDiff } from '../../types/policy';

interface UnifiedDiffViewProps {
  diff: PolicyDiff;
}

export const UnifiedDiffView: React.FC<UnifiedDiffViewProps> = ({ diff }) => {
  // Merge old and new lines with change indicators
  const unifiedLines: Array<{
    lineNumber: number;
    content: string;
    type: 'added' | 'removed' | 'modified' | 'unchanged';
    indicator: string;
  }> = [];

  const oldLines = diff.oldVersion.code.split('\n');
  const newLines = diff.newVersion.code.split('\n');

  // Build a map of changes
  const changeMap = new Map<number, typeof diff.changes[0]>();
  diff.changes.forEach(change => {
    changeMap.set(change.lineNumber, change);
  });

  // Process all lines
  const maxLines = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < maxLines; i++) {
    const lineNum = i + 1;
    const change = changeMap.get(lineNum);

    if (change) {
      if (change.type === 'removed') {
        unifiedLines.push({
          lineNumber: lineNum,
          content: change.oldContent || '',
          type: 'removed',
          indicator: '-'
        });
      } else if (change.type === 'added') {
        unifiedLines.push({
          lineNumber: lineNum,
          content: change.newContent || '',
          type: 'added',
          indicator: '+'
        });
      } else if (change.type === 'modified') {
        unifiedLines.push({
          lineNumber: lineNum,
          content: change.oldContent || '',
          type: 'removed',
          indicator: '-'
        });
        unifiedLines.push({
          lineNumber: lineNum,
          content: change.newContent || '',
          type: 'added',
          indicator: '+'
        });
      }
    } else {
      // Unchanged line
      const line = oldLines[i] || newLines[i] || '';
      unifiedLines.push({
        lineNumber: lineNum,
        content: line,
        type: 'unchanged',
        indicator: ' '
      });
    }
  }

  const getLineStyle = (type: string) => {
    switch (type) {
      case 'added':
        return 'bg-green-50 text-green-900 border-l-4 border-green-500';
      case 'removed':
        return 'bg-red-50 text-red-900 border-l-4 border-red-500';
      case 'modified':
        return 'bg-yellow-50 text-yellow-900 border-l-4 border-yellow-500';
      default:
        return 'bg-white';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-700">
          Unified Diff: {diff.oldVersion.version} → {diff.newVersion.version}
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          {diff.summary.linesAdded} additions, {diff.summary.linesRemoved} deletions, {diff.summary.linesModified} modifications
        </p>
      </div>

      {/* Diff Content */}
      <div className="font-mono text-sm overflow-x-auto">
        {unifiedLines.map((line, idx) => (
          <div
            key={idx}
            className={`flex ${getLineStyle(line.type)}`}
          >
            <span className="inline-block w-12 text-right pr-2 text-gray-400 select-none flex-shrink-0">
              {line.type !== 'unchanged' ? line.lineNumber : ''}
            </span>
            <span className="inline-block w-8 text-center text-gray-600 select-none flex-shrink-0 font-bold">
              {line.indicator}
            </span>
            <span className="flex-1 px-2 py-1 whitespace-pre-wrap break-all">
              {line.content || ' '}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
