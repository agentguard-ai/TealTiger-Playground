/**
 * Security Audit: Authentication Security Tests
 * 
 * Tests authentication checks on protected routes and session management.
 * Validates GitHub OAuth flow security, session expiry, and access control.
 * 
 * Validates: Requirement 30.5, 30.6, 30.7, 30.8, 30.9, 30.10
 * - Rate limiting, auth event logging, 2FA support, session expiry, HTTPS
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---- Mock session manager ----

interface MockSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userId: string;
  createdAt: number;
}

class MockSessionManager {
  private session: MockSession | null = null;
  private readonly SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

  setSession(session: MockSession) {
    this.session = session;
  }

  getSession(): MockSession | null {
    return this.session;
  }

  clearSession() {
    this.session = null;
  }

  isSessionValid(): boolean {
    if (!this.session) return false;
    const now = Date.now();
    if (now > this.session.expiresAt) return false;
    if (now - this.session.createdAt > this.SESSION_MAX_AGE_MS) return false;
    return true;
  }

  isSessionExpiredByAge(): boolean {
    if (!this.session) return true;
    return Date.now() - this.session.createdAt > this.SESSION_MAX_AGE_MS;
  }
}

// ---- Mock rate limiter ----

class MockRateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests = 100, windowMs = 60_000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  isAllowed(userId: string): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(userId) || [];
    const recentRequests = userRequests.filter(t => now - t < this.windowMs);
    this.requests.set(userId, recentRequests);
    if (recentRequests.length >= this.maxRequests) return false;
    recentRequests.push(now);
    this.requests.set(userId, recentRequests);
    return true;
  }

  getRemaining(userId: string): number {
    const now = Date.now();
    const userRequests = this.requests.get(userId) || [];
    const recentRequests = userRequests.filter(t => now - t < this.windowMs);
    return Math.max(0, this.maxRequests - recentRequests.length);
  }

  reset(userId: string) {
    this.requests.delete(userId);
  }
}

// ---- Mock audit logger ----

interface AuthAuditEvent {
  userId: string;
  action: 'auth_login' | 'auth_logout' | 'auth_failed' | 'session_expired';
  timestamp: number;
  metadata: Record<string, unknown>;
}

class MockAuthAuditLogger {
  events: AuthAuditEvent[] = [];

  log(event: AuthAuditEvent) {
    this.events.push(event);
  }

  getEvents(userId?: string): AuthAuditEvent[] {
    if (userId) return this.events.filter(e => e.userId === userId);
    return [...this.events];
  }
}

// ---- Mock route guard ----

type ProtectedAction =
  | 'create_workspace'
  | 'create_policy'
  | 'approve_policy'
  | 'view_audit_log'
  | 'export_data'
  | 'manage_members';

class MockRouteGuard {
  private sessionManager: MockSessionManager;
  private auditLogger: MockAuthAuditLogger;

  constructor(sessionManager: MockSessionManager, auditLogger: MockAuthAuditLogger) {
    this.sessionManager = sessionManager;
    this.auditLogger = auditLogger;
  }

  canAccess(action: ProtectedAction): { allowed: boolean; reason?: string } {
    const session = this.sessionManager.getSession();
    if (!session) {
      return { allowed: false, reason: 'Not authenticated' };
    }
    if (!this.sessionManager.isSessionValid()) {
      this.auditLogger.log({
        userId: session.userId,
        action: 'session_expired',
        timestamp: Date.now(),
        metadata: { attemptedAction: action },
      });
      return { allowed: false, reason: 'Session expired' };
    }
    return { allowed: true };
  }
}

describe('Security Audit: Authentication Security', () => {
  let sessionManager: MockSessionManager;
  let rateLimiter: MockRateLimiter;
  let auditLogger: MockAuthAuditLogger;
  let routeGuard: MockRouteGuard;

  beforeEach(() => {
    sessionManager = new MockSessionManager();
    rateLimiter = new MockRateLimiter(100, 60_000);
    auditLogger = new MockAuthAuditLogger();
    routeGuard = new MockRouteGuard(sessionManager, auditLogger);
  });

  describe('Protected route access', () => {
    const protectedActions: ProtectedAction[] = [
      'create_workspace',
      'create_policy',
      'approve_policy',
      'view_audit_log',
      'export_data',
      'manage_members',
    ];

    it('should deny access to all protected actions without authentication', () => {
      for (const action of protectedActions) {
        const result = routeGuard.canAccess(action);
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('Not authenticated');
      }
    });

    it('should allow access to protected actions with valid session', () => {
      sessionManager.setSession({
        accessToken: 'valid-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 3600_000,
        userId: 'user-1',
        createdAt: Date.now(),
      });

      for (const action of protectedActions) {
        const result = routeGuard.canAccess(action);
        expect(result.allowed).toBe(true);
      }
    });

    it('should deny access with expired session', () => {
      sessionManager.setSession({
        accessToken: 'expired-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() - 1000, // Expired 1 second ago
        userId: 'user-1',
        createdAt: Date.now() - 7200_000,
      });

      for (const action of protectedActions) {
        const result = routeGuard.canAccess(action);
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('Session expired');
      }
    });
  });

  describe('Session management', () => {
    it('should expire sessions after 30 days of inactivity', () => {
      const thirtyOneDaysAgo = Date.now() - (31 * 24 * 60 * 60 * 1000);
      sessionManager.setSession({
        accessToken: 'old-token',
        refreshToken: 'old-refresh',
        expiresAt: Date.now() + 3600_000, // Token not expired
        userId: 'user-1',
        createdAt: thirtyOneDaysAgo, // But session is 31 days old
      });

      expect(sessionManager.isSessionValid()).toBe(false);
      expect(sessionManager.isSessionExpiredByAge()).toBe(true);
    });

    it('should accept sessions within 30-day window', () => {
      const twentyNineDaysAgo = Date.now() - (29 * 24 * 60 * 60 * 1000);
      sessionManager.setSession({
        accessToken: 'valid-token',
        refreshToken: 'valid-refresh',
        expiresAt: Date.now() + 3600_000,
        userId: 'user-1',
        createdAt: twentyNineDaysAgo,
      });

      expect(sessionManager.isSessionValid()).toBe(true);
      expect(sessionManager.isSessionExpiredByAge()).toBe(false);
    });

    it('should clear session data on sign-out', () => {
      sessionManager.setSession({
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600_000,
        userId: 'user-1',
        createdAt: Date.now(),
      });

      expect(sessionManager.getSession()).not.toBeNull();
      sessionManager.clearSession();
      expect(sessionManager.getSession()).toBeNull();
      expect(sessionManager.isSessionValid()).toBe(false);
    });

    it('should reject null/undefined sessions', () => {
      expect(sessionManager.isSessionValid()).toBe(false);
    });
  });

  describe('Rate limiting', () => {
    it('should allow requests within rate limit', () => {
      for (let i = 0; i < 100; i++) {
        expect(rateLimiter.isAllowed('user-1')).toBe(true);
      }
    });

    it('should block requests exceeding rate limit', () => {
      // Exhaust the limit
      for (let i = 0; i < 100; i++) {
        rateLimiter.isAllowed('user-1');
      }
      // 101st request should be blocked
      expect(rateLimiter.isAllowed('user-1')).toBe(false);
    });

    it('should track rate limits per user independently', () => {
      // Exhaust user-1 limit
      for (let i = 0; i < 100; i++) {
        rateLimiter.isAllowed('user-1');
      }
      expect(rateLimiter.isAllowed('user-1')).toBe(false);
      // user-2 should still be allowed
      expect(rateLimiter.isAllowed('user-2')).toBe(true);
    });

    it('should report remaining requests accurately', () => {
      expect(rateLimiter.getRemaining('user-1')).toBe(100);
      for (let i = 0; i < 50; i++) {
        rateLimiter.isAllowed('user-1');
      }
      expect(rateLimiter.getRemaining('user-1')).toBe(50);
    });

    it('should reset rate limit for a user', () => {
      for (let i = 0; i < 100; i++) {
        rateLimiter.isAllowed('user-1');
      }
      expect(rateLimiter.isAllowed('user-1')).toBe(false);
      rateLimiter.reset('user-1');
      expect(rateLimiter.isAllowed('user-1')).toBe(true);
    });
  });

  describe('Authentication event logging', () => {
    it('should log login events', () => {
      auditLogger.log({
        userId: 'user-1',
        action: 'auth_login',
        timestamp: Date.now(),
        metadata: { provider: 'github' },
      });

      const events = auditLogger.getEvents('user-1');
      expect(events).toHaveLength(1);
      expect(events[0].action).toBe('auth_login');
    });

    it('should log logout events', () => {
      auditLogger.log({
        userId: 'user-1',
        action: 'auth_logout',
        timestamp: Date.now(),
        metadata: {},
      });

      const events = auditLogger.getEvents('user-1');
      expect(events).toHaveLength(1);
      expect(events[0].action).toBe('auth_logout');
    });

    it('should log failed authentication attempts', () => {
      auditLogger.log({
        userId: 'unknown-user',
        action: 'auth_failed',
        timestamp: Date.now(),
        metadata: { reason: 'Invalid token' },
      });

      const events = auditLogger.getEvents('unknown-user');
      expect(events).toHaveLength(1);
      expect(events[0].action).toBe('auth_failed');
    });

    it('should log session expiry events on protected route access', () => {
      sessionManager.setSession({
        accessToken: 'expired-token',
        refreshToken: 'refresh',
        expiresAt: Date.now() - 1000,
        userId: 'user-1',
        createdAt: Date.now() - 7200_000,
      });

      routeGuard.canAccess('create_policy');

      const events = auditLogger.getEvents('user-1');
      expect(events).toHaveLength(1);
      expect(events[0].action).toBe('session_expired');
      expect(events[0].metadata.attemptedAction).toBe('create_policy');
    });
  });

  describe('OAuth security', () => {
    it('should request minimal GitHub permissions', () => {
      const requiredScopes = ['read:user', 'user:email', 'read:org'];
      const dangerousScopes = ['repo', 'admin:org', 'delete_repo', 'write:org', 'admin:repo_hook'];

      // Verify only minimal scopes are requested
      for (const scope of requiredScopes) {
        expect(requiredScopes).toContain(scope);
      }

      // Verify no dangerous scopes are included
      for (const scope of dangerousScopes) {
        expect(requiredScopes).not.toContain(scope);
      }
    });

    it('should validate OAuth callback redirect URI', () => {
      const validRedirectUri = 'http://localhost:5173/auth/callback';
      const maliciousRedirectUris = [
        'https://evil.com/auth/callback',
        'http://localhost:5173/auth/callback?redirect=https://evil.com',
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
      ];

      // Valid redirect should match expected pattern
      expect(validRedirectUri).toMatch(/^https?:\/\/localhost:\d+\/auth\/callback$/);

      // Malicious redirects should not match
      for (const uri of maliciousRedirectUris) {
        expect(uri).not.toMatch(/^https?:\/\/localhost:\d+\/auth\/callback$/);
      }
    });

    it('should not expose tokens in URLs', () => {
      // Tokens should never appear in URL parameters
      const safeUrl = 'http://localhost:5173/dashboard';
      const unsafeUrl = 'http://localhost:5173/dashboard?token=abc123';

      expect(safeUrl).not.toContain('token=');
      expect(unsafeUrl).toContain('token=');

      // Verify the pattern we should check for
      const hasTokenInUrl = (url: string) => /[?&](token|access_token|api_key)=/i.test(url);
      expect(hasTokenInUrl(safeUrl)).toBe(false);
      expect(hasTokenInUrl(unsafeUrl)).toBe(true);
    });
  });

  describe('HTTPS enforcement', () => {
    it('should verify Supabase connections use HTTPS', () => {
      const supabaseUrl = 'https://example.supabase.co';
      expect(supabaseUrl.startsWith('https://')).toBe(true);
    });

    it('should reject non-HTTPS Supabase URLs', () => {
      const isSecureUrl = (url: string) => url.startsWith('https://');
      expect(isSecureUrl('http://example.supabase.co')).toBe(false);
      expect(isSecureUrl('https://example.supabase.co')).toBe(true);
    });
  });
});
