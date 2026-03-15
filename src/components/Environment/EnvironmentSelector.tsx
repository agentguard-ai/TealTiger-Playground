import React, { useState, useEffect, useRef } from 'react';
import type { DeploymentEnvironment, EnvironmentName } from '../../types/environment';
import { ENVIRONMENT_COLORS, ENVIRONMENT_LABELS } from '../../types/environment';

interface EnvironmentSelectorProps {
  environments: DeploymentEnvironment[];
  currentEnvironmentId: string | null;
  onEnvironmentChange: (environmentId: string) => void;
}

export const EnvironmentSelector: React.FC<EnvironmentSelectorProps> = ({
  environments,
  currentEnvironmentId,
  onEnvironmentChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentEnvironment = environments.find((e) => e.id === currentEnvironmentId);

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

  const getEnvironmentColor = (name: EnvironmentName) => {
    const colorMap = {
      development: 'bg-blue-100 text-blue-700 border-blue-300',
      staging: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      production: 'bg-red-100 text-red-700 border-red-300',
    };
    return colorMap[name];
  };

  const getEnvironmentDotColor = (name: EnvironmentName) => {
    const colorMap = {
      development: 'bg-blue-500',
      staging: 'bg-yellow-500',
      production: 'bg-red-500',
    };
    return colorMap[name];
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 border rounded-md hover:opacity-80 transition-all ${
          currentEnvironment
            ? getEnvironmentColor(currentEnvironment.name)
            : 'bg-white border-gray-300 text-gray-900'
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {currentEnvironment && (
          <span
            className={`w-2 h-2 rounded-full ${getEnvironmentDotColor(
              currentEnvironment.name
            )}`}
          />
        )}
        <span className="font-medium">
          {currentEnvironment
            ? ENVIRONMENT_LABELS[currentEnvironment.name]
            : 'Select Environment'}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 mt-2 w-56 bg-white border border-gray-200 rounded-md shadow-lg z-50"
          role="listbox"
        >
          <div className="py-1">
            {environments.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                No environments configured
              </div>
            ) : (
              environments.map((environment) => (
                <button
                  key={environment.id}
                  onClick={() => {
                    onEnvironmentChange(environment.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                    environment.id === currentEnvironmentId ? 'bg-gray-50' : ''
                  }`}
                  role="option"
                  aria-selected={environment.id === currentEnvironmentId}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${getEnvironmentDotColor(
                        environment.name
                      )}`}
                    />
                    <span className="font-medium">{ENVIRONMENT_LABELS[environment.name]}</span>
                    {environment.id === currentEnvironmentId && (
                      <svg
                        className="w-4 h-4 text-teal-600 ml-auto"
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
                  <div className="text-xs text-gray-500 mt-1">
                    {environment.deployedPolicies.filter((p) => p.status === 'active').length}{' '}
                    active policies
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
