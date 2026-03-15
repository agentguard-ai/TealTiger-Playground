// DiffExportButton - Export policy diff as text or HTML
// Requirements: 4.10

import React, { useState } from 'react';
import { Download } from 'lucide-react';
import type { PolicyDiff } from '../../types/policy';
import { policyDiffService } from '../../services/PolicyDiffService';

interface DiffExportButtonProps {
  diff: PolicyDiff;
}

export const DiffExportButton: React.FC<DiffExportButtonProps> = ({ diff }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleExport = async (format: 'text' | 'html') => {
    setIsExporting(true);
    setShowMenu(false);

    try {
      let content: string;
      let filename: string;
      let mimeType: string;

      if (format === 'text') {
        content = await policyDiffService.exportUnifiedDiff(diff);
        filename = `policy-diff-${diff.oldVersion.version}-to-${diff.newVersion.version}.txt`;
        mimeType = 'text/plain';
      } else {
        content = await policyDiffService.exportHtmlDiff(diff);
        filename = `policy-diff-${diff.oldVersion.version}-to-${diff.newVersion.version}.html`;
        mimeType = 'text/html';
      }

      // Create blob and download
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export diff:', error);
      alert('Failed to export diff. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={isExporting}
        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Download className="w-4 h-4 mr-2" />
        {isExporting ? 'Exporting...' : 'Export Diff'}
      </button>

      {/* Export Menu */}
      {showMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
            <div className="py-1" role="menu">
              <button
                onClick={() => handleExport('text')}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                role="menuitem"
              >
                Export as Text (.txt)
              </button>
              <button
                onClick={() => handleExport('html')}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                role="menuitem"
              >
                Export as HTML (.html)
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
