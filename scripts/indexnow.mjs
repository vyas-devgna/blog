// Tell IndexNow-compatible search engines (Bing, Yandex, Naver, Seznam and others) about URLs
// that were added or changed. Run it after a deploy:  pnpm indexnow
// The key is public by design: it is served at https://<host>/<key>.txt to prove ownership.
import { publishedPosts } from "../src/lib/front-matter.mjs";

const HOST = "blog.vyasdevgna.online";
const KEY = "5288c239db236a10bbfca0668af1fff3";

const urls = [
  `https://${HOST}/`,
  `https://${HOST}/blog/`,
  `https://${HOST}/topics/`,
  ...publishedPosts("./src/content/blog").map(
    (post) => `https://${HOST}/blog/${post.slug}/`,
  ),
];

const live = await fetch(`https://${HOST}/${KEY}.txt`, {
  signal: AbortSignal.timeout(30_000),
});
if (!live.ok || (await live.text()).trim() !== KEY) {
  console.error(
    "The key file is not live yet. Deploy first, then run this again.",
  );
  process.exit(1);
}

const response = await fetch("https://api.indexnow.org/IndexNow", {
  method: "POST",
  signal: AbortSignal.timeout(30_000),
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify({
    host: HOST,
    key: KEY,
    keyLocation: `https://${HOST}/${KEY}.txt`,
    urlList: urls,
  }),
});
console.log(
  `IndexNow: submitted ${urls.length} URLs -> HTTP ${response.status}`,
);
if (response.status >= 400) process.exit(1);
