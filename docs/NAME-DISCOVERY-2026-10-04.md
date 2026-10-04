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
