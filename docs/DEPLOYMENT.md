# Deployment

## Prerequisites

1. The `vyasdevgna.online` zone is active in the authenticated Cloudflare account; no existing `blog` DNS record was present when checked.
2. Wrangler is authenticated locally. Keep the credential in the OS keyring; use a project-scoped CI token if CI deployment is later added.
3. Confirm current Worker quotas before production use.

## Deploy

`pnpm deploy` builds then deploys the Worker. Wrangler is configured for the `blog.vyasdevgna.online` custom domain and public Neon Auth base URL. Deployment creates DNS and certificate records for that hostname. CI currently validates builds only and does not deploy.

## Pre-release checklist

- Provision a Cloudflare Worker by deploying the validated build.
- Set `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `DATABASE_URL`, `RESEND_API_KEY`, and `TURNSTILE_SECRET_KEY` only after their features/services are implemented.
- Configure Neon migration credentials and run migrations against the intended environment.
- Verify email, Turnstile, OAuth redirects (if enabled), analytics, backups, and production smoke tests.
- Tag and publish a release only after full V1 checks are operational.

Production release remains blocked by the unfinished application backend and community features, missing Resend/Turnstile setup, and absent production smoke and backup restore checks.
