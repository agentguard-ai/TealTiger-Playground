import React, { useState, useRef } from 'react';
import type { TestScenario } from '../../types';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenarios: TestScenario[];
  onImport: (scenarios: TestScenario[]) => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  scenarios,
  onImport,
}) => {
  const [mode, setMode] = useState<'import' | 'export'>('export');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const json = JSON.stringify(scenarios, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tealtiger-scenarios-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);

        // Validate structure
        if (!Array.isArray(parsed)) {
          throw new Error('Invalid format: expected array of scenarios');
        }

        // Validate each scenario
        for (const scenario of parsed) {
          if (!scenario.name || !scenario.prompt || !scenario.provider || !scenario.model) {
            throw new Error('Invalid scenario: missing required fields');
          }
        }

        onImport(parsed);
        setImportSuccess(true);
        setImportError(null);
        setTimeout(() => {
          setImportSuccess(false);
          onClose();
        }, 1500);
      } catch (error) {
        setImportError(error instanceof Error ? error.message : 'Failed to parse JSON');
        setImportSuccess(false);
      }
    };

    reader.onerror = () => {
      setImportError('Failed to read file');
      setImportSuccess(false);
    };

    reader.readAsText(file);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-export-title"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 id="import-export-title" className="text-xl font-semibold text-gray-900">
            Import / Export Scenarios
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Save or load test scenarios as JSON files
          </p>
        </div>

        {/* Mode Selector */}
        <div className="px-6 pt-4">
          <div className="flex gap-2 border-b border-gray-200">
            <button
              onClick={() => {
                setMode('export');
                setImportError(null);
                setImportSuccess(false);
              }}
              className={`px-4 py-2 font-medium transition-colors ${
                mode === 'export'
                  ? 'text-teal-600 border-b-2 border-teal-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Export
            </button>
            <button
              onClick={() => {
                setMode('import');
                setImportError(null);
                setImportSuccess(false);
              }}
              className={`px-4 py-2 font-medium transition-colors ${
                mode === 'import'
                  ? 'text-teal-600 border-b-2 border-teal-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Import
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {mode === 'export' ? (
            <div className="space-y-4">
              {/* Export Preview */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Export Preview
                </label>
                <div className="bg-gray-50 border border-gray-300 rounded-md p-4 max-h-64 overflow-y-auto">
                  <pre className="text-xs text-gray-700 font-mono">
                    {JSON.stringify(scenarios, null, 2)}
                  </pre>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {scenarios.length} scenario{scenarios.length !== 1 ? 's' : ''} will be exported
                </p>
              </div>

              {/* Export Button */}
              <button
                onClick={handleExport}
                disabled={scenarios.length === 0}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download JSON File
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Import Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <svg
                    className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="text-sm text-blue-900">
                    <p className="font-medium mb-1">Import Format</p>
                    <p>
                      Upload a JSON file containing an array of test scenarios. Each scenario must
                      have name, prompt, provider, and model fields.
                    </p>
                  </div>
                </div>
              </div>

              {/* File Upload */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-md hover:border-teal-500 hover:bg-teal-50 transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <span className="text-gray-700">Choose JSON File</span>
                </button>
              </div>

              {/* Success Message */}
              {importSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <svg
                      className="w-5 h-5 text-green-600 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="text-sm text-green-900 font-medium">
                      Scenarios imported successfully!
                    </p>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {importError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <svg
                      className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div>
                      <p className="text-sm text-red-900 font-medium">Import Failed</p>
                      <p className="text-sm text-red-800 mt-1">{importError}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
