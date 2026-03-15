# GitHub OAuth Setup Guide

This guide walks you through configuring GitHub OAuth authentication for the TealTiger Playground using Supabase Auth.

## Prerequisites

- A Supabase project (created in Task 1.1.1)
- A GitHub account with admin access to create OAuth apps

## Step 1: Create GitHub OAuth App

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in the application details:
   - **Application name**: `TealTiger Playground`
   - **Homepage URL**: `https://your-playground-domain.vercel.app` (or `http://localhost:5173` for development)
   - **Authorization callback URL**: `https://your-supabase-project.supabase.co/auth/v1/callback`
     - Get this URL from your Supabase project dashboard under Authentication → Providers → GitHub
4. Click "Register application"
5. Note down the **Client ID**
6. Click "Generate a new client secret" and note down the **Client Secret**

## Step 2: Configure Supabase Auth

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Providers**
3. Find **GitHub** in the list of providers
4. Enable the GitHub provider
5. Enter the **Client ID** from Step 1
6. Enter the **Client Secret** from Step 1
7. Configure the scopes (required):
   - `read:user` - Read user profile information
   - `user:email` - Read user email addresses
   - `read:org` - Read organization membership (optional but recommended for team features)
8. Click "Save"

## Step 3: Configure Environment Variables

Create a `.env.local` file in the `playground` directory with the following variables:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# GitHub OAuth Configuration (optional - for reference)
# These are configured in Supabase dashboard, not needed in frontend
# GITHUB_CLIENT_ID=your-github-client-id
# GITHUB_CLIENT_SECRET=your-github-client-secret
```

**Important**: 
- Get the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from your Supabase project settings
- Never commit the `.env.local` file to version control
- The `.env.local` file is already in `.gitignore`

## Step 4: Test the Configuration

1. Start the development server: `npm run dev`
2. Click the "Sign in with GitHub" button
3. You should be redirected to GitHub's authorization page
4. After authorizing, you should be redirected back to the playground
5. Your user profile should be created in the Supabase `users` table

## Troubleshooting

### "Invalid callback URL" error
- Ensure the callback URL in GitHub OAuth app matches the one from Supabase
- For local development, use `http://localhost:5173` as the homepage URL
- For production, use your actual Vercel deployment URL

### "Unauthorized" error
- Verify the Client ID and Client Secret are correct in Supabase
- Check that the GitHub OAuth app is not suspended
- Ensure the scopes are configured correctly

### User profile not created
- Check the Supabase logs in the dashboard under Logs → Auth
- Verify the `users` table exists and has the correct schema
- Check that Row Level Security (RLS) policies allow user creation

## Security Notes

- **Minimal Permissions**: We only request `read:user`, `user:email`, and `read:org` scopes
- **No Write Access**: The app cannot modify your GitHub repositories or settings
- **Organization Data**: The `read:org` scope only reads your organization memberships, not organization data
- **Revoke Access**: You can revoke access anytime from GitHub Settings → Applications → Authorized OAuth Apps

## Next Steps

After completing this setup:
1. Implement the `AuthenticationService` class (Task 1.3.2)
2. Implement the `SessionManager` class (Task 1.3.3)
3. Build the authentication UI components (Task 1.3.4)
4. Test the complete authentication flow (Task 1.3.6)

## References

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [GitHub OAuth Documentation](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)
- [Supabase GitHub Auth Guide](https://supabase.com/docs/guides/auth/social-login/auth-github)
