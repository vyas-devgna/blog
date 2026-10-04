import { describe, expect, it } from "vitest";
import { coverForSlug, coverPalette } from "../../src/lib/cover";
import { getReadingTime } from "../../src/lib/reading-time";
import { topicSlug } from "../../src/lib/topics";

describe("topicSlug", () => {
  it("normalizes spaces and punctuation to a stable route segment", () => {
    expect(topicSlug("AI & ML")).toBe("ai-ml");
  });

  it("keeps Unicode letters and numbers", () => {
    expect(topicSlug("Café 101")).toBe("café-101");
  });
});

describe("coverForSlug", () => {
  it("is deterministic for a given article slug", () => {
    expect(coverForSlug("careful-systems")).toBe(
      coverForSlug("careful-systems"),
    );
  });

  it("uses only the editorial art palette", () => {
    const encodedSvg = coverForSlug("careful-systems").split(",")[1];
    const svg = decodeURIComponent(encodedSvg);
    const colors = svg.match(/#[\da-f]{6}/gi) ?? [];

    expect(colors.length).toBeGreaterThan(0);
    expect(
      colors.every((color) =>
        coverPalette.includes(
          color.toLowerCase() as (typeof coverPalette)[number],
        ),
      ),
    ).toBe(true);
  });
});

describe("getReadingTime", () => {
  it("rounds up at about 230 words per minute and keeps short posts at one minute", () => {
    expect(getReadingTime("short note")).toBe(1);
    expect(getReadingTime("word ".repeat(230))).toBe(1);
    expect(getReadingTime("word ".repeat(231))).toBe(2);
  });
});

import { buildFeed, toPostSummary } from "../../src/lib/post-summary";

const entry = (
  id: string,
  day: number,
  featured = false,
  tags = ["Notes"],
) => ({
  id,
  body: "word ".repeat(460),
  data: {
    title: `Post ${id}`,
    description: "d",
    publishedAt: new Date(Date.UTC(2026, 9, day)),
    tags,
    featured,
  },
});

describe("post feed for other sites", () => {
  it("maps an entry to an absolute URL, reading time and a generated cover", () => {
    const summary = toPostSummary(entry("a", 1), "https://blog.example.com");
    expect(summary.url).toBe("https://blog.example.com/blog/a/");
    expect(summary.readingTime).toBe(2);
    expect(summary.cover.startsWith("data:image/svg+xml,")).toBe(true);
  });

  it("sorts newest first and keeps only featured posts in the best-of shelf", () => {
    const feed = buildFeed(
      [entry("old", 1, true), entry("new", 9), entry("mid", 5, true)],
      "https://blog.example.com",
    );
    expect(feed.recent.map((p) => p.slug)).toEqual(["new", "mid", "old"]);
    expect(feed.featured.map((p) => p.slug)).toEqual(["mid", "old"]);
    expect(feed.count).toBe(3);
  });

  it("returns empty shelves when nothing is published", () => {
    expect(buildFeed([], "https://blog.example.com")).toEqual({
      count: 0,
      featured: [],
      recent: [],
    });
  });

  it("caps each shelf", () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      entry(`p${i}`, i + 1, true),
    );
    const feed = buildFeed(many, "https://blog.example.com");
    expect(feed.featured).toHaveLength(3);
    expect(feed.recent).toHaveLength(6);
  });
});
