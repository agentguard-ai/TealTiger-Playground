import { create } from 'zustand';
import type { AuthUser, Session } from '@/types/auth';
import { authService } from '@/services/AuthenticationService';
import { sessionManager } from '@/services/SessionManager';

interface AuthStore {
  // State
  user: AuthUser | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  restoreSession: () => Promise<void>;
  clearError: () => void;
  setUser: (user: AuthUser | null) => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  // Initial state
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // Actions
  signIn: async () => {
    set({ isLoading: true, error: null });
    try {
      await authService.signInWithGitHub();
      // User will be redirected to GitHub, so no need to update state here
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign in';
      set({ error: errorMessage, isLoading: false });
    }
  },

  signOut: async () => {
    set({ isLoading: true, error: null });
    try {
      await authService.signOut();
      await sessionManager.clearSession();
      set({ 
        user: null, 
        session: null, 
        isAuthenticated: false, 
        isLoading: false 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign out';
      set({ error: errorMessage, isLoading: false });
    }
  },

  restoreSession: async () => {
    set({ isLoading: true, error: null });
    try {
      const session = await sessionManager.restoreSession();
      
      if (session) {
        const user = await authService.getCurrentUser();
        set({ 
          user, 
          session, 
          isAuthenticated: !!user, 
          isLoading: false 
        });

        // Set up auto-refresh
        if (session) {
          sessionManager.setupAutoRefresh(session);
        }
      } else {
        set({ 
          user: null, 
          session: null, 
          isAuthenticated: false, 
          isLoading: false 
        });
      }
    } catch (error) {
      console.error('Failed to restore session:', error);
      set({ 
        user: null, 
        session: null, 
        isAuthenticated: false, 
        isLoading: false 
      });
    }
  },

  clearError: () => set({ error: null }),

  setUser: (user) => set({ 
    user, 
    isAuthenticated: !!user 
  }),
}));
