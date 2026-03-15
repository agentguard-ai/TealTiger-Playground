// DownloadWorkflowButton - Downloads generated YAML as a file
// Requirements: 15.1

import React, { useCallback } from 'react';

interface DownloadWorkflowButtonProps {
  yaml: string;
  filename: string;
}

export const DownloadWorkflowButton: React.FC<DownloadWorkflowButtonProps> = ({
  yaml,
  filename,
}) => {
  const handleDownload = useCallback(() => {
    const blob = new Blob([yaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [yaml, filename]);

  return (
    <button
      onClick={handleDownload}
      className="flex items-center gap-1.5 px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
      title={`Download ${filename}`}
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      Download
    </button>
  );
};
