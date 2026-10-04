import { and, eq, lt } from "drizzle-orm";
import { sql } from "drizzle-orm";
import type { AppDb } from "./db";
import { rateLimits } from "../db/schema";
import { ApiError } from "./auth";

async function hash(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function enforceRateLimit(
  db: AppDb,
  scope: string,
  identity: string,
  maximum: number,
  periodSeconds: number,
) {
  const now = new Date();
  const bucket = Math.floor(now.valueOf() / (periodSeconds * 1000));
  const end = new Date((bucket + 1) * periodSeconds * 1000);
  const keyHash = await hash(identity);
  const [entry] = await db
    .insert(rateLimits)
    .values({ scope, keyHash, count: 1, windowEndsAt: end })
    .onConflictDoUpdate({
      target: [rateLimits.scope, rateLimits.keyHash],
      set: {
        count: sql`case when ${rateLimits.windowEndsAt} <= ${now} then 1 else ${rateLimits.count} + 1 end`,
        windowEndsAt: sql`case when ${rateLimits.windowEndsAt} <= ${now} then ${end} else ${rateLimits.windowEndsAt} end`,
      },
    })
    .returning({
      count: rateLimits.count,
      windowEndsAt: rateLimits.windowEndsAt,
    });
  if (entry.count > maximum) {
    const retryAfter = Math.max(
      1,
      Math.ceil((entry.windowEndsAt.valueOf() - now.valueOf()) / 1000),
    );
    throw new ApiError(
      429,
      "You are doing that too often. Wait a little and try again.",
      "rate_limited",
      retryAfter,
    );
  }
  if (Math.random() < 0.01) {
    await db
      .delete(rateLimits)
      .where(
        and(eq(rateLimits.scope, scope), lt(rateLimits.windowEndsAt, now)),
      );
  }
}

export function clientRateKey(request: Request, userId?: string) {
  const address = request.headers.get("cf-connecting-ip") ?? "unknown-client";
  return userId ? `user:${userId}` : `ip:${address}`;
}
