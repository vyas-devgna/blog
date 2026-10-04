# Deployment

## Production resources

- Domain: `blog.vyasdevgna.online` on Cloudflare Workers Static Assets.
- Worker: `blog`.
- Neon project: `fancy-silence-20394887`, branch `main`.
- Auth provider: Neon Managed Auth at the Worker-configured base URL; only `https://blog.vyasdevgna.online` is a trusted origin.
- `SESSION` binds to the existing Cloudflare KV namespace `blog-session`.

## Worker configuration

Public non-secret variables are in `wrangler.jsonc`: `PUBLIC_SITE_URL`, `NEON_AUTH_BASE_URL`, and the public `TURNSTILE_SITE_KEY`. The Worker secrets are configured separately and must never be added to Git:

- `DATABASE_URL` — Neon `blog_runtime` role, limited to application tables.
- `NEON_AUTH_COOKIE_SECRET` — Worker-side secure cookie signing secret.
- `TURNSTILE_SECRET_KEY` — required before signup or new-user posting can pass Siteverify; not yet configured.
- `RESEND_API_KEY` — optional; enables reply/moderation email notices.

The Neon Auth custom SMTP provider is saved as `no-reply@notify.vyasdevgna.online`. A test message was dispatched successfully. Auth is configured to require email verification and send an OTP, while provider signups remain disabled until the Turnstile Worker secret is installed.

Turnstile is checked server-side on this site's signup route. Neon Auth also exposes a managed auth endpoint; the site challenge is abuse friction for this route, not a network-level restriction on direct requests to that provider.

## Deploy

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm deploy
```

`pnpm deploy` rebuilds and publishes the Worker and static assets. CI currently validates pull requests and pushes to `main`; production deployment is manual. The last setup build was deployed on 2026-10-04. It is not a formal V1 release.

## Enable signup after installing Turnstile

Install the existing widget's secret with Wrangler's hidden prompt:

```sh
pnpm exec wrangler secret put TURNSTILE_SECRET_KEY --name blog
```

Then enable email signup on Neon only after the Worker secret is present:

```sh
pnpm exec neon neon-auth config email-password update \
  --project-id fancy-silence-20394887 --branch main --profile blog-setup \
  --enabled true --email-verification-method otp \
  --require-email-verification true --auto-sign-in-after-verification true \
  --send-verification-email-on-sign-up true --disable-sign-up false
```

Verify with `GET /api/community/config` (`signupEnabled: true`) and complete a real signup and email-verification flow before tagging a release.

## Migrations

Migrations are committed under `drizzle/migrations/`. The application schema migration has been applied to Neon `main`; the command is `pnpm db:migrate` with the intended `DATABASE_URL` in the environment. The repository does not contain database credentials. Use a disposable Neon branch for migration and restore checks.
