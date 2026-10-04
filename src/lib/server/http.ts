import { ApiError } from "./auth";
import { env } from "cloudflare:workers";

export function json(data: unknown, status = 200, cookies: string[] = []) {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "private, no-store, max-age=0",
    "x-content-type-options": "nosniff",
  });
  for (const cookie of cookies) headers.append("set-cookie", cookie);
  return new Response(JSON.stringify(data), { status, headers });
}

export async function readJson(
  request: Request,
  limit = 16_000,
): Promise<Record<string, unknown>> {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .includes("application/json")
  ) {
    throw new ApiError(
      415,
      "Send this request as JSON.",
      "unsupported_media_type",
    );
  }
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > limit)
    throw new ApiError(
      413,
      "This submission is too large.",
      "payload_too_large",
    );
  const reader = request.body?.getReader();
  if (!reader)
    throw new ApiError(400, "The request body is empty.", "invalid_json");
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      throw new ApiError(
        413,
        "This submission is too large.",
        "payload_too_large",
      );
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let body: unknown;
  try {
    body = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new ApiError(
      400,
      "The request body is not valid JSON.",
      "invalid_json",
    );
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ApiError(
      400,
      "The request body must be an object.",
      "invalid_json",
    );
  }
  return body as Record<string, unknown>;
}

export function requireString(
  value: unknown,
  name: string,
  min: number,
  max: number,
  trim = true,
) {
  if (typeof value !== "string")
    throw new ApiError(400, `${name} is required.`, "invalid_input");
  const clean = trim ? value.trim() : value;
  if (clean.length < min || clean.length > max) {
    throw new ApiError(
      400,
      `${name} must be between ${min} and ${max} characters.`,
      "invalid_input",
    );
  }
  return clean;
}

export function requireUuid(value: unknown, name: string) {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    throw new ApiError(400, `${name} is not valid.`, "invalid_input");
  }
  return value;
}

export function readCursor(url: URL) {
  const raw = url.searchParams.get("cursor");
  if (!raw) return undefined;
  try {
    const decoded = atob(raw.replaceAll("-", "+").replaceAll("_", "/"));
    const [date, id] = decoded.split("|");
    const parsed = new Date(date);
    if (!Number.isFinite(parsed.valueOf()) || !id)
      throw new Error("bad cursor");
    requireUuid(id, "cursor");
    return { date: parsed, id };
  } catch {
    throw new ApiError(
      400,
      "This page cursor is not valid. Refresh and try again.",
      "invalid_cursor",
    );
  }
}

export function makeCursor(date: Date, id: string) {
  return btoa(`${date.toISOString()}|${id}`)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = new URL(env.PUBLIC_SITE_URL).origin;
  if (!origin || origin !== expected) {
    throw new ApiError(
      403,
      "This request did not come from the publication.",
      "bad_origin",
    );
  }
}

export function apiError(error: unknown) {
  if (error instanceof ApiError) {
    const response = json(
      { error: error.message, code: error.code },
      error.status,
    );
    if (error.retryAfter)
      response.headers.set("retry-after", String(error.retryAfter));
    return response;
  }
  console.error(
    "community request failed",
    error instanceof Error ? error.name : "unknown error",
  );
  return json(
    {
      error: "The request could not be completed. Try again.",
      code: "internal_error",
    },
    500,
  );
}
