import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { EnterpriseLayout } from './components/Layout/EnterpriseLayout';
import App from './App';

const TemplatesPage = lazy(() => import('./pages/TemplatesPage').then(m => ({ default: m.TemplatesPage })));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64 text-gray-500">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mr-3"></div>
      Loading...
    </div>
  );
}

export function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<EnterpriseLayout />}>
          <Route path="/" element={<App />} />
          <Route path="/templates" element={<Suspense fallback={<PageLoader />}><TemplatesPage /></Suspense>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
