# SEO

Public pages use canonical URLs under `https://blog.vyasdevgna.online`, descriptions, Open Graph and Twitter cards with a static 1200×630 image, an RSS feed, robots.txt, and Astro's sitemap integration. The home page emits `Blog` JSON-LD; articles emit `BlogPosting` and `BreadcrumbList` JSON-LD plus article publication and modification times. Draft content is excluded from production routes and feeds. The current sitemap contains only prerendered publication routes; community sitemap/indexing rules must be added with the database-backed feature and should exclude new, unmoderated content.

Validate production robots.txt, sitemap, canonicals, structured data, status codes, and social previews after the domain resolves and deployment is available.
