import { readdirSync, readFileSync } from "node:fs";

// Minimal reader for the flat front matter used by the articles. Build scripts (sitemap dates,
// social cards) need titles, tags and dates before Astro's content layer exists.
function scalar(raw) {
  const value = raw.trim();
  if (value.startsWith('"')) {
    try {
      return JSON.parse(value);
    } catch {
      return value.slice(1, -1);
    }
  }
  if (value.startsWith("'")) return value.slice(1, -1).replace(/''/g, "'");
  return value;
}

export function readPosts(directory = "./src/content/blog") {
  const posts = [];
  for (const file of readdirSync(directory)) {
    if (!/\.mdx?$/.test(file)) continue;
    const source = readFileSync(`${directory}/${file}`, "utf8");
    const front = source.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
    const field = (key) => {
      const match = front.match(new RegExp(`^${key}:[ \\t]*(.+)$`, "m"));
      return match ? scalar(match[1]) : undefined;
    };
    const tags = (front.match(/^tags:\s*\[(.*)\]\s*$/m)?.[1] ?? "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    posts.push({
      slug: file.replace(/\.mdx?$/, ""),
      title: field("title") ?? file,
      description: field("description") ?? "",
      cover: field("cover"),
      canonical: field("canonical"),
      publishedAt: new Date(field("publishedAt") ?? ""),
      updatedAt: field("updatedAt") ? new Date(field("updatedAt")) : undefined,
      draft: field("draft") === "true",
      tags,
    });
  }
  return posts;
}

// Mirrors isPublished() in src/lib/seo.ts: not a draft, and not dated in the future.
export function publishedPosts(directory, now = new Date()) {
  return readPosts(directory).filter(
    (post) => !post.draft && post.publishedAt.valueOf() <= now.valueOf(),
  );
}
