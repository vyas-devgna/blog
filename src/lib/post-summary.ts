import { coverForSlug } from "./cover";
import { getReadingTime } from "./reading-time";

export interface SummarySource {
  id: string;
  body?: string;
  data: {
    title: string;
    description: string;
    publishedAt: Date;
    updatedAt?: Date;
    tags: string[];
    featured: boolean;
    cover?: string;
  };
}

/** The public, JSON-safe shape other sites (the portfolio) read from /posts.json. */
export function toPostSummary(post: SummarySource, site: URL | string) {
  return {
    slug: post.id,
    url: new URL(`/blog/${post.id}/`, site).toString(),
    title: post.data.title,
    description: post.data.description,
    publishedAt: post.data.publishedAt.toISOString(),
    updatedAt: (post.data.updatedAt ?? post.data.publishedAt).toISOString(),
    readingTime: getReadingTime(post.body ?? ""),
    tags: post.data.tags,
    featured: post.data.featured,
    cover: post.data.cover
      ? new URL(post.data.cover, site).toString()
      : coverForSlug(post.id),
  };
}

/** `featured` posts are the best-of shelf; `recent` is newest first. Both capped. */
export function buildFeed(
  posts: SummarySource[],
  site: URL | string,
  limits = { featured: 3, recent: 6 },
) {
  const sorted = [...posts].sort(
    (a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf(),
  );
  return {
    count: sorted.length,
    featured: sorted
      .filter((post) => post.data.featured)
      .slice(0, limits.featured)
      .map((post) => toPostSummary(post, site)),
    recent: sorted
      .slice(0, limits.recent)
      .map((post) => toPostSummary(post, site)),
  };
}
