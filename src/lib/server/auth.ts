import {
  handleAuthProxyRequest,
  type SessionData,
} from "@neondatabase/auth/server";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { profiles, notificationPreferences } from "../db/schema";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code: string,
    readonly retryAfter?: number,
  ) {
    super(message);
  }
}

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
}

export interface AuthContext {
  user: AuthenticatedUser;
  profile: typeof profiles.$inferSelect;
  sessionId: string;
  sessionCreatedAt: string | Date;
  cookies: string[];
}

export const authCookieConfig = () => {
  if (!env.NEON_AUTH_COOKIE_SECRET || env.NEON_AUTH_COOKIE_SECRET.length < 32) {
    throw new ApiError(
      503,
      "Sign in is temporarily unavailable.",
      "auth_not_configured",
    );
  }
  if (!env.NEON_AUTH_BASE_URL) {
    throw new ApiError(
      503,
      "Sign in is temporarily unavailable.",
      "auth_not_configured",
    );
  }
  return {
    baseUrl: env.NEON_AUTH_BASE_URL,
    cookieSecret: env.NEON_AUTH_COOKIE_SECRET,
    sameSite: "lax" as const,
  };
};

export async function proxyAuthRequest(request: Request, path: string) {
  const config = authCookieConfig();
  return handleAuthProxyRequest({ request, path, ...config });
}

export async function getAuthContext(
  request: Request,
  options: { allowDeleted?: boolean; allowBlocked?: boolean } = {},
): Promise<AuthContext> {
  const config = authCookieConfig();
  const currentUrl = new URL(request.url);
  const sessionRequest = new Request(
    new URL("/api/auth/get-session?disableCookieCache=true", currentUrl),
    {
      method: "GET",
      headers: new Headers({
        cookie: request.headers.get("cookie") ?? "",
        origin: currentUrl.origin,
        "user-agent": request.headers.get("user-agent") ?? "",
      }),
    },
  );
  const response = await handleAuthProxyRequest({
    request: sessionRequest,
    path: "get-session",
    ...config,
  });
  if (!response.ok) {
    throw new ApiError(
      503,
      "Your session could not be checked. Try again.",
      "session_unavailable",
    );
  }

  let session: SessionData | null;
  try {
    session = (await response.json()) as SessionData | null;
  } catch {
    throw new ApiError(
      503,
      "Your session could not be checked. Try again.",
      "session_unavailable",
    );
  }
  if (!session?.user || !session.session) {
    throw new ApiError(401, "Sign in to continue.", "sign_in_required");
  }
  if (!session.user.emailVerified) {
    throw new ApiError(
      403,
      "Verify your email before using the community.",
      "email_unverified",
    );
  }

  const user = session.user as AuthenticatedUser;
  const db = getDb();
  let [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, user.id))
    .limit(1);
  if (!profile) {
    const base = usernameBase(
      user.name || user.email.split("@")[0] || "reader",
    );
    const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 6);
    const username = `${base.slice(0, 17)}_${suffix}`;
    try {
      await db
        .insert(profiles)
        .values({
          userId: user.id,
          role:
            env.INITIAL_MODERATOR_EMAIL?.trim().toLowerCase() ===
            user.email.toLowerCase()
              ? "moderator"
              : "user",
          username,
          displayName: (user.name || "Community member").trim().slice(0, 80),
          emailAddress: user.emailVerified ? user.email.toLowerCase() : null,
        })
        .onConflictDoNothing();
      await db
        .insert(notificationPreferences)
        .values({ userId: user.id })
        .onConflictDoNothing();
    } catch {
      throw new ApiError(
        503,
        "Your community profile could not be created. Try again.",
        "profile_unavailable",
      );
    }
    [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, user.id))
      .limit(1);
  }
  if (!profile)
    throw new ApiError(
      503,
      "Your community profile could not be loaded.",
      "profile_unavailable",
    );
  if (
    profile.status !== "deleted" &&
    user.emailVerified &&
    profile.emailAddress !== user.email.toLowerCase()
  ) {
    [profile] = await db
      .update(profiles)
      .set({ emailAddress: user.email.toLowerCase(), updatedAt: new Date() })
      .where(eq(profiles.userId, user.id))
      .returning();
  }
  if (!profile)
    throw new ApiError(
      503,
      "Your community profile could not be loaded.",
      "profile_unavailable",
    );
  if (
    (profile.status === "banned" && !options.allowBlocked) ||
    (profile.status === "deleted" && !options.allowDeleted)
  ) {
    throw new ApiError(
      403,
      "This account cannot use the community.",
      "account_unavailable",
    );
  }
  if (profile.status === "suspended" && !options.allowBlocked) {
    throw new ApiError(
      403,
      "This account is suspended from posting.",
      "account_suspended",
    );
  }

  return {
    user,
    profile,
    sessionId: session.session.id,
    sessionCreatedAt: session.session.createdAt,
    cookies: response.headers.getSetCookie?.() ?? [],
  };
}

export function requireRole(
  profile: typeof profiles.$inferSelect,
  role: "moderator" | "admin",
) {
  const allowed =
    role === "moderator"
      ? profile.role === "moderator" || profile.role === "admin"
      : profile.role === "admin";
  if (!allowed)
    throw new ApiError(
      403,
      "You do not have permission to do that.",
      "forbidden",
    );
}

export function usernameBase(value: string) {
  const normalized = value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  const base = normalized
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return base.length >= 3 ? base : "reader";
}
