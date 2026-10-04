# Deployment

## Prerequisites

1. The `vyasdevgna.online` zone is active in the authenticated Cloudflare account; no existing `blog` DNS record was present when checked.
2. Wrangler is authenticated locally. Keep the credential in the OS keyring; use a project-scoped CI token if CI deployment is later added.
3. Confirm current Worker quotas before production use.

## Deploy

`pnpm deploy` builds then deploys the Worker. The Worker is deployed to the `blog.vyasdevgna.online` custom domain. Wrangler config supplies the public Neon Auth base URL, and the pooled `DATABASE_URL` is stored as an encrypted Worker secret. CI currently validates builds only and does not deploy.

## Pre-release checklist

- Provision a Cloudflare Worker by deploying the validated build.
- Neon sign-ups remain disabled. The sender `no-reply@notify.vyasdevgna.online` is saved in Neon Managed Auth's custom SMTP configuration; end-to-end email delivery has not been tested. The pooled DB URL is provisioned, but no schema or application database client is active yet.
- Application email flows, Turnstile checks, and Cloudflare Web Analytics are not integrated. Configure `RESEND_API_KEY` or `TURNSTILE_SECRET_KEY` for the Worker only when an implemented application flow needs them.
- Configure Neon migration credentials and run migrations against the intended environment.
- Verify email, Turnstile, OAuth redirects (if enabled), analytics, backups, and production smoke tests.
- Tag and publish a release only after full V1 checks are operational.

The complete community V1 remains incomplete: application auth routes, database schema, community features, Turnstile integration, analytics, and a tested backup restore flow are not part of the static publication release. The static deployment's root, blog index, discussions page, robots, sitemap, and RSS endpoints returned HTTP 200 after deployment.
