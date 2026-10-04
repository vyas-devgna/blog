# Publishing and discovery

Publishing is manual, as requested. There is no Git-to-production connection or scheduled publisher.

## Publish a post

1. Add Markdown/MDX under `src/content/blog/`. Supply a truthful title, description, publication timestamp and relevant tags. Keep `draft: true` while editing. Use `updatedAt` for a substantive revision, without changing the original publication date.
2. Add original artwork to `src/assets/covers/<slug>.png` if available. `node scripts/generate-covers.mjs` creates 480, 800 and 1200 pixel WebP files under `public/covers/`, with a hash of the source in each filename. Set `cover` to its `/covers/<slug>-<hash>-1200.webp` path and `coverAlt` to a short visual description. These generated derivatives are ignored in Git; commit the source art and front matter. After replacing source artwork, update its hash in `cover`.
3. Remove `draft: true` when ready. Set `featured: true` only for the small editorial “Start here” shelf. Future-dated posts stay hidden until a build after their timestamp.
4. Run `pnpm typecheck`, `pnpm lint`, `pnpm test:unit` and `pnpm build`. Review the page and social card. Commit and push the source, then run `pnpm deploy` from the intended commit.

## What every build updates

- Prerendered article HTML, canonical URL, description and social metadata.
- BlogPosting and BreadcrumbList structured data, with real dates and author identity.
- Responsive compressed artwork and a 1200 × 630 JPEG social card.
- Writing and topic archives, featured shelf, related reading and internal links.
- RSS, `llms.txt`, `/posts.json` for the portfolio, and sitemap entries with article last-modified dates.

The publication check verifies that published articles have HTML metadata, feeds, social cards and existing cover variants, and that drafts or scheduled posts do not leak into feeds or the sitemap. Custom canonical URLs remain supported. Artwork is optional for future posts; the existing abstract fallback remains available until original art is supplied.

## After deployment

`pnpm deploy` sends the current public URLs to IndexNow after Wrangler succeeds. If notification fails, retry `pnpm indexnow`; a notification error does not undo an already successful deployment. IndexNow does not notify Google. Google discovers new posts through the sitemap already submitted in Search Console and through crawlable links. It controls crawl timing, indexing and rankings.

Check the deployed article and social image before distributing the link. No automatic social posting, new API keys, paid promotion or manufactured engagement is configured. See `MARKETING.md` for distribution guidance.
