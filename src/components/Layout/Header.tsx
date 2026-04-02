import React, { useEffect } from 'react';
import { ExportDropdown } from '../Export/ExportDropdown';
import { useAuthStore } from '@/store/authStore';
import { usePlaygroundStore } from '@/store/playgroundStore';

interface HeaderProps {
  onShare: () => void;
  onExport: () => void;
  onMenuToggle?: () => void;
  isMobileMenuOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onShare,
  onMenuToggle,
  isMobileMenuOpen = false,
}) => {
  const { restoreSession } = useAuthStore();
  const { policyCode } = usePlaygroundStore();

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  return (
    <header className="bg-white border-b border-gray-200/80 sticky top-0 z-50">
      <div className="flex items-center justify-between px-4 h-12">
        {/* Left: mobile menu + breadcrumb */}
        <div className="flex items-center gap-3">
          {onMenuToggle && (
            <button
              onClick={onMenuToggle}
              className="md:hidden p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              aria-label="Toggle menu"
              aria-expanded={isMobileMenuOpen}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          )}
          <span className="text-sm text-gray-500 font-medium">Policy Editor</span>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1.5">
          <ExportDropdown policyCode={policyCode} />

          <button
            onClick={onShare}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share
          </button>

          <a
            href="https://docs.tealtiger.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Docs
          </a>
        </div>
      </div>
    </header>
  );
};
