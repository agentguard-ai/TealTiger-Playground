import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthenticationService } from '@/services/AuthenticationService';

// Mock fetch for syncOrganizations tests
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth: vi.fn().mockResolvedValue({ data: { provider: 'github', url: 'https://github.com/login' }, error: null }),
      getSession: vi.fn(),
      signOut: vi.fn(),
      refreshSession: vi.fn(),
    },
    from: vi.fn(() => ({
      upsert: vi.fn(() => ({ error: null })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({ data: null, error: null })),
        })),
      })),
    })),
  },
  isSupabaseConfigured: () => true,
}));

describe('AuthenticationService', () => {
  let authService: AuthenticationService;

  beforeEach(() => {
    authService = new AuthenticationService();
    vi.clearAllMocks();
  });

  describe('signInWithGitHub', () => {
    it('should initiate GitHub OAuth flow', async () => {
      const { supabase } = await import('@/lib/supabase');
      
      await authService.signInWithGitHub();

      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'github',
        options: {
          scopes: 'read:user user:email read:org',
          redirectTo: expect.stringContaining('/auth/callback'),
        },
      });
    });

    it('should throw error if sign-in fails', async () => {
      const { supabase } = await import('@/lib/supabase');
      vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValueOnce({
        data: { provider: 'github', url: null },
        error: { message: 'OAuth failed', name: 'OAuthError' } as any,
      });

      await expect(authService.signInWithGitHub()).rejects.toThrow('OAuth failed');
    });
  });

  describe('handleCallback', () => {
    it('should create user profile after OAuth callback', async () => {
      const { supabase } = await import('@/lib/supabase');
      
      const mockSession = {
        access_token: 'test-token',
        refresh_token: 'refresh-token',
        expires_at: Date.now() + 3600000,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          user_metadata: {
            user_name: 'testuser',
            avatar_url: 'https://github.com/testuser.png',
          },
        },
      };

      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });

      const user = await authService.handleCallback();

      expect(user).toEqual({
        id: 'user-123',
        githubId: 'testuser',
        username: 'testuser',
        email: 'test@example.com',
        avatarUrl: 'https://github.com/testuser.png',
        organizations: [],
      });
    });

    it('should throw error if no session after callback', async () => {
      const { supabase } = await import('@/lib/supabase');
      
      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      await expect(authService.handleCallback()).rejects.toThrow('No session found');
    });
  });

  describe('signOut', () => {
    it('should sign out user and clear session', async () => {
      const { supabase } = await import('@/lib/supabase');
      vi.mocked(supabase.auth.signOut).mockResolvedValueOnce({
        error: null,
      } as any);

      await authService.signOut();

      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it('should throw error if sign-out fails', async () => {
      const { supabase } = await import('@/lib/supabase');
      vi.mocked(supabase.auth.signOut).mockResolvedValueOnce({
        error: { message: 'Sign out failed', name: 'SignOutError' } as any,
      });

      await expect(authService.signOut()).rejects.toThrow('Sign out failed');
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user if authenticated', async () => {
      const { supabase } = await import('@/lib/supabase');
      
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          user_metadata: {
            user_name: 'testuser',
            avatar_url: 'https://github.com/testuser.png',
          },
        },
      };

      const mockUserProfile = {
        id: 'user-123',
        github_id: 'testuser',
        username: 'testuser',
        email: 'test@example.com',
        avatar_url: 'https://github.com/testuser.png',
        created_at: new Date().toISOString(),
        last_seen: new Date().toISOString(),
      };

      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      } as any);

      // Mock the database query chain
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockUserProfile,
            error: null,
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: mockSelect,
      } as any);

      const user = await authService.getCurrentUser();

      expect(user).toBeTruthy();
      expect(user?.username).toBe('testuser');
    });

    it('should return null if not authenticated', async () => {
      const { supabase } = await import('@/lib/supabase');
      
      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: null },
        error: null,
      } as any);

      const user = await authService.getCurrentUser();

      expect(user).toBeNull();
    });

    it('should return basic user info from session if profile fetch fails', async () => {
      const { supabase } = await import('@/lib/supabase');

      const mockSession = {
        user: {
          id: 'user-456',
          email: 'fallback@example.com',
          user_metadata: {
            user_name: 'fallbackuser',
            avatar_url: 'https://github.com/fallbackuser.png',
          },
        },
      };

      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      } as any);

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Not found' },
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: mockSelect,
      } as any);

      const user = await authService.getCurrentUser();

      expect(user).toBeTruthy();
      expect(user?.id).toBe('user-456');
      expect(user?.username).toBe('fallbackuser');
      expect(user?.email).toBe('fallback@example.com');
    });
  });

  describe('syncOrganizations', () => {
    it('should fetch and log GitHub organizations when provider token exists', async () => {
      const { supabase } = await import('@/lib/supabase');

      const mockOrgs = [
        { id: 'org-1', login: 'test-org', avatarUrl: 'https://github.com/org.png', role: 'member' },
      ];

      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: {
          session: {
            provider_token: 'gh-token-123',
            user: { id: 'user-123' },
          },
        },
        error: null,
      } as any);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrgs,
      });

      await authService.syncOrganizations('user-123');

      expect(mockFetch).toHaveBeenCalledWith('https://api.github.com/user/orgs', {
        headers: {
          'Authorization': 'Bearer gh-token-123',
          'Accept': 'application/vnd.github.v3+json',
        },
      });
    });

    it('should return early if no session exists', async () => {
      const { supabase } = await import('@/lib/supabase');

      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: null },
        error: null,
      } as any);

      await authService.syncOrganizations('user-123');

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return early if no provider token exists', async () => {
      const { supabase } = await import('@/lib/supabase');

      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: {
          session: {
            provider_token: null,
            user: { id: 'user-123' },
          },
        },
        error: null,
      } as any);

      await authService.syncOrganizations('user-123');

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle GitHub API failure gracefully', async () => {
      const { supabase } = await import('@/lib/supabase');

      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: {
          session: {
            provider_token: 'gh-token-123',
            user: { id: 'user-123' },
          },
        },
        error: null,
      } as any);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Forbidden',
      });

      // Should not throw
      await expect(authService.syncOrganizations('user-123')).resolves.toBeUndefined();
    });

    it('should handle fetch network error gracefully', async () => {
      const { supabase } = await import('@/lib/supabase');

      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: {
          session: {
            provider_token: 'gh-token-123',
            user: { id: 'user-123' },
          },
        },
        error: null,
      } as any);

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // Should not throw - background operation
      await expect(authService.syncOrganizations('user-123')).resolves.toBeUndefined();
    });
  });

  describe('handleCallback - edge cases', () => {
    it('should handle user profile upsert failure gracefully and still return user', async () => {
      const { supabase } = await import('@/lib/supabase');

      const mockSession = {
        access_token: 'test-token',
        refresh_token: 'refresh-token',
        expires_at: Date.now() + 3600000,
        user: {
          id: 'user-789',
          email: 'upsert-fail@example.com',
          user_metadata: {
            user_name: 'upsertfailuser',
            avatar_url: 'https://github.com/upsertfailuser.png',
          },
        },
      };

      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });

      // Mock upsert to fail
      vi.mocked(supabase.from).mockReturnValueOnce({
        upsert: vi.fn().mockResolvedValue({ error: { message: 'DB error' } }),
      } as any);

      const user = await authService.handleCallback();

      // Should still return user even if upsert fails
      expect(user).toBeTruthy();
      expect(user.id).toBe('user-789');
      expect(user.username).toBe('upsertfailuser');
    });

    it('should use fallback fields when user_metadata has alternative field names', async () => {
      const { supabase } = await import('@/lib/supabase');

      const mockSession = {
        access_token: 'test-token',
        refresh_token: 'refresh-token',
        expires_at: Date.now() + 3600000,
        user: {
          id: 'user-alt',
          email: 'alt@example.com',
          user_metadata: {
            preferred_username: 'altuser',
            name: 'Alt User',
            avatar_url: 'https://github.com/altuser.png',
          },
        },
      };

      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValueOnce({
        upsert: vi.fn().mockResolvedValue({ error: null }),
      } as any);

      const user = await authService.handleCallback();

      expect(user.githubId).toBe('altuser');
      expect(user.username).toBe('altuser');
    });
  });
});
