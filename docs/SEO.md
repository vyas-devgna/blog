# Search and publication architecture

## Indexing policy

The publication sitemap advertises the home, about, projects, writing, topics and discussions index routes, plus every published article and its topic archives. Account, verification, moderation, notifications, internal search, user profiles and error pages are excluded. Private and search pages carry `noindex, follow`; robots.txt allows crawlers to read that directive. Drafts and posts dated in the future are excluded from routes, feeds and archives. A scheduled post needs a build after its publication date.

`community-sitemap.xml` is separate from the static publication sitemap. It includes only visible, explicitly indexable threads in active categories with active authors. Thread pages apply the same indexing conditions. New members' threads remain non-indexable until the existing trust/moderation policy permits them. An unavailable database returns HTTP 503 with Retry-After, rather than advertising an empty successful sitemap. Profiles remain non-indexable.

## Structured data and media

`src/lib/seo.ts` defines the shared author identity at `https://vyasdevgna.online/#person`. All blog pages identify the website; the home identifies the Blog, About identifies the author ProfilePage, and article pages emit BlogPosting and BreadcrumbList JSON-LD. Indexable discussions emit DiscussionForumPosting. Structured data reflects visible content; no ratings, reviews, essays, or publication claims are fabricated.

The portfolio identifies the same person and links back to the publication. Its committed gallery is generated from gallery.json so photography is readable without JavaScript. Its sitemap contains the canonical portfolio page and actual photo URLs.

Canonical metadata, social previews, image dimensions, descriptive titles, RSS discovery and crawlable navigation are rendered as HTML. The navigation logo is optimized during the Astro build; the supplied source remains unchanged. Incomplete duplicate article microdata was removed in favor of the complete JSON-LD entry.

## Search Console

The existing `sc-domain:vyasdevgna.online` property covers portfolio and blog subdomains. Braids has its own existing submitted sitemap and is outside this change. The portfolio sitemap and blog sitemap index were submitted through the existing verified Google property on 2026-10-04. The empty community sitemap should be submitted when there are eligible public threads. Google controls crawling, indexing and rankings; a sitemap or Lighthouse SEO score does not guarantee indexing.

## Verification

Unit tests cover sitemap exclusions, publication dates, XML escaping and shared API failure handling. Builds reject executable inline scripts that violate the site's CSP. Inspect production metadata, real HTTP statuses, sitemap URLs, images and Search Console submission statuses after deploying. Record PageSpeed mobile and desktop results separately, with report date; lab scores can vary. Field Core Web Vitals need sufficient real traffic.
