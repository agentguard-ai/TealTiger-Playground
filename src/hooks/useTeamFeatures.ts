import { useAuthStore } from '@/store/authStore';
import { isSupabaseConfigured } from '@/lib/supabase';

/**
 * Hook to check if team features are available
 * 
 * Team features require:
 * 1. Supabase to be configured
 * 2. User to be authenticated
 * 
 * Requirements: 2.10
 */
export function useTeamFeatures() {
  const { isAuthenticated } = useAuthStore();

  const isAvailable = isSupabaseConfigured() && isAuthenticated;

  return {
    isAvailable,
    isConfigured: isSupabaseConfigured(),
    isAuthenticated,
  };
}
