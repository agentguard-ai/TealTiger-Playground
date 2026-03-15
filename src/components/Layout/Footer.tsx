import React, { useState, useEffect } from 'react';

export const Footer: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <footer className="bg-white border-t border-gray-200 px-4 py-2">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-600">
        {/* Left side - SDK version and links */}
        <div className="flex items-center gap-4">
          <span className="font-medium">TealTiger SDK v0.2.2</span>
          <div className="flex items-center gap-3">
            <a
              href="https://docs.tealtiger.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-teal-600 transition-colors"
            >
              Documentation
            </a>
            <a
              href="https://github.com/tealtiger/tealtiger"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-teal-600 transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://github.com/tealtiger/tealtiger/blob/main/CHANGELOG.md"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-teal-600 transition-colors"
            >
              Changelog
            </a>
          </div>
        </div>

        {/* Right side - Status indicators */}
        <div className="flex items-center gap-4">
          {/* Privacy notice */}
          <div className="flex items-center gap-1.5 text-gray-500">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <span>No data transmitted</span>
          </div>

          {/* Online/Offline indicator */}
          <div className="flex items-center gap-1.5">
            <div
              className={`w-2 h-2 rounded-full ${
                isOnline ? 'bg-green-500' : 'bg-red-500'
              }`}
              aria-hidden="true"
            />
            <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
