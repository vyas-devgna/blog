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
  build: { inlineStylesheets: "auto" },
});
