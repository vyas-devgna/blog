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
- `TURNSTILE_SECRET_KEY` — installed; required for signup and new-user posting Siteverify checks.
- `RESEND_API_KEY` — optional; enables reply/moderation email notices.

The Neon Auth custom SMTP provider is saved as `no-reply@notify.vyasdevgna.online`. A test message was dispatched successfully. Auth is configured to require email verification and send an OTP, and email signup is enabled after installation of the Turnstile Worker secret.

Turnstile is checked server-side on this site's signup route. Neon Auth also exposes a managed auth endpoint; the site challenge is abuse friction for this route, not a network-level restriction on direct requests to that provider.

## Deploy

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm deploy
```

`pnpm deploy` rebuilds, validates publication metadata and assets, publishes the Worker and static assets, then notifies IndexNow-compatible engines. A notification failure is a separate error after a successful deployment; inspect the output before retrying a deploy. CI currently validates pull requests and pushes to `main`; production deployment is manual. The last setup build was deployed on 2026-10-04. It is not a formal V1 release.

## Signup recovery configuration

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

## Google and account navigation

Google uses the existing Neon shared OAuth application. Both Login and Join call the same provider route, preserving existing accounts through the provider’s verified-email linking rules. Callbacks are fixed to `/auth/callback/`; the Neon SDK exchanges the verifier and sets HttpOnly cookies. Local return paths reject cross-origin targets and control characters.

The public session response excludes tokens and JWT headers. Privileged community routes bypass the SDK cookie cache to check revoked sessions. Navigation initializes immediately and refreshes on restored page display and tab visibility, replacing anonymous links with the account menu. Generated scripts remain external to satisfy the site’s Content Security Policy. Rewritten auth JSON responses clear upstream encoding headers.

## Verification mail

`notify.vyasdevgna.online` has verified DKIM and SPF, and a published DMARC monitoring policy. Open and click tracking are disabled. Provider delivery does not prove placement in the inbox; a new sending domain has little reputation. Check Resend delivery status and the recipient’s actual Authentication-Results headers before changing DNS authentication or buying a sending service.

## Live checks — 2026-10-04

Google sign-in completed into `/settings/`, provisioning the nominated verified moderator. The moderator dashboard loaded successfully. The landing page replaced Sign in/Join with the profile menu and changed the community CTA to Your account. The one-time moderator bootstrap secret was retired after confirming the verified profile.

Live signup config reports `signupEnabled: true`. Login and Join show Google controls. Unknown routes return HTTP 404 with the custom recovery page. OAuth rejects other providers and foreign origins; missing/invalid callback challenges redirect to a local sign-in error. Local checks include session guard, proxy boundary, navigation initialization, and redirect tests. The build checks generated HTML for executable inline scripts that would violate CSP.

Independent encrypted backup and a complete restore drill remain outstanding; this deployment is not a formal V1 release.
