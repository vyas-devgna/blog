# Architecture

## Publication path

Markdown/MDX under `src/content/blog/` is validated as an Astro content collection and prerendered at build time. Cloudflare Workers Static Assets serves generated pages and public files; readers do not need Neon, a session, or client-side rendering to read articles. MDX is authored only by the repository maintainer.

## Planned dynamic path

Community routes will run on the Astro Cloudflare adapter: request → session/authentication → authorization → input validation and abuse checks → Drizzle → Neon PostgreSQL. Browser code must never receive database or service credentials. This path is not implemented in this release.

## Decisions

- Static publication content remains in Git.
- Neon is reserved for user-generated community data.
- No separate API service or client-side UI framework is used.
- Platform secrets belong in Wrangler/Cloudflare secret storage, not this repository.
