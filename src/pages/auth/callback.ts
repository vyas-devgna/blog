import type { APIRoute } from "astro";
import { processAuthMiddleware } from "@neondatabase/auth/server";
import {
  authCookieConfig,
  getAuthContext,
  ApiError,
} from "../../lib/server/auth";
import { safeReturnTo } from "../../lib/auth-navigation";

export const prerender = false;

function redirect(path: string, origin: string, cookies: string[] = []) {
  const headers = new Headers({
    location: new URL(path, origin).toString(),
    "cache-control": "private, no-store",
    "referrer-policy": "no-referrer",
    "x-robots-tag": "noindex, nofollow",
  });
  for (const cookie of cookies) headers.append("set-cookie", cookie);
  return new Response(null, { status: 303, headers });
}

export const GET: APIRoute = async ({ request, url }) => {
  const returnTo = safeReturnTo(url.searchParams.get("returnTo"));
  const loginError = (code: string, cookies: string[] = []) =>
    redirect(
      `/login/?error=${encodeURIComponent(code)}&returnTo=${encodeURIComponent(returnTo)}`,
      url.origin,
      cookies,
    );
  const error = url.searchParams.get("error");
  if (error) return loginError(error);
  try {
    const result = await processAuthMiddleware({
      request,
      pathname: url.pathname,
      skipRoutes: [url.pathname],
      loginUrl: "/login/",
      ...authCookieConfig(),
    });
    if (result.action === "redirect_oauth") {
      // The SDK verifies the challenge and exchanges the one-time verifier.
      // Carry its cookies through the redirect before checking the new session.
      return redirect(
        `${result.redirectUrl.pathname}${result.redirectUrl.search}`,
        url.origin,
        result.cookies,
      );
    }
    if (result.action === "redirect_login" || url.searchParams.has("code"))
      return loginError("google_session_expired", result.cookies);
    const auth = await getAuthContext(request);
    return redirect(returnTo, url.origin, [
      ...(result.cookies ?? []),
      ...auth.cookies,
    ]);
  } catch (error) {
    return loginError(error instanceof ApiError ? error.code : "google_failed");
  }
};
