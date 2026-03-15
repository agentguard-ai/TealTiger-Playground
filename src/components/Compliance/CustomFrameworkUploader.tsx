import React, { useState, useRef } from 'react';
import type { ComplianceFramework } from '../../types/compliance';

interface CustomFrameworkUploaderProps {
  onUpload: (framework: ComplianceFramework) => Promise<void>;
  onClose: () => void;
}

export const CustomFrameworkUploader: React.FC<CustomFrameworkUploaderProps> = ({
  onUpload,
  onClose,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ComplianceFramework | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setPreview(null);

    try {
      const text = await file.text();
      const framework = JSON.parse(text) as ComplianceFramework;

      // Validate structure
      if (!framework.id || !framework.name || !framework.version) {
        throw new Error('Invalid framework: missing id, name, or version');
      }

      if (!Array.isArray(framework.requirements) || framework.requirements.length === 0) {
        throw new Error('Invalid framework: requirements must be a non-empty array');
      }

      // Validate requirements
      for (const req of framework.requirements) {
        if (!req.id || !req.code || !req.title || !req.description || !req.category) {
          throw new Error('Invalid requirement: missing required fields');
        }
      }

      setPreview(framework);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse framework file');
    }
  };

  const handleUpload = async () => {
    if (!preview) return;

    setIsUploading(true);
    setError(null);

    try {
      await onUpload(preview);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload framework');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Upload Custom Framework</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Framework JSON File
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
            />
            <p className="mt-2 text-sm text-gray-500">
              Upload a JSON file containing your custom compliance framework definition
            </p>
          </div>

          {preview && (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h3 className="font-medium text-gray-900 mb-3">Framework Preview</h3>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="font-medium text-gray-700">ID:</dt>
                  <dd className="text-gray-900">{preview.id}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-700">Name:</dt>
                  <dd className="text-gray-900">{preview.name}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-700">Version:</dt>
                  <dd className="text-gray-900">{preview.version}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-700">Requirements:</dt>
                  <dd className="text-gray-900">{preview.requirements.length} requirements</dd>
                </div>
              </dl>
            </div>
          )}

          <div className="mt-6 flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={isUploading}
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!preview || isUploading}
              className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isUploading ? 'Uploading...' : 'Upload Framework'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
