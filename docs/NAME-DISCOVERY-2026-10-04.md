# Name discovery — 4 October 2026

## Observed baseline

- A signed-in Google search for `vyas devgna` showed LinkedIn and GitHub above the user's websites. Neither the portfolio nor the blog appeared on the first results page inspected. This is one personalised result set, not a universal ranking measurement.
- Google already displayed an AI Overview describing Devgna Vyas, with LinkedIn and GitHub among its cited sources. Website citations cannot be selected by the publisher.
- Search Console URL Inspection confirmed both homepages are indexed, crawlable, and use their own canonical URLs. The portfolio's recorded crawl was 1 October; the blog's was 4 October at 9:43 AM, before these identity changes.
- The blog sitemap index reports Success and six discovered pages in Search Console. The current child sitemap contains 19 public URLs, including all seven articles. Discovered-page counts do not prove individual article indexing.
- The portfolio sitemap reports Couldn't fetch; URL Inspection describes a Temporary processing error for sitemaps. Direct requests, including a Googlebot user-agent request, return HTTP 200 with valid XML, one canonical page, and image entries. This does not prove Google's internal fetch succeeds. The earlier resubmission remains pending; repeatedly resubmitting unchanged XML is unnecessary.

## Changes shipped

- Blog site identity, titles, social metadata and RSS now use `Devgna Vyas Blog`; the visual Vyas brand remains.
- Both sites identify one Person at `https://vyasdevgna.online/#person`, with given/family names and the existing public name variant `Vyas Devgna`.
- The blog author profile and portfolio biography visibly explain the name variant and link the sites. The author page links the published HERMES chapter, its results article, GitHub and LinkedIn.
- These shared author fields apply to every article on the next manual build. Existing sitemap, RSS, feeds, canonical tags and publication checks continue to cover new posts. No automatic publishing was added.

## Verification

- Blog: 84 Astro files checked with zero diagnostics; 39 unit tests passed; formatting and production build passed; built-script CSP and seven-article publication gates passed.
- Portfolio: static assets/anchors, generated gallery and JavaScript syntax checks passed. GitHub Pages deployment and quality workflow succeeded for `7a1ed1b`.
- Production HTML for both sites contains the intended Person ID, name variant and visible biography. The blog homepage contains the full site name.
- Blog release: `afe7997`; Cloudflare version `1cac860c-3cae-4894-8410-32668571976c`. IndexNow accepted ten public URLs with HTTP 200; this is not a Google ranking or indexing confirmation.
- Portfolio and blog homepage recrawl requests were accepted by Search Console after the new HTML was confirmed live. Both were added to the priority crawl queue; the changed HTML is not yet confirmed in Google's index.

## Remaining limits

Rank #1 for the portfolio, rank #2 for the blog, and inclusion as an AI Overview source are objectives, not verified outcomes or settings we can enforce. Google must recrawl, process and rank the pages. Broader technical keywords also require substantive relevant articles and earned references; metadata changes cannot establish authority by themselves.

The GitHub profile already links the portfolio in its README, but its dedicated website field is blank. An attempted update was rejected because the existing CLI credential lacks the user-profile scope; the browser is signed out. No new permissions or credentials were created.

Google's guidance: [AI features and your website](https://developers.google.com/search/docs/appearance/ai-features). Indexed pages eligible for snippets can be considered for AI features; no special AI files or additional schema are required, and serving is not guaranteed.

## Follow-up — 5 October 2026

- Added the public portfolio and blog URLs to their respective GitHub repository homepage fields, which were previously empty. Verified the saved values through GitHub's API.
- Published a short identity paragraph in the existing public GitHub profile README linking both websites and explaining the Devgna Vyas / Vyas Devgna name order. Existing content was preserved. Commit: `77a633eb2f565d20f6bb735b53cd008373719fc5` in `vyas-devgna/vyas-devgna`.
- Retrieved production HTML from the portfolio and blog author page: both still expose the same Person ID and name variants, with no noindex or snippet restrictions detected in that HTML.
- These links make the websites easier to find from public GitHub pages. Their effect on Google ranking and AI citations has not been measured or established.
- Browser control is unavailable in this turn. Today's Search Console processing status, current Google positions, and changed AI Overview citations were not verified. Yesterday's accepted recrawl requests should not be reported as new indexing successes.

## Official guidance checked — 5 October 2026

- Google's current AI search guide says eligibility requires an indexed page that can appear with a snippet and inclusion in Search Console's Search generative AI control. It prioritizes original, useful content, clear crawlable site structure, and consistent visible/schema facts; it warns that publishing pages for query variants or `llms.txt`/other “GEO hacks” does not improve quality and can be spammy.
- Google's Search Console help says generative AI inclusion is the default at all websites, and a subdomain inherits the nearest configured parent setting unless explicitly overridden. The domain `vyasdevgna.online` is therefore expected to include `blog.vyasdevgna.online` absent a manual override. The setting could not be read in the signed-in browser during this run; check Search Console → Settings → Search generative AI in Search Console for an exclusion or child-property override.
- Search Console's Generative AI performance report is rolled out worldwide and can show AI Overview/AI Mode impressions and linked pages. Report absence can indicate no impressions or an excluded setting. This account report could not be inspected without browser controls.
- Google also says title links draw from the page title, prominent headings/text, anchor text, and `WebSite` markup, and it may take days to weeks to reprocess edits. Its site-name guidance requires one consistent name and canonical homepage per domain/subdomain; the existing portfolio and blog already have those.
- The only new on-page change for this query is a single natural first-screen mention of the established name variant on each homepage. No keyword-variant pages, artificial backlinks, fabricated identity details, or extra AI text files were added.

Sources: [Google AI optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide), [Search generative AI control](https://support.google.com/webmasters/answer/16908024), [Generative AI performance report](https://support.google.com/webmasters/answer/16984139), [title links](https://developers.google.com/search/docs/appearance/title-link), and [site names](https://developers.google.com/search/docs/appearance/site-names).

## Release — 5 October 2026

- The single first-screen alias mention shipped on both homepages: portfolio commit `2d3720a`; blog commit `84ca3c0`. Production HTML on both sites was fetched and contained the new wording.
- The portfolio quality check and GitHub Pages deployment both succeeded for `2d3720a`. The blog typecheck, formatting, production build, CSP and publication checks succeeded. Wrangler reported a transient custom-domain trigger fetch warning, but Cloudflare's deployment list showed version `3fb66e6d-f4bf-4a5f-837a-3dcdd00f459e` serving 100%, and the updated page returned HTTP 200 with the alias visible.
- IndexNow accepted 10 blog URLs with HTTP 200. IndexNow is not a Google indexing or ranking confirmation.
- Google Search results, Search Console's GAIR inclusion setting, AI impression report and new crawl status were unavailable for direct verification in this run.

## Follow-up — 5 October 2026

- Updated both homepage sitemap `lastmod` values after the visible name clarification shipped. The blog build now advances its homepage date when newer article updates change its homepage cards; the portfolio's static sitemap date matches its homepage revision.
- Google's guidance says `lastmod` should report verifiable significant page changes and is only a crawl hint. No ranking or indexing outcome is implied by this metadata update.
- Search Console controls and performance remain unverified because this session has no browser-control or Search Console API capability.

## Follow-up — 6 October 2026

- Google's current AI search guidance says eligible, indexed pages can appear in AI features using ordinary SEO fundamentals; Google understands synonyms, does not require AI-specific formatting/schema, and warns against pages or mentions made mainly to manipulate rankings. The existing portfolio and blog already share one Person entity with the `Vyas Devgna` alternate name, visible biographies, profile pages, and cross-links, so no keyword-variant pages or extra schema were added.
- Left the homepage titles unchanged: both name forms are already present in visible identity copy and structured data. Google's title guidance favors concise, descriptive titles and warns that repeated keyword phrases can look spammy.
- Corrected the portfolio's HERMES `ScholarlyArticle.datePublished`: `icSoftComp 2025` is the conference year, while Crossref's DOI record says the Springer chapter was published online on 11 April 2026. Added the DOI URL to the structured article and made the visible publication label distinguish both years.
- Added that same publication-date distinction to the HERMES article and advanced its `updatedAt`; the article sitemap and homepage `lastmod` now reflect the correction. The card still shows the original article publication date.
- Both live homepages remain crawlable/indexable with HTTP 200 and canonical URLs. Mobile Lighthouse was 94/100 performance and 100/100 SEO on both sites; the provided-network runs had 0 ms TBT and 0 CLS. The current measurements did not identify a material change worth risking for a small lab-score gain.
- Search Console's current query report, post-edit URL inspection, AI inclusion setting, and AI performance report could not be accessed from this task's available tools. Rankings and AI citations are therefore still unverified.

Sources: [Google AI search guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide), [Google title-link guidance](https://developers.google.com/search/docs/appearance/title-link), [Google crawling/indexing FAQ](https://developers.google.com/search/help/crawling-index-faq), and [Crossref DOI record](https://crossmark.crossref.org/dialog/?doi=10.1007%2F978-3-032-22062-2_24).

## Release — 6 October 2026

- Portfolio commit `460a80c` passed its quality workflow and GitHub Pages deployment. A Googlebot user-agent fetch returned HTTP 200; live JSON-LD has the verified 2026-04-11 date and DOI URL, and the sitemap has `lastmod` 2026-10-06.
- Blog commit `0428dbb` passed CI and deployed to Cloudflare as version `a320853a-ae10-4d8d-886b-521ababaa6fd`. The live article contains the conference/publication date distinction and its sitemap reports `lastmod` 2026-10-06. IndexNow accepted 10 URLs with HTTP 200.
- These deployments correct metadata and publication facts; they do not verify Google recrawling, query positions, or AI citations. Search Console access is still required to check those outcomes.
