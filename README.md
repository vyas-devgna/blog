# Vyas publication

Astro publication and small community platform for `blog.vyasdevgna.online`. Articles remain Markdown/MDX in Git and prerender as static HTML. Auth, profiles, comments, discussions, and moderation use server routes on Cloudflare Workers and Neon PostgreSQL.

## Current production state

- The current application build is deployed to `https://blog.vyasdevgna.online`.
- The community schema and nine default categories are applied to Neon `main`.
- Email/password auth requires one-time-code email verification. Google uses Neon’s shared OAuth provider and the SDK’s challenge-verified callback. Neon SMTP accepted test and verification messages.
- Email signup is enabled with the Cloudflare Turnstile server secret installed. The site key is public configuration; the secret is not stored in Git.
- The moderator account still needs to sign up and verify its email before its application profile can be promoted.
- In-app notifications are available. Optional community email notifications remain off until `RESEND_API_KEY` is configured on the Worker.
- Independent off-site backups and a disposable restore drill remain open; see [backup and restore](docs/BACKUPS.md).

This is a deployed setup build, not a completed formal V1 release. Do not create a release tag until the remaining setup and production flows have been verified.

## Local development

- Node.js 22.12 or newer
- pnpm 12.6.0

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Validate with `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build`.

## Publishing an article

Add a `.md` or `.mdx` file under `src/content/blog/` with `title`, `description`, and `publishedAt`; optional fields include `updatedAt`, `tags`, `featured`, `cover`, and `canonical`. Keep `draft: true` until publication. Article data and assets stay in Git and do not use the community database.

## Architecture

- Astro 7, TypeScript, and MDX.
- Cloudflare Workers with Workers Static Assets; public articles are prerendered.
- Neon PostgreSQL and Neon Managed Auth.
- Drizzle ORM with migrations in `drizzle/migrations/`.
- A restricted `blog_runtime` database role is stored as the Worker `DATABASE_URL` secret; the browser never receives it.
- Signup spam checks use Cloudflare Turnstile with server-side Siteverify validation.
- Neon SMTP handles verification and password-reset mail; Resend is optional for community reply/moderation email notifications.

See [deployment](docs/DEPLOYMENT.md), [operations](docs/OPERATIONS.md), [moderation](docs/MODERATION.md), [backup and restore](docs/BACKUPS.md), and [architecture](docs/ARCHITECTURE.md).
