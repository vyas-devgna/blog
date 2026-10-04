import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";

const theme = await readFile("public/scripts/theme-init.js", "utf8");
const hash = "sha256-" + createHash("sha256").update(theme).digest("base64");
for (const file of ["public/_headers", "src/middleware.ts"]) {
  if (!(await readFile(file, "utf8")).includes(hash))
    throw new Error(`Theme script CSP hash is stale: ${file}`);
}

async function check(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await check(path);
    else if (entry.name.endsWith(".html")) {
      const html = await readFile(path, "utf8");
      for (const match of html.matchAll(
        /<script\b([^>]*)>([\s\S]*?)<\/script>/gi,
      )) {
        const attributes = match[1];
        if (
          !/\bsrc\s*=/.test(attributes) &&
          !/\btype\s*=\s*["']application\/ld\+json["']/.test(attributes) &&
          match[2] !== theme
        )
          throw new Error(
            `Inline executable script violates the site CSP: ${path}`,
          );
      }
    }
  }
}
await check("dist/client");
console.log("Built HTML scripts satisfy the site CSP.");
