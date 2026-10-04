// @ts-check
import cloudflare from "@astrojs/cloudflare";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://blog.vyasdevgna.online",
  output: "server",
  adapter: cloudflare({ imageService: "compile" }),
  integrations: [mdx(), sitemap()],
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
