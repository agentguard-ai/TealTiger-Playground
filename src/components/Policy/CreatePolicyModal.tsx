// CreatePolicyModal - Create new policy
// Requirements: 3.1, 3.4, 3.10

import React, { useState } from 'react';
import { PolicyMetadata } from '../../types/policy';
import { policyRegistryService } from '../../services/PolicyRegistryService';
import {
  validatePolicyName,
  validatePolicyCode,
  validatePolicyMetadata,
  createDefaultMetadata
} from '../../utils/policyValidation';
import { PolicyMetadataEditor } from './PolicyMetadataEditor';

interface CreatePolicyModalProps {
  workspaceId: string;
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (policyId: string) => void;
}

export const CreatePolicyModal: React.FC<CreatePolicyModalProps> = ({
  workspaceId,
  userId,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [code, setCode] = useState('// Write your policy code here\n\nexport default async function policy(context) {\n  // Your policy logic\n  return { allow: true };\n}');
  const [metadata, setMetadata] = useState<PolicyMetadata>(createDefaultMetadata());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    const errors: string[] = [];
    
    const nameValidation = validatePolicyName(name);
    if (!nameValidation.valid) {
      errors.push(...nameValidation.errors);
    }

    const codeValidation = validatePolicyCode(code);
    if (!codeValidation.valid) {
      errors.push(...codeValidation.errors);
    }

    const metadataValidation = validatePolicyMetadata(metadata);
    if (!metadataValidation.valid) {
      errors.push(...metadataValidation.errors);
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setValidationErrors([]);

      const policy = await policyRegistryService.createPolicy({
        workspaceId,
        name,
        description,
        code,
        metadata,
        userId
      });

      onSuccess(policy.id);
      handleClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setCode('// Write your policy code here\n\nexport default async function policy(context) {\n  // Your policy logic\n  return { allow: true };\n}');
    setMetadata(createDefaultMetadata());
    setError(null);
    setValidationErrors([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={handleClose}
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="bg-white px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Create New Policy
                </h3>
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="bg-white px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Error Messages */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {validationErrors.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-yellow-800 mb-2">Validation Errors:</p>
                  <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                    {validationErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Policy Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Policy Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., PII Detection Policy"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Must be unique within the workspace (3-100 characters)
                </p>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this policy does..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              {/* Policy Code */}
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                  Policy Code *
                </label>
                <textarea
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              {/* Metadata Editor */}
              <PolicyMetadataEditor
                metadata={metadata}
                onChange={setMetadata}
              />
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2"
              >
                {loading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                {loading ? 'Creating...' : 'Create Policy'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
