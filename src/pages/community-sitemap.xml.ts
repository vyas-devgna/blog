import type { APIRoute } from "astro";
import { BLOG_URL, escapeXml } from "../lib/seo";
import { getIndexableDiscussions } from "../lib/server/public-discussions";

export const prerender = false;
export const GET: APIRoute = async () => {
  try {
    const threads = await getIndexableDiscussions();
    const body = threads
      .map(
        (thread) =>
          `<url><loc>${escapeXml(`${BLOG_URL}/discussions/${encodeURIComponent(thread.slug)}/`)}</loc><lastmod>${thread.updatedAt.toISOString()}</lastmod></url>`,
      )
      .join("");
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`,
      {
        headers: {
          "content-type": "application/xml; charset=utf-8",
          "cache-control": "public, max-age=0, must-revalidate",
        },
      },
    );
  } catch {
    // A database outage must not masquerade as an empty, successful sitemap.
    return new Response("Sitemap temporarily unavailable", {
      status: 503,
      headers: { "retry-after": "300", "cache-control": "no-store" },
    });
  }
};
