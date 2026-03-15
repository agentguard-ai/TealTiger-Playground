import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { EnterpriseLayout } from './components/Layout/EnterpriseLayout';
import App from './App';
import { AuthCallback } from './pages/AuthCallback';

// Lazy-load enterprise pages
const PoliciesPage = lazy(() => import('./pages/PoliciesPage').then(m => ({ default: m.PoliciesPage })));
const TemplatesPage = lazy(() => import('./pages/TemplatesPage').then(m => ({ default: m.TemplatesPage })));
const GovernancePage = lazy(() => import('./pages/GovernancePage').then(m => ({ default: m.GovernancePage })));
const ImpactPage = lazy(() => import('./pages/ImpactPage').then(m => ({ default: m.ImpactPage })));
const EnvironmentsPage = lazy(() => import('./pages/EnvironmentsPage').then(m => ({ default: m.EnvironmentsPage })));
const CompliancePage = lazy(() => import('./pages/CompliancePage').then(m => ({ default: m.CompliancePage })));
const ComplianceReportsPage = lazy(() => import('./pages/ComplianceReportsPage').then(m => ({ default: m.ComplianceReportsPage })));
const AuditPage = lazy(() => import('./pages/AuditPage').then(m => ({ default: m.AuditPage })));
const WorkspacesPage = lazy(() => import('./pages/WorkspacesPage').then(m => ({ default: m.WorkspacesPage })));
const RBACPage = lazy(() => import('./pages/RBACPage').then(m => ({ default: m.RBACPage })));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const CICDPage = lazy(() => import('./pages/CICDPage').then(m => ({ default: m.CICDPage })));
const SharingPage = lazy(() => import('./pages/SharingPage').then(m => ({ default: m.SharingPage })));

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
        {/* Auth callback - standalone */}
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Enterprise layout wraps all main routes */}
        <Route element={<EnterpriseLayout />}>
          <Route path="/" element={<App />} />
          <Route path="/policies" element={<Suspense fallback={<PageLoader />}><PoliciesPage /></Suspense>} />
          <Route path="/templates" element={<Suspense fallback={<PageLoader />}><TemplatesPage /></Suspense>} />
          <Route path="/governance" element={<Suspense fallback={<PageLoader />}><GovernancePage /></Suspense>} />
          <Route path="/impact" element={<Suspense fallback={<PageLoader />}><ImpactPage /></Suspense>} />
          <Route path="/environments" element={<Suspense fallback={<PageLoader />}><EnvironmentsPage /></Suspense>} />
          <Route path="/compliance" element={<Suspense fallback={<PageLoader />}><CompliancePage /></Suspense>} />
          <Route path="/compliance/reports" element={<Suspense fallback={<PageLoader />}><ComplianceReportsPage /></Suspense>} />
          <Route path="/audit" element={<Suspense fallback={<PageLoader />}><AuditPage /></Suspense>} />
          <Route path="/workspaces" element={<Suspense fallback={<PageLoader />}><WorkspacesPage /></Suspense>} />
          <Route path="/rbac" element={<Suspense fallback={<PageLoader />}><RBACPage /></Suspense>} />
          <Route path="/analytics" element={<Suspense fallback={<PageLoader />}><AnalyticsPage /></Suspense>} />
          <Route path="/cicd" element={<Suspense fallback={<PageLoader />}><CICDPage /></Suspense>} />
          <Route path="/sharing" element={<Suspense fallback={<PageLoader />}><SharingPage /></Suspense>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
