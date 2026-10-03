# Vyas publication

An Astro publication for `blog.vyasdevgna.online`. Public writing is authored in Markdown or MDX and built to static files; Cloudflare Workers Static Assets serves those files, with the Worker reserved for routes that need server-side work.

## Current state

The public publication foundation is implemented. Account and community features are not operational yet; they require a Neon project, Cloudflare account access, and transactional email/bot-protection setup. This repository does not claim a production deployment.

## Local development

- Node.js 22.12 or newer
- pnpm 12.6.0

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Validate with `pnpm typecheck`, `pnpm lint`, `pnpm test:unit`, and `pnpm build`.

## Publishing an article

Add a `.md` or `.mdx` file under `src/content/blog/` with `title`, `description`, `publishedAt`, and optional `updatedAt`, `tags`, `featured`, `cover`, and `canonical` front matter. Keep `draft: true` until ready; omit it or set it to `false` to publish. The collection schema checks metadata during the build. Commit the article and deploy after production setup is complete.

## Architecture

- Astro 7 with TypeScript and MDX
- Cloudflare Workers with Static Assets; public article pages are prerendered
- Neon PostgreSQL and Drizzle dependencies are present, but no schema or live database client is active yet
- Cloudflare Analytics, Turnstile, Resend, and Better Auth are not configured

## Provider CLI authentication

The project includes Wrangler and the Neon CLI. Sign in locally with:

```sh
pnpm exec wrangler login --scopes user:read workers:write zone:read --use-keyring
pnpm exec neon auth
```

These commands open provider sign-in/authorization flows and store credentials in the local keyring/profile. Do not paste tokens into source files, issues, or chat. The required Cloudflare and Neon account sign-ins are not complete in this environment yet.

See [architecture](docs/ARCHITECTURE.md), [deployment](docs/DEPLOYMENT.md), [backup and restore](docs/BACKUPS.md), [SEO](docs/SEO.md), [moderation](docs/MODERATION.md), and [operations](docs/OPERATIONS.md).
