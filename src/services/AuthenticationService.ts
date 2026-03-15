import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { AuthUser, GitHubOrganization, AuthError } from '@/types/auth';

/**
 * AuthenticationService handles GitHub OAuth authentication via Supabase Auth
 * 
 * Features:
 * - GitHub OAuth sign-in with minimal permissions (read:user, user:email, read:org)
 * - User profile creation and management
 * - GitHub organization membership sync
 * - Session management
 * 
 * Requirements: 2.1-2.5, 2.9
 */
export class AuthenticationService {
  /**
   * Initiates GitHub OAuth flow via Supabase Auth
   * Redirects user to GitHub authorization page
   * 
   * @throws {AuthError} If Supabase is not configured or sign-in fails
   * Requirements: 2.1, 2.2
   */
  async signInWithGitHub(): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) {
      throw this.createError('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        scopes: 'read:user user:email read:org',
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      throw this.createError(error.message, error.name);
    }
  }

  /**
   * Handles OAuth callback and creates/updates user profile
   * Called after GitHub redirects back to the application
   * 
   * @returns {Promise<AuthUser>} The authenticated user
   * @throws {AuthError} If callback handling fails
   * Requirements: 2.3, 2.4
   */
  async handleCallback(): Promise<AuthUser> {
    if (!isSupabaseConfigured() || !supabase) {
      throw this.createError('Supabase is not configured');
    }

    // Get the current session after OAuth callback
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw this.createError(sessionError?.message || 'No session found after OAuth callback');
    }

    // Extract user data from session
    const { user: supabaseUser } = session;
    const userMetadata = supabaseUser.user_metadata;

    // Create or update user profile in database
    const authUser: AuthUser = {
      id: supabaseUser.id,
      githubId: userMetadata.user_name || userMetadata.preferred_username || '',
      username: userMetadata.user_name || userMetadata.preferred_username || userMetadata.name || '',
      email: supabaseUser.email || '',
      avatarUrl: userMetadata.avatar_url || '',
      organizations: [], // Will be populated by syncOrganizations
    };

    // Upsert user profile
    const { error: upsertError } = await supabase
      .from('users')
      .upsert({
        id: authUser.id,
        github_id: authUser.githubId,
        username: authUser.username,
        email: authUser.email,
        avatar_url: authUser.avatarUrl,
        last_seen: new Date().toISOString(),
      }, {
        onConflict: 'id',
      });

    if (upsertError) {
      console.error('Failed to upsert user profile:', upsertError);
      // Don't throw - user can still use the app even if profile creation fails
    }

    // Sync GitHub organizations in the background
    this.syncOrganizations(authUser.id).catch(err => {
      console.error('Failed to sync organizations:', err);
    });

    return authUser;
  }

  /**
   * Signs out user and clears session
   * 
   * @throws {AuthError} If sign-out fails
   * Requirements: 2.9
   */
  async signOut(): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) {
      throw this.createError('Supabase is not configured');
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
      throw this.createError(error.message, error.name);
    }
  }

  /**
   * Gets current authenticated user
   * 
   * @returns {Promise<AuthUser | null>} The current user or null if not authenticated
   * Requirements: 2.3, 2.8
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    if (!isSupabaseConfigured() || !supabase) {
      return null;
    }

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return null;
    }

    const { user: supabaseUser } = session;
    const userMetadata = supabaseUser.user_metadata;

    // Fetch user profile from database
    const { data: userProfile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', supabaseUser.id)
      .single();

    if (error) {
      console.error('Failed to fetch user profile:', error);
      // Return basic user info from session if profile fetch fails
      return {
        id: supabaseUser.id,
        githubId: userMetadata.user_name || '',
        username: userMetadata.user_name || userMetadata.name || '',
        email: supabaseUser.email || '',
        avatarUrl: userMetadata.avatar_url || '',
        organizations: [],
      };
    }

    return {
      id: userProfile.id,
      githubId: userProfile.github_id,
      username: userProfile.username,
      email: userProfile.email,
      avatarUrl: userProfile.avatar_url,
      organizations: [], // TODO: Fetch from workspace_members
    };
  }

  /**
   * Syncs GitHub organization memberships
   * Creates team workspaces for organizations if they don't exist
   * 
   * @param {string} userId - The user ID to sync organizations for
   * Requirements: 2.5, 2.6
   */
  async syncOrganizations(userId: string): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) {
      return;
    }

    try {
      // Get the current session to access the GitHub token
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.warn('No session found, cannot sync organizations');
        return;
      }

      // Fetch GitHub organizations using the GitHub API
      // Note: This requires the provider_token from the session
      const providerToken = session.provider_token;

      if (!providerToken) {
        console.warn('No provider token found, cannot sync organizations');
        return;
      }

      const response = await fetch('https://api.github.com/user/orgs', {
        headers: {
          'Authorization': `Bearer ${providerToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        console.error('Failed to fetch GitHub organizations:', response.statusText);
        return;
      }

      const orgs: GitHubOrganization[] = await response.json();

      // Store organizations in user metadata or create workspaces
      // For now, we'll just log them - workspace creation will be implemented in Task 1.4
      console.log('GitHub organizations:', orgs);

      // TODO: Create workspaces for organizations in Task 1.4
      // TODO: Add user to workspace_members table

    } catch (error) {
      console.error('Error syncing organizations:', error);
      // Don't throw - this is a background operation
    }
  }

  /**
   * Creates a standardized error object
   * @private
   */
  private createError(message: string, code?: string): AuthError {
    return { message, code };
  }
}

// Export singleton instance
export const authService = new AuthenticationService();
