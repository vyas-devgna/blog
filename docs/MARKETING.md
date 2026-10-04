# Distribution playbook

What is built, how to get the articles in front of readers, and what to avoid.

## Already in place

- Per-article social cards (`/og/<slug>.png`), canonical URLs, `BlogPosting` and breadcrumb structured data, a sitemap with real `lastmod` dates, RSS, `llms.txt`, and `/posts.json` (feeds the portfolio).
- Instant navigation (speculation rules), an installable app, share buttons and related reading on every article, and a "Start here" shelf on the home page driven by `featured: true`.
- IndexNow: run `pnpm indexnow` after a deploy to notify Bing, Yandex and other participating engines.

## Search engines (needs your accounts)

1. Verify the site in Google Search Console and Bing Webmaster Tools.
2. Submit `https://blog.vyasdevgna.online/sitemap-index.xml` to both.
3. Watch the Performance report for the queries each article actually earns, and tighten titles and descriptions around them.

Expect weeks, not days. A new site has no history, so early traffic comes mostly from sharing, not search.

## Where each article fits

| Article                           | Best audiences                               | Angle for the first line                                               |
| --------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------- |
| Agent memory is an attack surface | AI-agent builders, security engineers        | A payload planted in a memory file attacks every future session.       |
| MCP security checklist            | People wiring up MCP servers, platform teams | The spec already names seven attacks; here is what each means for you. |
| HERMES benchmark reading          | Edge/IoT, network security, ML engineers     | How to question any intrusion-detection number, including ours.        |
| Reviewing AI-written code         | Engineering leads, reviewers                 | A one-line "cleanup" that passes the tests and breaks authentication.  |
| Browser-to-browser transfer       | Web developers                               | The part of WebRTC nobody mentions: backpressure and TURN.             |
| Local-first convergence           | Web and distributed-systems developers       | How two people dragging one shape agree, in a dozen lines.             |
| How this blog is built            | Astro/Cloudflare builders                    | Static articles, a small Worker, and the guards around it.             |

## Channels

- **LinkedIn / X:** one post per article with the social card, a two-sentence hook, and a single link. Put the link in the first reply on platforms that suppress outbound links.
- **Hacker News:** submit with the exact article title, no editorialising, and only articles you would be happy to discuss in the comments. One submission per article; do not re-submit.
- **Reddit:** pick subreddits where the topic is on-topic, read their self-promotion rules first, and take part in the community beyond your own links.
- **Dev.to / Hashnode:** cross-post with the canonical URL pointing back here, a few days after publishing.
- **Your repositories:** add a "Further reading" line to the READMEs of LIWM, Braids, ez-drop and EzBoard linking the matching article. These are the highest-trust links you can earn today.

## Cadence

Seven posts at once is fine for the site and a poor fit for attention. Share one every few days. If you prefer to publish on a schedule, set a future `publishedAt`: posts dated in the future stay hidden until a build after that date.

## Keep it honest

- Use true dates. Back-dating articles misleads readers and breaks search-engine guidelines on misleading dates. When you revise an article, add an honest `updatedAt`.
- Re-check time-sensitive claims (the OWASP list, the MCP specification version) before sharing an older article.
- No bought links, comment spam, or manufactured engagement.
