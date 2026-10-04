import { isPublished } from "./seo";
import { getCollection } from "astro:content";
export { getReadingTime } from "./reading-time";

export async function getPublishedPosts() {
  return (await getCollection("blog", ({ data }) => isPublished(data))).sort(
    (a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf(),
  );
}

export function getTopics(
  posts: Awaited<ReturnType<typeof getPublishedPosts>>,
) {
  return [...new Set(posts.flatMap(({ data }) => data.tags))].sort((a, b) =>
    a.localeCompare(b),
  );
}
