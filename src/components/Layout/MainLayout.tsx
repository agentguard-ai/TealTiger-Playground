import React, { useState } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';

interface MainLayoutProps {
  sidebar: React.ReactNode;
  editor: React.ReactNode;
  results: React.ReactNode;
  onShare: () => void;
  onExport: () => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  sidebar,
  editor,
  results,
  onShare,
  onExport,
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <Header
        onShare={onShare}
        onExport={onExport}
        onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        isMobileMenuOpen={isSidebarOpen}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Examples and Scenarios */}
        <aside
          className={`
            w-full md:w-80 lg:w-96 bg-white border-r border-gray-200 overflow-y-auto
            ${isSidebarOpen ? 'block' : 'hidden'} md:block
            absolute md:relative inset-0 z-40 md:z-0
          `}
        >
          {/* Mobile overlay */}
          {isSidebarOpen && (
            <div
              className="md:hidden fixed inset-0 bg-black bg-opacity-50 -z-10"
              onClick={() => setIsSidebarOpen(false)}
              aria-hidden="true"
            />
          )}
          
          <div className="p-4">
            {sidebar}
          </div>
        </aside>

        {/* Editor and Results - Two column on desktop, stacked on mobile */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Editor */}
          <div className="flex-1 flex flex-col bg-white border-b lg:border-b-0 lg:border-r border-gray-200 overflow-hidden">
            <div className="flex-1 overflow-hidden">
              {editor}
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden">
            <div className="flex-1 overflow-hidden">
              {results}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};
