# Deployment

## Prerequisites

1. The `vyasdevgna.online` zone is active in the authenticated Cloudflare account; no existing `blog` DNS record was present when checked.
2. Wrangler is authenticated locally. Keep the credential in the OS keyring; use a project-scoped CI token if CI deployment is later added.
3. Confirm current Worker quotas before production use.

## Deploy

`pnpm deploy` builds then deploys the Worker. The Worker is deployed to the `blog.vyasdevgna.online` custom domain. Wrangler config supplies the public Neon Auth base URL, and the pooled `DATABASE_URL` is stored as an encrypted Worker secret. CI currently validates builds only and does not deploy.

## Pre-release checklist

- Provision a Cloudflare Worker by deploying the validated build.
- Neon sign-ups are disabled until a verified transactional email sender is configured. The DB URL is provisioned, but no schema or database client is active yet.
- Configure `RESEND_API_KEY` and `TURNSTILE_SECRET_KEY` only after the corresponding app flows are implemented; configure Cloudflare Web Analytics when its snippet can be integrated.
- Configure Neon migration credentials and run migrations against the intended environment.
- Verify email, Turnstile, OAuth redirects (if enabled), analytics, backups, and production smoke tests.
- Tag and publish a release only after full V1 checks are operational.

Production release remains blocked by the unfinished application backend and community features, missing Resend/Turnstile setup, and absent backup restore checks. The static deployment's root, blog index, discussions page, robots, sitemap, and RSS endpoints returned HTTP 200 after deployment.
