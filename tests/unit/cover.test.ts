import { describe, expect, it } from "vitest";
import { coverSrcSet } from "../../src/lib/cover";

describe("responsive artwork", () => {
  it("shares a content hash across all generated sizes", () => {
    expect(coverSrcSet("/covers/example-abcdef0123-1200.webp")).toBe(
      "/covers/example-abcdef0123-480.webp 480w, /covers/example-abcdef0123-800.webp 800w, /covers/example-abcdef0123-1200.webp 1200w",
    );
  });
  it("does not invent variants for custom images or inline artwork", () => {
    expect(coverSrcSet("https://example.com/photo.webp")).toBeUndefined();
    expect(coverSrcSet("/photo.webp")).toBeUndefined();
    expect(coverSrcSet("data:image/svg+xml,art")).toBeUndefined();
  });
});
