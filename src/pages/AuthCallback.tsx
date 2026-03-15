import { useEffect, useState } from 'react';
import { authService } from '@/services/AuthenticationService';
import { sessionManager } from '@/services/SessionManager';
import { useAuthStore } from '@/store/authStore';

/**
 * AuthCallback page handles OAuth callback from GitHub
 * 
 * Features:
 * - Handles OAuth callback after GitHub redirect
 * - Creates user profile
 * - Persists session
 * - Redirects to playground root
 * 
 * Requirements: 2.3, 2.8
 */
export function AuthCallback() {
  const { setUser } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const user = await authService.handleCallback();
        const session = await sessionManager.restoreSession();
        
        if (session) {
          await sessionManager.persistSession(session);
          sessionManager.setupAutoRefresh(session);
        }
        
        setUser(user);
        
        // Redirect to playground root
        window.location.replace('/');
      } catch (err) {
        console.error('OAuth callback error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
      }
    };

    handleCallback();
  }, [setUser]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <p className="text-red-600 mb-4">{error}</p>
          <a href="/" className="text-blue-600 hover:underline">
            Return to playground
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4" />
        <p className="text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
}
