import { LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

/**
 * SignOutButton component
 * 
 * Features:
 * - Sign out with session cleanup
 * - Loading state during sign-out
 * 
 * Requirements: 2.9
 */
export function SignOutButton() {
  const { signOut, isLoading } = useAuthStore();

  return (
    <button
      onClick={signOut}
      disabled={isLoading}
      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
      aria-label="Sign out"
    >
      <LogOut className="w-4 h-4" />
      <span>{isLoading ? 'Signing out...' : 'Sign out'}</span>
    </button>
  );
}
