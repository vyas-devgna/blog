# Vyas publication

An Astro publication for `blog.vyasdevgna.online`. Public writing is authored in Markdown or MDX and built to static files; Cloudflare Workers Static Assets serves those files, with the Worker reserved for routes that need server-side work.

## Current state

The static publication foundation is deployed at `https://blog.vyasdevgna.online`. Neon project `blog` exists in Singapore, Neon Managed Auth is enabled on its `main` branch with the production origin trusted, and its custom SMTP provider is saved with the sender `no-reply@notify.vyasdevgna.online`. Sign-ups remain disabled. The Worker has a pooled `DATABASE_URL` secret and public auth endpoint configured, but no application database client, schema, or auth flow uses them yet. The Resend credential is held by the Neon SMTP configuration and is not stored in this repository or the Worker. Community features and application email flows are not implemented; Turnstile and Web Analytics are not integrated into the site.

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
- Neon PostgreSQL and Managed Better Auth are provisioned; the SMTP sender is configured, but no schema or live database client is active yet
- Resend sending credentials are held by Neon Auth for its SMTP provider; application email flows are not implemented
- Cloudflare Turnstile and Web Analytics are not integrated into the site

## Provider CLI authentication

The project includes Wrangler and the Neon CLI. Sign in locally with:

```sh
pnpm exec wrangler whoami
pnpm exec neon me --profile blog-setup
```

Wrangler credentials are in the OS keyring. The Neon CLI profile `blog-setup` is in the OS keyring and is restricted to the blog project. Do not paste tokens into source files, issues, or chat. The local `.neon` project link is ignored by Git; database credentials were not pulled into `.env`.

See [architecture](docs/ARCHITECTURE.md), [deployment](docs/DEPLOYMENT.md), [backup and restore](docs/BACKUPS.md), [SEO](docs/SEO.md), [moderation](docs/MODERATION.md), and [operations](docs/OPERATIONS.md).
