// @ts-check
import cloudflare from "@astrojs/cloudflare";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { includeInSitemap } from "./src/lib/seo.ts";
import { postLastModified } from "./src/lib/sitemap-dates.mjs";
import { defineConfig } from "astro/config";

const lastModified = postLastModified();
// Homepage identity copy changed on 2026-10-05; later article changes also update its cards.
lastModified.set("/", [...lastModified.values(), "2026-10-05"].sort().at(-1) ?? "2026-10-05");

export default defineConfig({
  site: "https://blog.vyasdevgna.online",
  output: "server",
  adapter: cloudflare({ imageService: "compile" }),
  integrations: [
    mdx(),
    sitemap({
      filter: includeInSitemap,
      serialize(item) {
        const modified = lastModified.get(new URL(item.url).pathname);
        if (modified) item.lastmod = modified;
        return item;
      },
    }),
  ],
  markdown: {
    shikiConfig: {
      themes: { light: "github-light", dark: "github-dark" },
      defaultColor: false,
      wrap: true,
    },
  },
  build: { inlineStylesheets: "auto" },
  // Keep generated scripts external so they satisfy script-src without unsafe-inline.
  vite: { build: { assetsInlineLimit: 0 } },
});
