// OfflineIndicator - Show connection status
// Requirements: 27.6, 27.7

import React, { useEffect, useState } from 'react';

interface OfflineIndicatorProps {
  isOnline?: boolean;
  queuedChanges?: number;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  isOnline: propIsOnline,
  queuedChanges = 0,
}) => {
  const [isOnline, setIsOnline] = useState(
    propIsOnline !== undefined ? propIsOnline : navigator.onLine
  );
  const [showReconnecting, setShowReconnecting] = useState(false);

  useEffect(() => {
    if (propIsOnline !== undefined) {
      setIsOnline(propIsOnline);
      return;
    }

    const handleOnline = () => {
      setShowReconnecting(true);
      setTimeout(() => {
        setIsOnline(true);
        setShowReconnecting(false);
      }, 1000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnecting(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [propIsOnline]);

  if (isOnline && !showReconnecting) {
    return null; // Don't show anything when online
  }

  return (
    <div
      className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg flex items-center gap-3 transition-all duration-300 ${
        showReconnecting
          ? 'bg-green-500 text-white'
          : 'bg-yellow-500 text-gray-900'
      }`}
      role="alert"
      aria-live="polite"
    >
      {showReconnecting ? (
        <>
          <svg
            className="w-5 h-5 animate-spin"
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
          <span className="font-medium">Reconnecting...</span>
        </>
      ) : (
        <>
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
            />
          </svg>
          <div className="flex flex-col">
            <span className="font-medium">You're offline</span>
            {queuedChanges > 0 && (
              <span className="text-xs">
                {queuedChanges} change{queuedChanges > 1 ? 's' : ''} queued for sync
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
};
