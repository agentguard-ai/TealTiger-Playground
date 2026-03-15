import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Session, AuthUser } from '@/types/auth';

const SESSION_STORAGE_KEY = 'tealtiger-auth-session';
const SESSION_EXPIRY_BUFFER = 5 * 60 * 1000; // 5 minutes buffer before expiry

/**
 * SessionManager handles session persistence and token refresh
 * 
 * Features:
 * - Session persistence across browser restarts
 * - Automatic token refresh before expiry
 * - Session validation
 * - Secure session cleanup
 * 
 * Requirements: 2.8
 */
export class SessionManager {
  /**
   * Persists session across browser restarts
   * Stores session in localStorage for persistence
   * 
   * @param {Session} session - The session to persist
   * Requirements: 2.8
   */
  async persistSession(session: Session): Promise<void> {
    try {
      const sessionData = {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        expiresAt: session.expiresAt,
        user: session.user,
        persistedAt: Date.now(),
      };

      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
    } catch (error) {
      console.error('Failed to persist session:', error);
      // Don't throw - session persistence is not critical
    }
  }

  /**
   * Restores session from storage
   * Validates and refreshes session if needed
   * 
   * @returns {Promise<Session | null>} The restored session or null if not found/invalid
   * Requirements: 2.8
   */
  async restoreSession(): Promise<Session | null> {
    if (!isSupabaseConfigured() || !supabase) {
      return null;
    }

    try {
      // First, try to get session from Supabase (most reliable)
      const { data: { session: supabaseSession } } = await supabase.auth.getSession();

      if (supabaseSession) {
        const session = this.convertSupabaseSession(supabaseSession);
        
        // Check if session needs refresh
        if (!this.isSessionValid(session)) {
          return await this.refreshSession(session.refreshToken);
        }

        return session;
      }

      // Fallback to localStorage
      const storedData = localStorage.getItem(SESSION_STORAGE_KEY);
      
      if (!storedData) {
        return null;
      }

      const session: Session = JSON.parse(storedData);

      // Validate session
      if (!this.isSessionValid(session)) {
        // Try to refresh if expired
        return await this.refreshSession(session.refreshToken);
      }

      return session;
    } catch (error) {
      console.error('Failed to restore session:', error);
      await this.clearSession();
      return null;
    }
  }

  /**
   * Refreshes expired access token using refresh token
   * 
   * @param {string} refreshToken - The refresh token to use
   * @returns {Promise<Session>} The new session with refreshed tokens
   * @throws {Error} If refresh fails
   * Requirements: 2.8
   */
  async refreshSession(refreshToken: string): Promise<Session> {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase is not configured');
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      await this.clearSession();
      throw new Error(`Failed to refresh session: ${error?.message || 'No session returned'}`);
    }

    const session = this.convertSupabaseSession(data.session);
    await this.persistSession(session);

    return session;
  }

  /**
   * Clears session on sign-out
   * Removes session from localStorage and Supabase
   * 
   * Requirements: 2.9
   */
  async clearSession(): Promise<void> {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      
      // Also clear any other auth-related storage
      localStorage.removeItem('supabase.auth.token');
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  }

  /**
   * Checks if session is valid (not expired)
   * Includes a 5-minute buffer before actual expiry
   * 
   * @param {Session} session - The session to validate
   * @returns {boolean} True if session is valid, false otherwise
   * Requirements: 2.8
   */
  isSessionValid(session: Session): boolean {
    if (!session || !session.expiresAt) {
      return false;
    }

    const now = Date.now();
    const expiryWithBuffer = session.expiresAt - SESSION_EXPIRY_BUFFER;

    return now < expiryWithBuffer;
  }

  /**
   * Converts Supabase session to our Session type
   * @private
   */
  private convertSupabaseSession(supabaseSession: any): Session {
    const userMetadata = supabaseSession.user.user_metadata;

    const user: AuthUser = {
      id: supabaseSession.user.id,
      githubId: userMetadata.user_name || userMetadata.preferred_username || '',
      username: userMetadata.user_name || userMetadata.preferred_username || userMetadata.name || '',
      email: supabaseSession.user.email || '',
      avatarUrl: userMetadata.avatar_url || '',
      organizations: [],
    };

    return {
      accessToken: supabaseSession.access_token,
      refreshToken: supabaseSession.refresh_token,
      expiresAt: supabaseSession.expires_at ? supabaseSession.expires_at * 1000 : Date.now() + 3600000,
      user,
    };
  }

  /**
   * Sets up automatic session refresh
   * Refreshes session 5 minutes before expiry
   * 
   * @param {Session} session - The current session
   * @returns {() => void} Cleanup function to stop auto-refresh
   */
  setupAutoRefresh(session: Session): () => void {
    const timeUntilRefresh = session.expiresAt - Date.now() - SESSION_EXPIRY_BUFFER;

    if (timeUntilRefresh <= 0) {
      // Session already expired or about to expire, refresh immediately
      this.refreshSession(session.refreshToken).catch(err => {
        console.error('Auto-refresh failed:', err);
      });
      return () => {};
    }

    const timeoutId = setTimeout(() => {
      this.refreshSession(session.refreshToken).catch(err => {
        console.error('Auto-refresh failed:', err);
      });
    }, timeUntilRefresh);

    return () => clearTimeout(timeoutId);
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();
