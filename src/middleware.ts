import { defineMiddleware } from "astro:middleware";

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'sha256-p7RzDCNrDiI+XUT3Q2/EzOOsyVKKkGzLn8CxfVxabr0=' https://challenges.cloudflare.com https://static.cloudflareinsights.com/beacon.min.js https://static.cloudflareinsights.com/beacon.min.js/",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: https:",
  "connect-src 'self' https://challenges.cloudflare.com",
  "worker-src 'self'",
  "frame-src https://challenges.cloudflare.com",
  "upgrade-insecure-requests",
].join("; ");

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  response.headers.set("content-security-policy", csp);
  response.headers.set(
    "strict-transport-security",
    "max-age=31536000; includeSubDomains",
  );
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set(
    "referrer-policy",
    context.url.pathname.startsWith("/auth/callback")
      ? "no-referrer"
      : "strict-origin-when-cross-origin",
  );
  response.headers.set(
    "permissions-policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
  response.headers.set("x-frame-options", "DENY");
  if (new URL(context.request.url).pathname.startsWith("/api/")) {
    response.headers.set("cache-control", "private, no-store, max-age=0");
  }
  return response;
});
