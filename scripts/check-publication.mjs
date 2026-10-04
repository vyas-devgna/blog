// Run after every build, including manual publication: catch discovery regressions before deploy.
import { readFile, access } from "node:fs/promises";
import { publishedPosts, readPosts } from "../src/lib/front-matter.mjs";

const root = "dist/client";
const sitemap = await readFile(`${root}/sitemap-0.xml`, "utf8");
const rss = await readFile(`${root}/rss.xml`, "utf8");
const published = publishedPosts("./src/content/blog");
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
for (const post of published) {
  const path = `/blog/${post.slug}/`;
  const html = await readFile(`${root}${path}index.html`, "utf8");
  const canonical = post.canonical ?? `https://blog.vyasdevgna.online${path}`;
  if (!html.includes(`rel="canonical" href="${canonical}"`))
    throw new Error(`Missing canonical: ${post.slug}`);
  for (const marker of [
    'name="description"',
    '"@type":"BlogPosting"',
    '"@type":"BreadcrumbList"',
    'property="article:published_time"',
    `/og/${post.slug}.jpg`,
  ])
    if (!html.includes(marker))
      throw new Error(`Missing ${marker}: ${post.slug}`);
  if (
    !sitemap.includes(`https://blog.vyasdevgna.online${path}`) ||
    !rss.includes(`https://blog.vyasdevgna.online${path}`)
  )
    throw new Error(`Article missing from sitemap or RSS: ${post.slug}`);
  await access(`${root}/og/${post.slug}.jpg`);
  if (post.cover?.startsWith("/covers/")) {
    if (!html.includes(post.cover))
      throw new Error(`Artwork missing: ${post.slug}`);
    for (const width of [480, 640, 800, 1200])
      await access(
        `${root}${post.cover.replace("-1200.webp", `-${width}.webp`)}`,
      );
  }
}
const publicIds = new Set(published.map((post) => post.slug));
for (const post of readPosts("./src/content/blog")) {
  if (
    !publicIds.has(post.slug) &&
    new RegExp(`/blog/${escape(post.slug)}/`).test(sitemap + rss)
  )
    throw new Error(`Draft or scheduled article leaked: ${post.slug}`);
}
console.log(
  `Publication check passed: ${published.length} articles with metadata, feeds, social cards and artwork.`,
);
