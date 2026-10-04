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
