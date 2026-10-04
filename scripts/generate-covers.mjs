// Original artwork stays in Git. Only responsive WebP derivatives ship to readers.
import { mkdir, readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";

await mkdir("public/covers", { recursive: true });
for (const file of await readdir("src/assets/covers")) {
  if (!file.endsWith(".png")) continue;
  const source = await readFile(`src/assets/covers/${file}`);
  const hash = createHash("sha256").update(source).digest("hex").slice(0, 10);
  const slug = file.slice(0, -4);
  for (const width of [480, 640, 800, 1200]) {
    await sharp(source)
      .resize(width, Math.round((width * 760) / 1200), { fit: "cover" })
      .webp({ quality: 78 })
      .toFile(`public/covers/${slug}-${hash}-${width}.webp`);
  }
}
console.log("Responsive cover artwork generated.");
