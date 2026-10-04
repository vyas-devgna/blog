export const BLOG_URL = "https://blog.vyasdevgna.online";
export const PERSON_ID = "https://vyasdevgna.online/#person";

export const author = {
  "@type": "Person",
  "@id": PERSON_ID,
  name: "Devgna Vyas",
  url: "https://vyasdevgna.online/",
  sameAs: [
    "https://github.com/vyas-devgna",
    "https://linkedin.com/in/devgna-vyas",
  ],
};

export function serializeJsonLd(value: Record<string, unknown>) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

// Private routes and internal search must never be advertised for indexing.
export function includeInSitemap(value: string) {
  const url = new URL(value);
  if (url.origin !== BLOG_URL || url.search || url.hash) return false;
  return /^\/(?:about\/|projects\/|discussions\/|blog\/(?:[^/]+\/)?|topics\/(?:[^/]+\/)?)?$/.test(
    url.pathname,
  );
}

export function isPublished(
  data: { draft: boolean; publishedAt: Date },
  now = new Date(),
) {
  return !data.draft && data.publishedAt.valueOf() <= now.valueOf();
}

export function escapeXml(value: string) {
  return value.replace(
    /[<>&"']/g,
    (character) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[character]!,
  );
}
