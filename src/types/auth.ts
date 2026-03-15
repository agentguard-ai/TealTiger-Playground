export interface GitHubAuthConfig {
  clientId: string;
  redirectUri: string;
  scopes: ['read:user', 'user:email', 'read:org'];
}

export interface AuthUser {
  id: string;
  githubId: string;
  username: string;
  email: string;
  avatarUrl: string;
  organizations: GitHubOrganization[];
}

export interface GitHubOrganization {
  id: string;
  login: string;
  avatarUrl: string;
  role: 'admin' | 'member';
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: AuthUser;
}

export interface AuthError {
  message: string;
  code?: string;
}
