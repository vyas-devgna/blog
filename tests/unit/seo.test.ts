import { describe, expect, it } from "vitest";
import {
  author,
  PERSON_ID,
  includeInSitemap,
  isPublished,
  escapeXml,
  serializeJsonLd,
} from "../../src/lib/seo";

it("identifies the same author across the portfolio and publication", () => {
  expect(author["@id"]).toBe(PERSON_ID);
  expect(author.name).toBe("Vyas Devgna");
  expect(author.alternateName).toContain("Devgna Vyas");
  expect(author.sameAs).toContain("https://blog.vyasdevgna.online/about/");
});

describe("sitemap eligibility", () => {
  it("includes canonical public publication routes", () => {
    for (const path of [
      "/",
      "/about/",
      "/projects/",
      "/discussions/",
      "/blog/",
      "/blog/an-essay/",
      "/topics/",
      "/topics/systems/",
    ])
      expect(includeInSitemap(`https://blog.vyasdevgna.online${path}`)).toBe(
        true,
      );
  });
  it("excludes accounts, moderation, search, errors and other origins", () => {
    for (const path of [
      "/login/",
      "/signup/",
      "/settings/",
      "/admin/",
      "/moderation/",
      "/notifications/",
      "/verify-email/",
      "/forgot-password/",
      "/search/",
      "/404/",
      "/u/member/",
      "/api/community/profile",
      "/discussions/unmoderated/",
      "/?q=search",
      "/#main",
    ])
      expect(includeInSitemap(`https://blog.vyasdevgna.online${path}`)).toBe(
        false,
      );
    expect(includeInSitemap("https://other.example/blog/")).toBe(false);
  });
});

describe("publication availability", () => {
  const now = new Date("2026-10-04T00:00:00Z");
  it("keeps drafts and future posts out of routes and feeds", () => {
    expect(
      isPublished({ draft: true, publishedAt: new Date("2026-01-01") }, now),
    ).toBe(false);
    expect(
      isPublished({ draft: false, publishedAt: new Date("2027-01-01") }, now),
    ).toBe(false);
    expect(isPublished({ draft: false, publishedAt: now }, now)).toBe(true);
  });
  it("escapes sitemap text without interpreting markup", () => {
    expect(escapeXml(`a&<b>"'`)).toBe("a&amp;&lt;b&gt;&quot;&apos;");
  });
  it("serializes user text safely without changing its meaning", () => {
    const data = { text: '</script><script>alert("x")</script>' };
    const serialized = serializeJsonLd(data);
    expect(serialized).not.toContain("<");
    expect(JSON.parse(serialized)).toEqual(data);
  });
});
