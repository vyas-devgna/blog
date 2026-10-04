import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

async function check(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await check(path);
    else if (entry.name.endsWith(".html")) {
      const html = await readFile(path, "utf8");
      for (const match of html.matchAll(/<script\b([^>]*)>/gi)) {
        const attributes = match[1];
        if (
          !/\bsrc\s*=/.test(attributes) &&
          !/\btype\s*=\s*["']application\/ld\+json["']/.test(attributes)
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
