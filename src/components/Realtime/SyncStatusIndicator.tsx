// SyncStatusIndicator - Show sync progress
// Requirements: 27.8, 27.9

import React from 'react';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

interface SyncStatusIndicatorProps {
  status: SyncStatus;
  message?: string;
  progress?: number; // 0-100
  onRetry?: () => void;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  status,
  message,
  progress,
  onRetry,
}) => {
  if (status === 'idle') {
    return null;
  }

  const getStatusConfig = () => {
    switch (status) {
      case 'syncing':
        return {
          icon: (
            <svg
              className="w-4 h-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ),
          color: 'bg-blue-500',
          textColor: 'text-blue-700 dark:text-blue-300',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          defaultMessage: 'Syncing changes...',
        };
      case 'success':
        return {
          icon: (
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          ),
          color: 'bg-green-500',
          textColor: 'text-green-700 dark:text-green-300',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          defaultMessage: 'All changes synced',
        };
      case 'error':
        return {
          icon: (
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ),
          color: 'bg-red-500',
          textColor: 'text-red-700 dark:text-red-300',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          defaultMessage: 'Sync failed',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 ${config.bgColor} rounded-lg shadow-lg p-3 max-w-sm transition-all duration-300`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className={`${config.textColor} flex-shrink-0 mt-0.5`}>
          {config.icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${config.textColor}`}>
            {message || config.defaultMessage}
          </p>
          
          {progress !== undefined && status === 'syncing' && (
            <div className="mt-2">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div
                  className={`${config.color} h-1.5 rounded-full transition-all duration-300`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {progress}% complete
              </p>
            </div>
          )}
          
          {status === 'error' && onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 underline"
            >
              Retry sync
            </button>
          )}
        </div>
        
        {status === 'success' && (
          <div className={`w-2 h-2 ${config.color} rounded-full flex-shrink-0 mt-1.5`} />
        )}
      </div>
    </div>
  );
};

interface SyncStatusBadgeProps {
  status: SyncStatus;
  compact?: boolean;
}

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({
  status,
  compact = false,
}) => {
  if (status === 'idle') {
    return null;
  }

  const getStatusConfig = () => {
    switch (status) {
      case 'syncing':
        return {
          label: 'Syncing',
          color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
          icon: '⟳',
        };
      case 'success':
        return {
          label: 'Synced',
          color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
          icon: '✓',
        };
      case 'error':
        return {
          label: 'Error',
          color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
          icon: '⚠',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${config.color}`}
    >
      <span className={status === 'syncing' ? 'animate-spin' : ''}>
        {config.icon}
      </span>
      {!compact && <span>{config.label}</span>}
    </span>
  );
};
