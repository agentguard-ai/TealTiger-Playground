import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SessionManager } from '@/services/SessionManager';
import type { Session, AuthUser } from '@/types/auth';

// Track isSupabaseConfigured state
let mockIsConfigured = true;

const mockGetSession = vi.fn();
const mockRefreshSession = vi.fn();

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      get getSession() { return mockGetSession; },
      get refreshSession() { return mockRefreshSession; },
    },
  },
  isSupabaseConfigured: () => mockIsConfigured,
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get _store() { return store; },
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

const SESSION_STORAGE_KEY = 'tealtiger-auth-session';

function createMockUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 'user-123',
    githubId: 'testuser',
    username: 'testuser',
    email: 'test@example.com',
    avatarUrl: 'https://github.com/testuser.png',
    organizations: [],
    ...overrides,
  };
}

function createMockSession(overrides: Partial<Session> = {}): Session {
  return {
    accessToken: 'access-token-123',
    refreshToken: 'refresh-token-456',
    expiresAt: Date.now() + 3600000,
    user: createMockUser(),
    ...overrides,
  };
}

describe('SessionManager', () => {
  let sessionManager: SessionManager;

  beforeEach(() => {
    sessionManager = new SessionManager();
    mockGetSession.mockReset();
    mockRefreshSession.mockReset();
    localStorageMock.clear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    mockIsConfigured = true;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('persistSession', () => {
    it('should store session in localStorage', async () => {
      const session = createMockSession();

      await sessionManager.persistSession(session);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        SESSION_STORAGE_KEY,
        expect.any(String),
      );

      const stored = JSON.parse(localStorageMock._store[SESSION_STORAGE_KEY]);
      expect(stored.accessToken).toBe('access-token-123');
      expect(stored.refreshToken).toBe('refresh-token-456');
      expect(stored.user.username).toBe('testuser');
      expect(stored.persistedAt).toBeDefined();
    });

    it('should not throw if localStorage fails', async () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Storage full');
      });

      const session = createMockSession();
      await expect(sessionManager.persistSession(session)).resolves.toBeUndefined();
    });
  });

  describe('isSessionValid', () => {
    it('should return true for a session expiring in the future', () => {
      const session = createMockSession({ expiresAt: Date.now() + 3600000 });
      expect(sessionManager.isSessionValid(session)).toBe(true);
    });

    it('should return false for an expired session', () => {
      const session = createMockSession({ expiresAt: Date.now() - 1000 });
      expect(sessionManager.isSessionValid(session)).toBe(false);
    });

    it('should return false for a session within the 5-minute buffer', () => {
      const session = createMockSession({ expiresAt: Date.now() + 2 * 60 * 1000 });
      expect(sessionManager.isSessionValid(session)).toBe(false);
    });

    it('should return false for null/undefined session', () => {
      expect(sessionManager.isSessionValid(null as any)).toBe(false);
      expect(sessionManager.isSessionValid(undefined as any)).toBe(false);
    });

    it('should return false for session without expiresAt', () => {
      const session = createMockSession({ expiresAt: undefined as any });
      expect(sessionManager.isSessionValid(session)).toBe(false);
    });
  });

  describe('clearSession', () => {
    it('should remove session from localStorage', async () => {
      localStorageMock._store[SESSION_STORAGE_KEY] = 'some-data';

      await sessionManager.clearSession();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(SESSION_STORAGE_KEY);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('supabase.auth.token');
    });

    it('should not throw if localStorage removal fails', async () => {
      localStorageMock.removeItem.mockImplementationOnce(() => {
        throw new Error('Storage error');
      });

      await expect(sessionManager.clearSession()).resolves.toBeUndefined();
    });
  });

  describe('restoreSession', () => {
    it('should restore session from Supabase if available', async () => {
      const mockSupabaseSession = {
        access_token: 'supabase-access',
        refresh_token: 'supabase-refresh',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          user_metadata: {
            user_name: 'testuser',
            avatar_url: 'https://github.com/testuser.png',
          },
        },
      };

      mockGetSession.mockResolvedValueOnce({
        data: { session: mockSupabaseSession },
        error: null,
      });

      const session = await sessionManager.restoreSession();

      expect(session).toBeTruthy();
      expect(session?.accessToken).toBe('supabase-access');
      expect(session?.user.username).toBe('testuser');
    });

    it('should return null if no Supabase session and no localStorage session', async () => {
      mockGetSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      const session = await sessionManager.restoreSession();
      expect(session).toBeNull();
    });

    it('should fallback to localStorage when Supabase has no session', async () => {
      mockGetSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      const storedSession = createMockSession();
      localStorageMock._store[SESSION_STORAGE_KEY] = JSON.stringify(storedSession);

      const session = await sessionManager.restoreSession();

      expect(session).toBeTruthy();
      expect(session?.accessToken).toBe('access-token-123');
    });

    it('should return null when Supabase is not configured', async () => {
      mockIsConfigured = false;

      const session = await sessionManager.restoreSession();
      expect(session).toBeNull();
    });

    it('should clear session and return null on restore error', async () => {
      mockGetSession.mockRejectedValueOnce(new Error('Network error'));

      const session = await sessionManager.restoreSession();

      expect(session).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(SESSION_STORAGE_KEY);
    });
  });

  describe('refreshSession', () => {
    it('should refresh session and persist the new one', async () => {
      const newSupabaseSession = {
        access_token: 'new-access',
        refresh_token: 'new-refresh',
        expires_at: Math.floor(Date.now() / 1000) + 7200,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          user_metadata: {
            user_name: 'testuser',
            avatar_url: 'https://github.com/testuser.png',
          },
        },
      };

      mockRefreshSession.mockResolvedValueOnce({
        data: { session: newSupabaseSession, user: newSupabaseSession.user },
        error: null,
      });

      const session = await sessionManager.refreshSession('old-refresh-token');

      expect(session.accessToken).toBe('new-access');
      expect(session.refreshToken).toBe('new-refresh');
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should throw and clear session if refresh fails', async () => {
      mockRefreshSession.mockResolvedValueOnce({
        data: { session: null, user: null },
        error: { message: 'Invalid refresh token', name: 'AuthError' },
      });

      await expect(sessionManager.refreshSession('bad-token')).rejects.toThrow('Failed to refresh session');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(SESSION_STORAGE_KEY);
    });

    it('should throw if Supabase is not configured', async () => {
      mockIsConfigured = false;

      await expect(sessionManager.refreshSession('token')).rejects.toThrow('Supabase is not configured');
    });
  });

  describe('setupAutoRefresh', () => {
    it('should set a timeout for refresh before expiry', () => {
      vi.useFakeTimers();

      const session = createMockSession({
        expiresAt: Date.now() + 30 * 60 * 1000,
      });

      const cleanup = sessionManager.setupAutoRefresh(session);
      expect(typeof cleanup).toBe('function');

      cleanup();
      vi.useRealTimers();
    });

    it('should trigger immediate refresh for already-expired sessions', async () => {
      mockRefreshSession.mockResolvedValueOnce({
        data: {
          session: {
            access_token: 'refreshed',
            refresh_token: 'refreshed-rt',
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            user: {
              id: 'user-123',
              email: 'test@example.com',
              user_metadata: { user_name: 'testuser', avatar_url: '' },
            },
          },
          user: null,
        },
        error: null,
      });

      const session = createMockSession({
        expiresAt: Date.now() - 1000,
      });

      const cleanup = sessionManager.setupAutoRefresh(session);

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(typeof cleanup).toBe('function');
      cleanup();
    });
  });
});
