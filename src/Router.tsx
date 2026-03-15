import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import { AuthCallback } from './pages/AuthCallback';

/**
 * Router component for the playground
 * 
 * Routes:
 * - / - Main playground
 * - /auth/callback - OAuth callback handler
 */
export function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
      </Routes>
    </BrowserRouter>
  );
}
