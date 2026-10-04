import type { APIRoute } from "astro";
import { buildFeed } from "../lib/post-summary";
import { getPublishedPosts } from "../lib/posts";

// Server-rendered on purpose: static assets can't carry per-response CORS headers.
export const prerender = false;

export const GET: APIRoute = async ({ site }) => {
  const feed = buildFeed(await getPublishedPosts(), site!);
  return new Response(JSON.stringify(feed), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=600",
      // Public, read-only data (same as the RSS feed): any site may display it.
      "access-control-allow-origin": "*",
      "x-content-type-options": "nosniff",
    },
  });
};
