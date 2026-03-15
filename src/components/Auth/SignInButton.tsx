import { Github } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { isSupabaseConfigured } from '@/lib/supabase';

/**
 * SignInButton component for GitHub OAuth authentication
 * 
 * Features:
 * - GitHub branding with icon
 * - Loading state during sign-in
 * - Disabled when Supabase is not configured
 * 
 * Requirements: 2.1, 2.3
 */
export function SignInButton() {
  const { signIn, isLoading } = useAuthStore();

  if (!isSupabaseConfigured()) {
    return null; // Don't show button if Supabase is not configured
  }

  return (
    <button
      onClick={signIn}
      disabled={isLoading}
      className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      aria-label="Sign in with GitHub"
    >
      <Github className="w-5 h-5" />
      <span>{isLoading ? 'Signing in...' : 'Sign in with GitHub'}</span>
    </button>
  );
}
