import React, { useState, useEffect, useRef } from 'react';
import type { ComplianceFramework } from '../../types/compliance';

interface FrameworkSelectorProps {
  frameworks: ComplianceFramework[];
  selectedFrameworkId: string | null;
  onFrameworkChange: (frameworkId: string) => void;
  onUploadCustom?: () => void;
}

export const FrameworkSelector: React.FC<FrameworkSelectorProps> = ({
  frameworks,
  selectedFrameworkId,
  onFrameworkChange,
  onUploadCustom,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedFramework = frameworks.find((f) => f.id === selectedFrameworkId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors min-w-[240px]"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <svg
          className="w-5 h-5 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
        <span className="font-medium text-gray-900 flex-1 text-left">
          {selectedFramework?.name || 'Select Framework'}
        </span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 mt-2 w-full bg-white border border-gray-200 rounded-md shadow-lg z-50"
          role="listbox"
        >
          <div className="py-1 max-h-80 overflow-y-auto">
            {frameworks.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                No frameworks available
              </div>
            ) : (
              frameworks.map((framework) => (
                <button
                  key={framework.id}
                  onClick={() => {
                    onFrameworkChange(framework.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                    framework.id === selectedFrameworkId
                      ? 'bg-teal-50 text-teal-700 font-medium'
                      : 'text-gray-900'
                  }`}
                  role="option"
                  aria-selected={framework.id === selectedFrameworkId}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{framework.name}</div>
                      <div className="text-xs text-gray-500">
                        {framework.requirements.length} requirements · v{framework.version}
                      </div>
                    </div>
                    {framework.id === selectedFrameworkId && (
                      <svg
                        className="w-4 h-4 text-teal-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {onUploadCustom && (
            <div className="border-t border-gray-200">
              <button
                onClick={() => {
                  onUploadCustom();
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-teal-600 hover:bg-teal-50 transition-colors font-medium flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                Upload Custom Framework
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
