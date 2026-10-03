import { describe, expect, it } from "vitest";
import { topicSlug } from "../../src/lib/topics";

describe("topicSlug", () => {
  it("normalizes spaces and punctuation to a stable route segment", () => {
    expect(topicSlug("AI & ML")).toBe("ai-ml");
  });

  it("keeps Unicode letters and numbers", () => {
    expect(topicSlug("Café 101")).toBe("café-101");
  });
});
