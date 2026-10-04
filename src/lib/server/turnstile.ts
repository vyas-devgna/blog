import { env } from "cloudflare:workers";
import { ApiError } from "./auth";

interface SiteverifyResult {
  success?: boolean;
  hostname?: string;
  action?: string;
  "error-codes"?: string[];
}

export async function verifyTurnstile(
  token: unknown,
  action: string,
  request: Request,
) {
  if (typeof token !== "string" || token.length < 1 || token.length > 2048) {
    throw new ApiError(
      400,
      "Complete the security check and try again.",
      "challenge_required",
    );
  }
  if (!env.TURNSTILE_SECRET_KEY) {
    throw new ApiError(
      503,
      "The security check is temporarily unavailable.",
      "challenge_unavailable",
    );
  }
  const form = new FormData();
  form.set("secret", env.TURNSTILE_SECRET_KEY);
  form.set("response", token);
  const address = request.headers.get("cf-connecting-ip");
  if (address) form.set("remoteip", address);
  form.set("idempotency_key", crypto.randomUUID());
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: form,
        signal: controller.signal,
      },
    );
    if (!response.ok) throw new Error("Siteverify unavailable");
    const result = (await response.json()) as SiteverifyResult;
    if (
      !result.success ||
      result.action !== action ||
      result.hostname !== new URL(env.PUBLIC_SITE_URL).hostname
    ) {
      throw new ApiError(
        400,
        "The security check expired or failed. Please try again.",
        "challenge_failed",
      );
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      503,
      "The security check is temporarily unavailable.",
      "challenge_unavailable",
    );
  } finally {
    clearTimeout(timeout);
  }
}
