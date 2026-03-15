# Troubleshooting Guide

This guide covers common issues you may encounter when using the TealTiger Playground, along with solutions, error message explanations, free tier limitations, and support resources.

> Most issues stem from Supabase configuration, GitHub OAuth setup, or free tier limits. Start with the relevant section below.

## Table of Contents

- [Authentication Issues](#authentication-issues)
- [Supabase Connection Issues](#supabase-connection-issues)
- [Row Level Security (RLS) Errors](#row-level-security-rls-errors)
- [Real-Time Sync Issues](#real-time-sync-issues)
- [Policy Editor Issues](#policy-editor-issues)
- [Governance Workflow Issues](#governance-workflow-issues)
- [Deployment and CI/CD Issues](#deployment-and-cicd-issues)
- [Performance Issues](#performance-issues)
- [Free Tier Limitations](#free-tier-limitations)
- [Error Message Reference](#error-message-reference)
- [Support Resources](#support-resources)

---

## Authentication Issues

### GitHub OAuth sign-in fails or redirects to an error page

**Symptoms:** Clicking "Sign in with GitHub" shows an error, redirects to a blank page, or loops back to the sign-in screen.

**Solutions:**

1. Verify your Supabase project has GitHub OAuth enabled:
   - Go to your Supabase dashboard → Authentication → Providers → GitHub
   - Confirm the Client ID and Client Secret are set correctly
2. Check that the OAuth callback URL in your GitHub OAuth App matches your Supabase project:
   ```
   https://your-project.supabase.co/auth/v1/callback
   ```
3. Confirm your `.env.local` has the correct Supabase URL and anon key:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```
4. If using a custom domain on Vercel, make sure the redirect URI in the GitHub OAuth App includes the production URL

### Session expires unexpectedly

**Symptoms:** You're signed out after closing the browser or after a period of inactivity.

**Solutions:**

1. Supabase sessions use JWT tokens with a default expiry. The playground automatically refreshes tokens — if this fails, sign in again
2. Check that your browser isn't blocking third-party cookies (Supabase Auth relies on cookies for session persistence)
3. Clear your browser's local storage for the playground domain and sign in again

### Organization memberships not syncing

**Symptoms:** Your GitHub organizations don't appear in the workspace selector.

**Solutions:**

1. Ensure the OAuth app requests the `read:org` scope — check Supabase → Authentication → Providers → GitHub → Scopes
2. Verify your GitHub organization allows OAuth app access:
   - Go to GitHub → Your Organization → Settings → Third-party access → OAuth Application Policy
   - Approve the TealTiger OAuth app
3. Organization membership syncs daily. To force a sync, sign out and sign back in

### "Unauthorized" error after sign-in

**Symptoms:** You sign in successfully but see "Unauthorized" when accessing workspace data.

**Solutions:**

1. Your user profile may not have been created in the `users` table. Check the Supabase dashboard → Table Editor → `users` for your record
2. Verify RLS policies on the `users` table allow inserts for authenticated users
3. Check the browser console for specific error details

---

## Supabase Connection Issues

### "Failed to connect to Supabase" on page load

**Symptoms:** The playground shows a connection error banner or features don't load.

**Solutions:**

1. Verify your Supabase project is active — free tier projects pause after 1 week of inactivity:
   - Go to [supabase.com/dashboard](https://supabase.com/dashboard)
   - If your project is paused, click "Restore project" (takes 1-2 minutes)
2. Check that `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct in your environment
3. Test the connection directly:
   ```bash
   curl https://your-project.supabase.co/rest/v1/ \
     -H "apikey: your-anon-key" \
     -H "Authorization: Bearer your-anon-key"
   ```
   A successful response returns `[]` or a JSON array. A 401 or connection error indicates a configuration problem.

### Supabase project paused (free tier inactivity)

**Symptoms:** All database-backed features stop working. The browser console shows network errors to `supabase.co`.

**Solutions:**

1. Free tier projects pause after 7 days of inactivity. Visit your [Supabase dashboard](https://supabase.com/dashboard) and restore the project
2. To prevent pausing, set up a simple health check that pings your project periodically (e.g., a GitHub Actions cron job):
   ```yaml
   name: Keep Supabase Active
   on:
     schedule:
       - cron: '0 0 */3 * *'  # Every 3 days
   jobs:
     ping:
       runs-on: ubuntu-latest
       steps:
         - run: curl -s "${{ secrets.SUPABASE_URL }}/rest/v1/" -H "apikey:${{ secrets.SUPABASE_ANON_KEY }}"
   ```

### Database queries timing out

**Symptoms:** Pages load slowly or show timeout errors. The audit trail or policy registry takes a long time to respond.

**Solutions:**

1. Check your Supabase dashboard → Database → Query Performance for slow queries
2. Ensure database indexes exist on frequently queried columns (`workspace_id`, `policy_id`, `created_at`)
3. Use pagination — the playground loads 50 policies and 100 audit events per page by default
4. If the database is under heavy load, reduce real-time subscriptions (each open tab creates a WebSocket connection)

---

## Row Level Security (RLS) Errors

### "new row violates row-level security policy"

**Symptoms:** Creating or updating records fails with an RLS violation error.

**Solutions:**

1. Verify you're authenticated — RLS policies require a valid JWT token. Sign out and sign back in
2. Check your workspace membership — you can only write to workspaces you belong to:
   - Open the Supabase dashboard → Table Editor → `workspace_members`
   - Confirm your user ID appears with the correct `workspace_id` and `role`
3. Check your role permissions:
   - **Viewers** cannot create or edit policies (read-only)
   - **Editors** can create and edit policies but cannot manage members
   - **Owners** have full access
4. If you recently joined a workspace, try refreshing the page to pick up the updated JWT claims

### "permission denied for table" errors

**Symptoms:** Queries fail with a PostgreSQL permission error.

**Solutions:**

1. Ensure RLS is enabled on all tables — the playground requires RLS for data isolation:
   ```sql
   ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
   ```
2. Verify RLS policies exist for the affected table. Check Supabase → Authentication → Policies
3. The `audit_log` table is append-only — update and delete operations are blocked by design. If you see this error on the audit table, it's working correctly

### Data from other workspaces is visible

**Symptoms:** You can see policies or audit events from workspaces you don't belong to.

**Solutions:**

1. This indicates missing or misconfigured RLS policies. Check that each table has a policy filtering by `workspace_id`:
   ```sql
   CREATE POLICY "Users can only access their workspace data"
   ON policies FOR ALL
   USING (workspace_id IN (
     SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
   ));
   ```
2. Verify RLS is enabled (not just defined) on every table
3. Check the Supabase dashboard → Authentication → Policies for gaps

---

## Real-Time Sync Issues

### Comments or policy changes not appearing in real-time

**Symptoms:** Changes made by other team members don't show up until you refresh the page.

**Solutions:**

1. Check your browser's WebSocket connection — open DevTools → Network → WS tab and look for an active connection to `supabase.co`
2. If the WebSocket is disconnected, the playground shows an offline indicator. Wait for automatic reconnection or refresh the page
3. Verify that Supabase real-time is enabled for the relevant tables:
   - Go to Supabase dashboard → Database → Replication
   - Ensure `policies`, `comments`, `comment_replies`, and `audit_log` are in the publication
4. Browser extensions (ad blockers, privacy tools) can block WebSocket connections. Try disabling them temporarily

### "Offline" indicator won't go away

**Symptoms:** The offline banner persists even though you have internet connectivity.

**Solutions:**

1. Check if your Supabase project is paused (see [Supabase project paused](#supabase-project-paused-free-tier-inactivity))
2. Try a hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (macOS)
3. Clear the browser's local storage for the playground domain
4. Check your network for WebSocket-blocking firewalls or proxies (common in corporate environments)

### Conflicting edits between team members

**Symptoms:** Two people edit the same policy and one person's changes are lost.

**Solutions:**

1. The playground uses a last-write-wins strategy for concurrent edits. To avoid conflicts:
   - Communicate with your team about who's editing which policy
   - Use the active users indicator to see who else is viewing a policy
2. If changes are lost, check the policy's version history — every save creates an immutable version, so no data is permanently lost
3. Use the diff view to compare versions and manually merge changes if needed

---

## Policy Editor Issues

### Monaco Editor not loading or showing a blank panel

**Symptoms:** The code editor area is empty or shows a loading spinner indefinitely.

**Solutions:**

1. Try a hard refresh: `Ctrl+Shift+R` / `Cmd+Shift+R`
2. Check the browser console for JavaScript errors — Monaco Editor requires WebAssembly support
3. Ensure your browser is up to date (Chrome 90+, Firefox 90+, Safari 15+, Edge 90+)
4. Disable browser extensions that modify page content (some ad blockers interfere with Monaco)

### Policy evaluation returns unexpected results

**Symptoms:** A policy produces different results than expected when evaluated.

**Solutions:**

1. Check the policy version — you may be evaluating an older version. Look at the version badge in the editor
2. Verify the evaluation context (input data) matches your expectations
3. Use the RBAC Simulator to test with different role contexts
4. Run the policy's test suite to identify which scenarios pass and fail
5. Check the impact analysis to see if recent changes affected behavior

### "Policy name already exists" error

**Symptoms:** You can't save a policy because the name is taken.

**Solutions:**

1. Policy names must be unique within a workspace. Choose a different name or add a version suffix (e.g., `pii-detection-v2`)
2. Check the policy registry for existing policies with the same name — it may be in a different state (Draft, Archived)
3. If you're trying to update an existing policy, open it from the registry instead of creating a new one

---

## Governance Workflow Issues

### Can't edit a policy in "Approved" or "Production" state

**Symptoms:** The editor is read-only and the save button is disabled.

**This is expected behavior.** Approved and Production policies are locked to maintain governance integrity. To make changes:

1. Open the policy
2. Click "Create New Version" — this creates a new Draft version based on the current code
3. Edit the new Draft version
4. Submit it through the approval workflow

### Approval notifications not received

**Symptoms:** Approvers aren't notified when a policy enters Review state.

**Solutions:**

1. Verify approvers are configured in Workspace Settings → Governance → Required Approvers
2. Check that the approver users are active workspace members
3. Notifications appear in the playground UI — there are no email notifications on the free tier
4. Approvers should check the governance dashboard for pending reviews

### Emergency bypass not available

**Symptoms:** The "Emergency Bypass" option doesn't appear for a policy.

**Solutions:**

1. Emergency bypass must be enabled in Workspace Settings → Governance → Allow Emergency Bypass
2. Only workspace Owners can perform emergency bypasses
3. Every bypass is logged in the audit trail with a required reason — this is by design for compliance

---

## Deployment and CI/CD Issues

### Vercel deployment fails

**Symptoms:** The CD workflow fails at the deploy step.

**Solutions:**

1. Verify all three Vercel secrets are set in your repository:
   - `VERCEL_TOKEN` — [create one here](https://vercel.com/account/tokens)
   - `VERCEL_ORG_ID` — from `.vercel/project.json` after running `vercel link`
   - `VERCEL_PROJECT_ID` — from `.vercel/project.json`
2. Check that the Vercel token hasn't expired
3. Ensure the build succeeds locally before pushing:
   ```bash
   cd playground
   npm run build
   ```
4. Check the Vercel dashboard for deployment logs and error details

### GitHub Actions workflow not triggering

**Symptoms:** Pushing changes doesn't start the CI/CD pipeline.

**Solutions:**

1. Verify the workflow file exists at `.github/workflows/playground-ci.yml`
2. Check that your changes are under the `playground/` directory (workflows use path filters)
3. Ensure the branch matches the trigger configuration (typically `main`)
4. Check the Actions tab in your repository for any workflow errors or disabled workflows

### Tests pass locally but fail in CI

**Symptoms:** All tests pass on your machine but fail in GitHub Actions.

**Solutions:**

1. CI uses `npm ci` (clean install from lockfile) — make sure `package-lock.json` is committed and up to date
2. CI runs on `ubuntu-latest` — check for OS-specific issues (file paths, line endings, timing)
3. Environment variables may differ — verify all required secrets are set
4. Playwright browsers are cached in CI — if the cache is stale, delete it from Actions → Caches

### Build exceeds Vercel free tier limits

**Symptoms:** Deployment fails with a quota or limit error.

**Solutions:**

1. Vercel free tier allows 100 GB bandwidth/month and 6,000 build minutes/month
2. Check your usage at [vercel.com/dashboard](https://vercel.com/dashboard) → Usage
3. Reduce build frequency by using path filters in your CI/CD workflows
4. Optimize the build output size — remove unused dependencies and assets

---

## Performance Issues

### Pages load slowly

**Symptoms:** The playground takes more than a few seconds to load or navigate.

**Solutions:**

1. Check your network connection — the playground loads assets from Vercel CDN and data from Supabase
2. Large workspaces with many policies may take longer. Use search and filters to narrow results
3. Clear the browser cache — stale cached assets can cause issues after updates
4. Check the Supabase dashboard for database performance issues

### Audit trail or policy registry is slow to scroll

**Symptoms:** Scrolling through long lists is laggy or unresponsive.

**Solutions:**

1. The playground uses virtual scrolling for large lists. If scrolling is laggy, try reducing the browser window size or closing other tabs
2. Apply filters to reduce the dataset — filtering by date range or action type significantly improves performance
3. Export large datasets instead of scrolling through them in the UI

### High memory usage in the browser

**Symptoms:** The browser tab uses excessive memory or becomes unresponsive.

**Solutions:**

1. Close unused tabs — each tab with the playground open maintains WebSocket connections and cached data
2. If you have many policies open, close the ones you're not actively editing
3. Refresh the page periodically to clear accumulated state
4. Check for browser extensions that may be consuming memory alongside the playground

---

## Free Tier Limitations

The playground runs entirely on free-tier infrastructure. Here are the limits and what to do when you approach them.

### Supabase Free Tier

| Resource | Limit | What happens when exceeded |
|----------|-------|---------------------------|
| Database storage | 500 MB | Writes fail. Export and delete old data, or upgrade to Pro ($25/month) |
| Monthly active users | 50,000 | New sign-ins are rejected. Unlikely to hit for team use |
| Bandwidth | 2 GB/month | API requests fail. Reduce real-time subscriptions and polling |
| File storage | 500 MB | File uploads fail. Clean up unused exports |
| Inactivity | 7 days | Project pauses automatically. Visit the dashboard to restore |

**Storage tips:**
- Audit events are compact (~200-500 bytes each). A typical workspace generates a few hundred events per month
- Policy versions include full code snapshots. Keep policies concise and avoid storing large test fixtures inline
- Export and archive old audit data periodically to free up space
- Use the free tier monitoring dashboard to track usage

### Vercel Free Tier

| Resource | Limit | What happens when exceeded |
|----------|-------|---------------------------|
| Bandwidth | 100 GB/month | Site becomes unavailable until the next billing cycle |
| Serverless function executions | 100/day | API routes stop responding |
| Build minutes | 6,000/month | Deployments fail |
| Deployments | Unlimited | No limit on static deployments |

**Tips:**
- The playground is primarily static — bandwidth usage is low for typical team sizes
- Serverless functions are used sparingly (webhooks, scheduled tasks)
- Use caching headers to reduce redundant asset downloads

### GitHub Actions Free Tier

| Resource | Limit | What happens when exceeded |
|----------|-------|---------------------------|
| Minutes (private repos) | 2,000/month | Workflows queue until the next billing cycle |
| Minutes (public repos) | Unlimited | No limit |
| Storage (artifacts) | 500 MB | Artifact uploads fail |

**Tips:**
- A full CI run uses ~6-10 minutes. Budget for ~100-200 runs per month on a private repo
- Use path filters so workflows only trigger on playground changes
- Cancel in-progress runs when new commits are pushed (configured by default)
- Run scheduled regression tests weekly, not daily

### Monitoring Free Tier Usage

The playground displays usage warnings when you approach free tier limits:

- **80% threshold** — a yellow warning banner appears with current usage stats
- **95% threshold** — a red warning banner appears with upgrade recommendations
- **100% limit** — affected features are disabled with an explanation

Check the **Free Tier Monitor** in Workspace Settings for a breakdown of storage, bandwidth, and user counts.

### Upgrading from Free Tier

If you outgrow the free tier:

1. **Export your data** — use the built-in export tools for policies, audit logs, and compliance reports
2. **Upgrade Supabase** — Pro plan ($25/month) removes storage and MAU limits
3. **Upgrade Vercel** — Pro plan ($20/month) increases bandwidth and function limits
4. **Upgrade GitHub Actions** — paid plans start at $4/user/month for additional minutes

All data is portable. The playground's export functionality ensures you can migrate without data loss.

---

## Error Message Reference

### Authentication Errors

| Error Message | Cause | Solution |
|---------------|-------|----------|
| `Auth session missing` | No active session found | Sign in again |
| `Invalid login credentials` | OAuth token is invalid or expired | Clear cookies and sign in again |
| `Email not confirmed` | Supabase email confirmation is enabled | Disable email confirmation in Supabase Auth settings (not needed with GitHub OAuth) |
| `User not found` | User profile doesn't exist in the `users` table | Sign out, sign back in — the profile is created on first login |

### Database Errors

| Error Message | Cause | Solution |
|---------------|-------|----------|
| `new row violates row-level security policy` | RLS policy blocked the operation | Check your workspace membership and role permissions |
| `duplicate key value violates unique constraint` | Attempting to create a record that already exists | Use a different name or check for existing records |
| `relation "table_name" does not exist` | Database migrations haven't been applied | Run the Supabase migration scripts (see setup guide) |
| `permission denied for table` | Missing or misconfigured RLS policies | Verify RLS policies in Supabase dashboard |
| `could not connect to server` | Supabase project is paused or unreachable | Restore the project from the Supabase dashboard |

### Real-Time Errors

| Error Message | Cause | Solution |
|---------------|-------|----------|
| `WebSocket connection failed` | Network issue or Supabase project paused | Check connectivity and restore the project if paused |
| `Subscription error: not authorized` | RLS policy blocks real-time access | Verify the table is in the Supabase replication publication |
| `Channel error: too many connections` | Too many open tabs or concurrent users | Close unused tabs; free tier supports up to 200 concurrent connections |

### Governance Errors

| Error Message | Cause | Solution |
|---------------|-------|----------|
| `Policy is locked (state: approved)` | Attempting to edit an approved policy | Create a new version instead of editing |
| `Insufficient approvals` | Not enough approvers have signed off | Wait for remaining approvers or adjust the required count in settings |
| `Not authorized to approve` | You're not a designated approver | Ask a workspace Owner to add you as an approver |
| `Emergency bypass not enabled` | Bypass is disabled in workspace settings | A workspace Owner must enable it in Governance settings |

### Deployment Errors

| Error Message | Cause | Solution |
|---------------|-------|----------|
| `VERCEL_TOKEN is not set` | Missing Vercel secret in GitHub Actions | Add the secret in repository Settings → Secrets |
| `Build failed: out of memory` | Build process exceeded memory limits | Optimize imports and reduce bundle size |
| `Deployment quota exceeded` | Vercel free tier limit reached | Wait for the next billing cycle or upgrade |

---

## Support Resources

### Documentation

- [Getting Started Guide](./getting-started.md) — Sign in, create workspaces, write policies
- [Governance Workflow Guide](./governance-workflow.md) — Approval processes and policy lifecycle
- [Compliance Mapping Guide](./compliance-mapping.md) — Map policies to OWASP, NIST, SOC2, ISO 27001, GDPR
- [Audit Trail Guide](./audit-trail.md) — Immutable logging, filtering, and export
- [CI/CD Integration Guide](./cicd-integration.md) — GitHub Actions workflows for automated testing
- [RBAC Simulator Guide](./rbac-simulator.md) — Test policies across different user roles
- [Policy Template Guide](./policy-templates.md) — Documentation for all 15+ templates

### Setup Guides

- [Supabase Setup Guide](../SUPABASE-SETUP.md) — Database configuration and migration
- [GitHub OAuth Setup Guide](../GITHUB-OAUTH-SETUP.md) — OAuth app configuration
- [Deployment Guide](../DEPLOYMENT.md) — Vercel deployment instructions

### External Resources

- [Supabase Documentation](https://supabase.com/docs) — Database, Auth, Real-time, and Storage docs
- [Supabase Status Page](https://status.supabase.com) — Check for ongoing Supabase incidents
- [Vercel Documentation](https://vercel.com/docs) — Deployment, serverless functions, and CDN docs
- [Vercel Status Page](https://www.vercel-status.com) — Check for ongoing Vercel incidents
- [GitHub Actions Documentation](https://docs.github.com/en/actions) — Workflow syntax and runner docs
- [GitHub Status Page](https://www.githubstatus.com) — Check for ongoing GitHub incidents

### Reporting Issues

If you encounter a bug or need help:

1. Check this troubleshooting guide first
2. Search existing [GitHub Issues](https://github.com/your-org/tealtiger/issues) for similar problems
3. If the issue is new, open a GitHub Issue with:
   - A clear description of the problem
   - Steps to reproduce
   - Browser and OS information
   - Relevant error messages from the browser console
   - Screenshots if applicable

### Community

- [TealTiger Dev.to Blog](https://dev.to/nagasatish_chilakamarti_2/introducing-tealtiger-ai-security-cost-control-made-simple-4lma) — Announcements and tutorials
- GitHub Discussions — Ask questions and share tips with other TealTiger users
