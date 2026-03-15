# TealTiger Playground — Vercel Deployment Guide

## Prerequisites

- A [Vercel](https://vercel.com) account (free tier)
- A [Supabase](https://supabase.com) project (free tier)
- The GitHub repository connected to Vercel

## 1. Link Vercel to GitHub Repository

1. Log in to [vercel.com](https://vercel.com) and click **Add New Project**.
2. Import the GitHub repository containing the playground.
3. Set the **Root Directory** to `playground` (since the playground is a subdirectory).
4. Vercel will auto-detect the Vite framework from `vercel.json`.

## 2. Build Settings

These are pre-configured in `vercel.json`, but verify in the Vercel dashboard:

| Setting            | Value            |
| ------------------ | ---------------- |
| Framework Preset   | Vite             |
| Build Command      | `npm run build`  |
| Output Directory   | `dist`           |
| Install Command    | `npm install`    |
| Node.js Version    | 18.x or 20.x    |

## 3. Environment Variables

Set the following in **Vercel Dashboard → Settings → Environment Variables**:

| Variable                 | Description                        | Required |
| ------------------------ | ---------------------------------- | -------- |
| `VITE_SUPABASE_URL`     | Supabase project URL               | Yes      |
| `VITE_SUPABASE_ANON_KEY`| Supabase anonymous (public) key    | Yes      |


> **Important:** The `VITE_` prefix is required for Vite to expose variables to the client bundle. Never add secret keys (like `service_role` key) with the `VITE_` prefix.

Set variables for all environments (Production, Preview, Development) or scope them individually if you use different Supabase projects per environment.

## 4. Custom Domain (Optional)

1. Go to **Vercel Dashboard → Your Project → Settings → Domains**.
2. Add your custom domain (e.g., `playground.tealtiger.dev`).
3. Configure DNS records as instructed by Vercel:
   - **A Record**: `76.76.21.21`
   - **CNAME**: `cname.vercel-dns.com`
4. Vercel automatically provisions an SSL certificate.

## 5. Vercel Free Tier Limits

| Resource                    | Free Tier Limit          |
| --------------------------- | ------------------------ |
| Bandwidth                   | 100 GB / month           |
| Serverless Function Executions | 100 / day             |
| Build Minutes               | 6,000 / month            |
| Static Deployments          | Unlimited                |
| Team Members                | 1 (Hobby plan)           |

The playground is a fully static SPA (no serverless functions), so the primary constraint is bandwidth. Monitor usage in **Vercel Dashboard → Usage**.

## 6. SPA Routing

The `vercel.json` includes a rewrite rule that routes all non-asset requests to `index.html`, enabling client-side routing with React Router. No additional configuration is needed.

## 7. Security Headers

The following security headers are configured in `vercel.json`:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

Static assets under `/assets/` are served with long-lived cache headers (`max-age=31536000, immutable`) since Vite fingerprints filenames on each build.

## 8. Automatic Deployments

### Production Deployments (Push to `main`)

Vercel automatically deploys to production when commits are pushed to the `main` branch. This is configured via the `git.deploymentEnabled` setting in `vercel.json`:

```json
{
  "git": {
    "deploymentEnabled": {
      "main": true
    }
  }
}
```

Every merge to `main` triggers:
1. Vercel pulls the latest code from the `playground` root directory
2. Runs `npm install` followed by `npm run build` (Vite production build)
3. Deploys the `dist` output to the Vercel CDN edge network
4. The production URL is updated automatically

To verify a production deployment:
- Check the **Vercel Dashboard → Deployments** tab for build status
- The production URL reflects the latest `main` commit within ~60 seconds of a successful build

### Preview Deployments (Pull Requests)

Every pull request targeting `main` automatically receives a unique preview deployment URL. This allows reviewers to test changes in an isolated environment before merging.

Preview deployment behavior:
- Each PR gets a stable preview URL (e.g., `playground-<hash>.vercel.app`)
- The preview URL updates on every new commit pushed to the PR branch
- Vercel posts the preview URL as a comment on the GitHub PR
- Preview deployments use the same build pipeline as production
- Preview deployments are automatically deleted when the PR is closed

Configure preview environment variables separately in **Vercel Dashboard → Settings → Environment Variables** by scoping variables to the "Preview" environment. This lets you point previews at a separate Supabase project for testing.

### Auto-Aliasing

The `github.autoAlias` setting in `vercel.json` ensures that preview deployments are automatically aliased to readable URLs based on the branch name, making it easier to share and review.

## 9. Deployment Protection

### Branch Protection

To prevent accidental deployments from non-`main` branches to production:

1. In **Vercel Dashboard → Settings → Git**, confirm that the Production Branch is set to `main`.
2. Only pushes to `main` trigger production deployments; all other branches create preview deployments only.

### GitHub Branch Protection Rules

Configure these in **GitHub → Settings → Branches → Branch protection rules** for `main`:

- Require pull request reviews before merging (at least 1 approval)
- Require status checks to pass before merging (CI tests)
- Require branches to be up to date before merging
- Do not allow bypassing the above settings

This ensures every production deployment has been reviewed and tested.

### Vercel Deployment Protection (Dashboard)

In **Vercel Dashboard → Settings → Deployment Protection**:

- Enable **Vercel Authentication** for preview deployments so only team members can access them
- Production deployments remain publicly accessible (the playground is a public-facing app)

### HTTPS and Transport Security

All deployments are served over HTTPS by default. The `vercel.json` includes a `Strict-Transport-Security` header to enforce HTTPS:

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

## 10. Bandwidth and Free Tier Management

### Vercel Free Tier Limits

| Resource                 | Limit              | Playground Impact                |
| ------------------------ | ------------------ | -------------------------------- |
| Bandwidth                | 100 GB / month     | Primary constraint (static SPA)  |
| Build Minutes            | 6,000 / month      | ~2 min/build = ~3,000 builds     |
| Static Deployments       | Unlimited           | No concern                       |
| Serverless Executions    | 100 / day           | N/A (no serverless functions)    |
| Team Members             | 1 (Hobby plan)      | Single deployer                  |

### Bandwidth Optimization

Since the playground is a fully static SPA with no serverless functions, bandwidth is the primary cost driver. The following strategies keep usage well within the 100 GB/month limit:

1. **Aggressive asset caching**: Vite-fingerprinted assets under `/assets/` are served with `Cache-Control: public, max-age=31536000, immutable`. Returning visitors never re-download unchanged assets.
2. **No-cache for `index.html`**: The HTML entry point uses `Cache-Control: no-cache, no-store, must-revalidate` so users always get the latest deployment, while all heavy assets are served from cache.
3. **Code splitting**: Vite automatically code-splits the bundle so users only download the JavaScript needed for the current route.
4. **Clean URLs and SPA routing**: The rewrite rule serves `index.html` for all non-asset routes, avoiding unnecessary 404 responses.

### Monitoring Usage

- Check bandwidth consumption in **Vercel Dashboard → Usage**
- Set up email alerts in **Vercel Dashboard → Settings → Notifications** to get notified at 80% and 100% of the bandwidth limit
- If approaching the limit, consider enabling Vercel's built-in analytics to identify high-traffic pages

### What Happens at the Limit

If the 100 GB bandwidth limit is reached:
- Vercel will continue serving the site but may throttle or pause deployments
- The dashboard displays a warning with upgrade options
- Consider upgrading to the Pro plan ($20/month, 1 TB bandwidth) if sustained traffic exceeds free tier

## 11. Monorepo Configuration

The playground lives inside a monorepo. Vercel must be configured to only build when files in the `playground` directory change:

1. Set **Root Directory** to `playground` in **Vercel Dashboard → Settings → General**
2. Vercel's **Ignored Build Step** can be configured to skip builds when only non-playground files change. Add this in **Vercel Dashboard → Settings → Git → Ignored Build Step**:
   ```bash
   git diff --quiet HEAD^ HEAD -- .
   ```
   This tells Vercel to only build when files within the `playground` root directory have changed, saving build minutes.

## 12. Troubleshooting

| Issue                          | Solution                                                    |
| ------------------------------ | ----------------------------------------------------------- |
| Build fails on TypeScript      | Run `npm run build` locally first to catch type errors      |
| Blank page after deploy        | Verify the Root Directory is set to `playground`            |
| Supabase connection fails      | Check environment variables are set in Vercel dashboard     |
| 404 on page refresh            | Verify the rewrite rule in `vercel.json` is present         |
| Assets not loading             | Ensure `outputDirectory` is set to `dist`                   |

## 13. GitHub Actions CI/CD — Free Tier Optimization

### Free Tier Budget

GitHub Actions provides **2,000 minutes/month** for free on private repositories (unlimited for public). The playground CI/CD is optimized to stay well within this budget.

### Estimated Monthly Minutes Usage

| Workflow | Trigger | Est. Duration | Runs/Month | Minutes/Month |
| -------- | ------- | ------------- | ---------- | ------------- |
| CI (lint) | PR + push to main | ~2 min | 80 | 160 |
| CI (unit tests) | PR + push to main | ~4 min | 80 | 320 |
| CI (E2E tests) | PR + push to main | ~6 min | 80 | 480 |
| CI (PR comment) | PR only | ~1 min | 60 | 60 |
| CD (deploy) | push to main | ~3 min | 20 | 60 |
| CD (smoke test) | push to main | ~1 min | 20 | 20 |
| CD (notify) | push to main | ~1 min | 20 | 20 |
| **Total** | | | | **~1,120** |

This leaves ~880 minutes of headroom (~44% of the budget).

### Optimizations Applied

1. **Path filters**: Both CI and CD workflows only trigger on changes to `playground/**` or their own workflow file, skipping runs for unrelated monorepo changes.
2. **Concurrency groups**: CI uses `cancel-in-progress: true` to abort superseded runs on the same branch. CD uses `cancel-in-progress: false` to avoid interrupting active deployments.
3. **Parallel jobs**: Lint, unit tests, and E2E tests run in parallel (not sequentially), reducing wall-clock time per CI run.
4. **npm dependency caching**: All jobs use `actions/setup-node` with `cache: npm` to skip redundant `npm ci` downloads.
5. **Playwright browser caching**: E2E job caches `~/.cache/ms-playwright` so Chromium is only downloaded on lockfile changes.
6. **Chromium only**: Playwright runs against Chromium only (not Firefox/WebKit), cutting E2E time by ~60%.
7. **Job timeout limits**: Every job has a `timeout-minutes` cap (5–15 min) to prevent runaway builds from consuming the budget.
8. **Short artifact retention**: Artifacts are retained for 7 days instead of the default 90, reducing storage pressure.

### Scaling Beyond Free Tier

If the team grows beyond ~80 PRs/month or adds more workflows:

- Switch to a public repository (unlimited Actions minutes)
- Upgrade to GitHub Team plan (3,000 min/month)
- Add `paths-ignore` filters to further reduce unnecessary runs
- Consider self-hosted runners for heavy E2E workloads
