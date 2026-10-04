import type { APIRoute } from "astro";
import { getDb } from "../../../lib/server/db";
import { ApiError, proxyAuthRequest } from "../../../lib/server/auth";
import {
  apiError,
  checkOrigin,
  readJson,
  requireString,
} from "../../../lib/server/http";
import {
  enforceRateLimit,
  clientRateKey,
} from "../../../lib/server/rate-limit";
import { verifyTurnstile } from "../../../lib/server/turnstile";

export const prerender = false;

const allowedPaths = new Set([
  "get-session",
  "sign-up/email",
  "sign-in/email",
  "sign-out",
  "email-otp/send-verification-otp",
  "email-otp/verify-email",
  "forget-password/email-otp",
  "email-otp/reset-password",
  "change-password",
  "delete-user",
]);

export const ALL: APIRoute = async ({ request, params }) => {
  try {
    const path = String(params.path ?? "").replace(/^\/+|\/+$/g, "");
    if (!allowedPaths.has(path))
      throw new ApiError(
        404,
        "This authentication route does not exist.",
        "not_found",
      );
    if (request.method !== "GET") checkOrigin(request);
    const expectedMethod = path === "get-session" ? "GET" : "POST";
    if (request.method !== expectedMethod) {
      throw new ApiError(
        405,
        "This method is not available.",
        "method_not_allowed",
      );
    }

    let body: Record<string, unknown> | null = null;
    if (request.method === "POST") body = await readJson(request, 8_000);

    let forwardedBody = body;
    if (path === "sign-up/email") {
      requireString(body?.password, "Password", 12, 128, false);
      await enforceRateLimit(
        getDb(),
        "signup",
        clientRateKey(request),
        5,
        3600,
      );
      await verifyTurnstile(body?.turnstileToken, "signup", request);
      const { turnstileToken: _turnstileToken, ...safeBody } = body ?? {};
      forwardedBody = safeBody;
    } else if (path === "sign-in/email") {
      await enforceRateLimit(
        getDb(),
        "signin",
        clientRateKey(request),
        20,
        900,
      );
    } else if (
      path === "forget-password/email-otp" ||
      path === "email-otp/reset-password"
    ) {
      if (path === "email-otp/reset-password")
        requireString(body?.password, "Password", 12, 128, false);
      await enforceRateLimit(
        getDb(),
        "password-reset",
        clientRateKey(request),
        5,
        3600,
      );
    } else if (path === "email-otp/send-verification-otp") {
      await enforceRateLimit(
        getDb(),
        "email-verification",
        clientRateKey(request),
        5,
        3600,
      );
    } else if (path === "email-otp/verify-email") {
      await enforceRateLimit(
        getDb(),
        "email-verification-check",
        clientRateKey(request),
        20,
        900,
      );
    } else {
      if (path === "change-password")
        requireString(body?.newPassword, "New password", 12, 128, false);
      if (path === "delete-user")
        requireString(body?.password, "Password", 8, 128, false);
    }

    let forwardedRequest = request;
    if (request.method === "POST") {
      const headers = new Headers(request.headers);
      headers.delete("content-length");
      headers.delete("content-encoding");
      forwardedRequest = new Request(request.url, {
        method: "POST",
        headers,
        body: JSON.stringify(forwardedBody),
      });
    }

    const response = await proxyAuthRequest(forwardedRequest, path);
    const headers = new Headers(response.headers);
    headers.set("cache-control", "no-store, private");
    headers.set("x-content-type-options", "nosniff");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    return apiError(error);
  }
};
