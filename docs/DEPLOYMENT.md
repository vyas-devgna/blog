# Deployment

## Prerequisites

1. A Cloudflare account with the `vyasdevgna.online` zone active.
2. Verify no existing CNAME occupies `blog.vyasdevgna.online`; Wrangler custom domains cannot replace an existing CNAME. Preserve all unrelated records.
3. Authenticate Wrangler locally with `pnpm exec wrangler login`, or configure a least-privilege CI token in GitHub Actions.
4. Confirm current Worker quotas before production use.

## Deploy

`pnpm deploy` builds then deploys the Worker. Wrangler is configured for the `blog.vyasdevgna.online` custom domain. Do not deploy until the production zone and account are verified; deployment may create DNS and certificate records for that hostname. CI currently validates builds only and does not deploy.

## Pre-release checklist

- Configure the Cloudflare custom domain without changing unrelated DNS.
- Set `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `DATABASE_URL`, `RESEND_API_KEY`, and `TURNSTILE_SECRET_KEY` only after their features/services are implemented.
- Configure Neon migration credentials and run migrations against the intended environment.
- Verify email, Turnstile, OAuth redirects (if enabled), analytics, backups, and production smoke tests.
- Tag and publish a release only after full V1 checks are operational.

Production release is blocked by missing Cloudflare account/zone setup and unresolved DNS, as well as unfinished backend features.
