// Renders a 1200x630 social card (Open Graph / X / LinkedIn) for every published article into
// public/og/<slug>.png. Runs before `astro build`; the output is generated, not committed.
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { publishedPosts } from "../src/lib/front-matter.mjs";

const OUT = "public/og";
const palette = ["#2a3f9e", "#e24a2c", "#e7a73f", "#8fa58a"];
const font = (weight) =>
  readFileSync(
    `node_modules/@fontsource/inter/files/inter-latin-${weight}-normal.woff`,
  );
const fonts = [400, 600, 700].map((weight) => ({
  name: "Inter",
  data: font(weight),
  weight,
  style: "normal",
}));
const logo = `data:image/png;base64,${readFileSync("public/icons/icon-192.png").toString("base64")}`;

function hash(value) {
  let result = 2166136261;
  for (const character of value) {
    result ^= character.codePointAt(0) ?? 0;
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

// h("div", { style }, ...children) — satori takes plain objects, so no JSX tooling is needed.
const h = (type, props, ...children) => ({
  type,
  props: { ...props, children: children.length === 1 ? children[0] : children },
});

function card(post) {
  const seed = hash(post.slug);
  const [a, b, c] = [0, 1, 2].map(
    (i) => palette[(seed >>> (i * 5)) % palette.length],
  );
  const x = (n) => `${(seed >>> n) % 70}%`;
  const size = post.title.length <= 48 ? 78 : post.title.length <= 80 ? 66 : 56;
  const background = [
    `radial-gradient(circle at ${x(2)} ${x(7)}, ${a}ee 0%, transparent 58%)`,
    `radial-gradient(circle at ${x(11)} ${x(3)}, ${b}cc 0%, transparent 54%)`,
    `radial-gradient(circle at ${x(5)} ${x(13)}, ${c}aa 0%, transparent 50%)`,
    "linear-gradient(135deg, #0b0d1a, #11142a)",
  ].join(", ");

  return h(
    "div",
    {
      style: {
        width: 1200,
        height: 630,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px 72px",
        color: "#f5f5f7",
        fontFamily: "Inter",
        backgroundImage: background,
      },
    },
    h(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          fontSize: 24,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 600,
          color: "#d2d2d7",
        },
      },
      `Notes  ·  ${post.tags[0] ?? "Writing"}`,
    ),
    h(
      "div",
      {
        style: {
          display: "flex",
          fontSize: size,
          lineHeight: 1.06,
          fontWeight: 700,
          letterSpacing: -2.5,
          maxWidth: 1000,
        },
      },
      post.title,
    ),
    h(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        },
      },
      h(
        "div",
        { style: { display: "flex", alignItems: "center" } },
        h("img", {
          src: logo,
          width: 64,
          height: 64,
          style: { borderRadius: 16, marginRight: 20 },
        }),
        h(
          "div",
          { style: { display: "flex", flexDirection: "column" } },
          h(
            "div",
            { style: { display: "flex", fontSize: 30, fontWeight: 600 } },
            "Devgna Vyas",
          ),
          h(
            "div",
            { style: { display: "flex", fontSize: 22, color: "#b7b7bd" } },
            "blog.vyasdevgna.online",
          ),
        ),
      ),
    ),
  );
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const posts = publishedPosts("./src/content/blog");
for (const post of posts) {
  const svg = await satori(card(post), { width: 1200, height: 630, fonts });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } })
    .render()
    .asPng();
  writeFileSync(`${OUT}/${post.slug}.png`, png);
}
console.log(
  `Generated ${posts.length} social cards in ${OUT}/ (${readdirSync(OUT).length} files).`,
);
