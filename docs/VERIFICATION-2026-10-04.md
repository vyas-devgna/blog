# Deployment verification — 2026-10-04

## Shipped changes

Seven original editorial images replace the article mock covers. PNG masters are committed under `src/assets/covers`; the build supplies hashed 480/640/800/1200 WebP derivatives and JPEG social previews. Images have descriptive alternative text, dimensions and appropriate loading priority. See `ARTWORK.md` for subjects and generation provenance.

The HERMES article was revised against the supplied eight-page manuscript, including its actual hardware, pipeline, evaluation setup, tables and reporting discrepancies. The portfolio labels 94.7% as reported accuracy and 4.2 W as average per node, links the detailed analysis, and depicts the reported two-node testbed. See `HERMES-FACT-CHECK.md` for the claim ledger. No experiment was rerun and the source PDF was not published.

Public reading remains static. Accounts and community remain separate backend functions. Publishing is manual; builds update metadata, structured data, feeds, archives, related links, the portfolio JSON feed and sitemaps. The manual deployment command notifies IndexNow. The final blog deployment returned HTTP 200 for ten public URLs; acceptance is not proof of indexing. `SHARING-KIT.md` contains prepared distribution copy, not messages posted to social accounts.

## Checks

- Blog: 38 unit tests in nine files passed; Astro checked 84 files with zero errors, warnings or hints; Prettier passed. The production build passed CSP/script checks and verified all seven published articles, metadata, feeds, cover variants and social cards.
- Blog functional deployment: commit `f0e1ec7`, Cloudflare Worker version `7e259948-d30b-4a1d-8648-ac1d42045f5f`; GitHub CI passed.
- Portfolio: JavaScript syntax, generated gallery and static asset checks passed (26 IDs, 110 assets, 21 source photographs). GitHub quality and Pages deployment checks passed for final commit `bc2b9f4`, including the feed timing fix, bounded WebGL fallback and two-node illustration correction. The deployed script was retrieved and checked for these changes.
- Portfolio feed: the actual writing initializer was exercised against the live JSON feed with the document already complete, before the load event, and with an intersection preceding load. Each case rendered the writing grid with exactly one request. Some later manual portfolio review tabs stalled in the in-app browser, so these checks and the PageSpeed audits do not establish that every desktop interaction was manually reviewed.
- Browser review: home, topics, search, about, projects, discussions, login, signup and custom 404 fit a 375 pixel viewport. Search produced the expected HERMES match and a custom no-results state. The article's three wide tables scroll within their containers; the page itself does not overflow. Signed-in comments and the moderator menu were visible, and the mobile profile menu stayed within the screen.
- Anonymous article visitors now check the public session endpoint before requesting a protected profile. The protected endpoint itself still returns HTTP 401 without a session. Concurrent session reads share only an in-flight request; later reads refresh against the server. Optional offline registration runs at idle, retaining the service worker's exclusion of account/API traffic.

## Production PageSpeed

Google PageSpeed Insights, Lighthouse 13.5.0, 2026-10-04 at approximately 11:38 IST. Mobile uses an emulated Moto G Power and slow 4G. These are lab results; the reports have insufficient field data for CrUX conclusions.

| Page                                                                                                                                                       | Mobile performance | Desktop performance | Accessibility | Best practices | SEO |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -----------------: | ------------------: | ------------: | -------------: | --: |
| [Blog home](https://pagespeed.web.dev/analysis/https-blog-vyasdevgna-online/4kma57zp5t?form_factor=mobile)                                                 |                 97 |                 100 |           100 |            100 | 100 |
| [HERMES article](https://pagespeed.web.dev/analysis/https-blog-vyasdevgna-online-blog-edge-intrusion-detection-power-budget/lo78oy4sw7?form_factor=mobile) |                 93 |                 100 |           100 |            100 | 100 |
| [Portfolio](https://pagespeed.web.dev/analysis/https-vyasdevgna-online/t0x357yzfs?form_factor=mobile)                                                      |                 97 |                 100 |           100 |            100 | 100 |

Accessibility, best practices and SEO values are 100 on both device modes for all three reports. All report zero layout shift and zero blocking time. Final mobile LCP: blog 2.5 s, article 2.9 s, portfolio 1.8 s. Earlier same-day article runs scored 99; mobile lab performance varied across runs, so this record uses the last completed report rather than the highest score. The earlier portfolio baseline was 50 performance and the blog baseline 88; those are different captures, not controlled benchmark medians.

The portfolio's decorative WebGL now stays off narrow screens and requests an efficient GPU context, preserving its CSS fallback where the browser reports a major performance caveat. This uses the native [WebGL context option documented by MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext), without inspecting or storing graphics-driver information.

## Search Console

The existing verified domain property covers both sites. The blog sitemap index reports **Success**. Its discovered-page count reflects Google's prior fetch, not immediate discovery of all newly deployed articles. A blog home live inspection reported that the URL was available to Google, and an indexing request was accepted. The portfolio root was already indexed.

The portfolio sitemap was resubmitted successfully. Google still reports **Couldn't fetch** for that submission. Direct HTTPS retrieval returns a valid sitemap `urlset` with one canonical page and 49 image entries; robots.txt allows crawling and advertises the same sitemap. This external fetch status remains unresolved. Braids' existing sitemap was left untouched. Submission, lab SEO scores and IndexNow acceptance do not guarantee rankings or indexing.
