import { publishedPosts } from "./front-matter.mjs";

// { "/blog/<slug>/": ISO date } so the sitemap can report when a page really last changed.
// (A lastmod that is "now" on every build is noise that search engines learn to ignore.)
export function postLastModified(directory) {
  const dates = new Map();
  for (const post of publishedPosts(directory)) {
    const date = post.updatedAt ?? post.publishedAt;
    if (!Number.isNaN(date.valueOf()))
      dates.set(`/blog/${post.slug}/`, date.toISOString());
  }
  return dates;
}
