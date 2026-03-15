# Supabase Setup Guide for TealTiger Playground Enterprise

This guide walks you through setting up a Supabase project on the free tier for the TealTiger Interactive Web Playground Enterprise features.

## Prerequisites

- GitHub account (for authentication)
- Supabase account (sign up at https://supabase.com)

## Step 1: Create Supabase Project

1. **Sign in to Supabase**
   - Go to https://app.supabase.com
   - Sign in with your GitHub account

2. **Create New Project**
   - Click "New Project"
   - Fill in project details:
     - **Organization**: Select or create an organization
     - **Project Name**: `tealtiger-playground` (or your preferred name)
     - **Database Password**: Generate a strong password (save this securely)
     - **Region**: Choose the region closest to your users
     - **Pricing Plan**: Free tier (500MB database, 50K MAU)

3. **Wait for Project Initialization**
   - Project setup takes 1-2 minutes
   - You'll see a dashboard once ready

## Step 2: Configure GitHub OAuth

1. **Create GitHub OAuth App**
   - Go to GitHub Settings → Developer settings → OAuth Apps
   - Click "New OAuth App"
   - Fill in details:
     - **Application name**: `TealTiger Playground`
     - **Homepage URL**: `http://localhost:5173` (for development)
     - **Authorization callback URL**: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
   - Click "Register application"
   - Copy the **Client ID**
   - Generate and copy the **Client Secret**

2. **Configure Supabase Auth**
   - In Supabase dashboard, go to Authentication → Providers
   - Find "GitHub" and enable it
   - Paste your GitHub OAuth **Client ID** and **Client Secret**
   - Set scopes: `read:user`, `user:email`, `read:org`
   - Click "Save"

## Step 3: Get Project Credentials

1. **Project URL and Keys**
   - Go to Settings → API
   - Copy the following values:
     - **Project URL**: `https://YOUR_PROJECT_REF.supabase.co`
     - **anon public key**: Used for client-side requests
     - **service_role key**: Used for admin operations (keep secret!)

2. **Create Environment File**
   - In the `playground` directory, create `.env.local`:
   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   ```

## Step 4: Run Database Migrations

After setting up the project, you'll need to run the SQL migrations to create the database schema.

1. **Access SQL Editor**
   - In Supabase dashboard, go to SQL Editor
   - Click "New query"

2. **Run Migration Files**
   - Execute the migration files in order:
     - `playground/supabase/migrations/001_initial_schema.sql`
     - `playground/supabase/migrations/002_rls_policies.sql`
     - `playground/supabase/migrations/003_functions_triggers.sql`
   - Copy the contents of each file and run them in the SQL Editor

## Step 5: Verify Setup

1. **Check Tables**
   - Go to Table Editor in Supabase dashboard
   - Verify all 14 tables are created:
     - users
     - workspaces
     - workspace_members
     - policies
     - policy_versions
     - comments
     - comment_replies
     - policy_approvals
     - compliance_mappings
     - audit_log
     - policy_tests
     - analytics_events
     - policy_modules
     - policy_dependencies

2. **Test Authentication**
   - Start the playground: `npm run dev`
   - Click "Sign In with GitHub"
   - Verify successful authentication
   - Check that a user record is created in the `users` table

## Free Tier Limits

The Supabase free tier includes:
- **Database**: 500MB storage
- **Users**: 50,000 monthly active users (MAU)
- **Bandwidth**: 2GB per month
- **File Storage**: 500MB
- **API Requests**: Unlimited
- **Paused after**: 1 week of inactivity

### Monitoring Usage

- Go to Settings → Usage in Supabase dashboard
- Monitor database size, bandwidth, and active users
- Set up alerts when approaching limits

### Upgrade Path

When you exceed free tier limits:
- **Pro Plan**: $25/month (8GB database, 100K MAU, 50GB bandwidth)
- **Team Plan**: $599/month (unlimited everything)

## Troubleshooting

### Authentication Issues

**Problem**: GitHub OAuth callback fails
- **Solution**: Verify callback URL matches exactly in both GitHub OAuth app and Supabase settings
- **Format**: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`

**Problem**: User not created after sign-in
- **Solution**: Check RLS policies are enabled and configured correctly

### Database Issues

**Problem**: Tables not visible
- **Solution**: Ensure migrations ran successfully without errors
- **Check**: SQL Editor → History for error messages

**Problem**: Permission denied errors
- **Solution**: Verify RLS policies are correctly configured
- **Check**: Table Editor → Policies tab for each table

### Connection Issues

**Problem**: Cannot connect to Supabase
- **Solution**: Verify environment variables are correct
- **Check**: `.env.local` file has correct URL and anon key
- **Restart**: Development server after changing environment variables

## Security Best Practices

1. **Never commit secrets**
   - Add `.env.local` to `.gitignore`
   - Never commit `service_role` key to version control

2. **Use Row Level Security (RLS)**
   - All tables have RLS enabled
   - Policies enforce workspace isolation

3. **Rotate keys regularly**
   - Regenerate API keys if compromised
   - Update environment variables

4. **Monitor audit logs**
   - Review authentication attempts
   - Check for suspicious activity

## Next Steps

After completing this setup:
1. Run the database migrations (Task 1.1.2)
2. Test the database schema with property tests (Task 1.1.3)
3. Create validation functions and triggers (Task 1.1.4)
4. Implement Row Level Security policies (Task 1.2)

## Support

- **Supabase Docs**: https://supabase.com/docs
- **Supabase Discord**: https://discord.supabase.com
- **TealTiger Issues**: https://github.com/your-org/tealtiger/issues
