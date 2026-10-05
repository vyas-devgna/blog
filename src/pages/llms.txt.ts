import type { APIRoute } from "astro";
import { BLOG_URL } from "../lib/seo";
import { getPublishedPosts, getTopics } from "../lib/posts";
import { topicSlug } from "../lib/topics";

export const prerender = true;

// llms.txt: a plain-text map of the site for AI search and answer engines.
// https://llmstxt.org — a title, a one-line summary, then sections of annotated links.
export const GET: APIRoute = async () => {
  const posts = await getPublishedPosts();
  const topics = getTopics(posts);
  const lines = [
    "# Vyas — notes on software, systems and research",
    "",
    "> Independent technical writing by Vyas Devgna, also known as Devgna Vyas: AI-agent security, local-first software, networking, and the engineering behind open-source projects. Articles are static pages, free to read, and cite their sources.",
    "",
    "## Articles",
    ...posts.map(
      (post) =>
        `- [${post.data.title}](${BLOG_URL}/blog/${post.id}/): ${post.data.description}`,
    ),
    "",
    "## Topics",
    ...topics.map(
      (topic) => `- [${topic}](${BLOG_URL}/topics/${topicSlug(topic)}/)`,
    ),
    "",
    "## Feeds and data",
    `- [RSS feed](${BLOG_URL}/rss.xml)`,
    `- [Recent and featured posts as JSON](${BLOG_URL}/posts.json)`,
    `- [Sitemap](${BLOG_URL}/sitemap-index.xml)`,
    "",
    "## About the author",
    "- [Portfolio](https://vyasdevgna.online/): systems engineer and published researcher",
    "- [GitHub](https://github.com/vyas-devgna)",
    "",
  ];
  return new Response(lines.join("\n"), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
};
