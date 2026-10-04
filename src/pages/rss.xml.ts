import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { getPublishedPosts } from "../lib/posts";
import { BLOG_NAME } from "../lib/seo";

export const prerender = true;
export const GET: APIRoute = async ({ site }) => {
  const posts = await getPublishedPosts();
  return rss({
    title: BLOG_NAME,
    description: "Essays on software, research, and systems by Devgna Vyas.",
    site: site!,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.publishedAt,
      description: post.data.description,
      link: `/blog/${post.id}/`,
      categories: post.data.tags,
    })),
  });
};
