import { beforeEach, describe, expect, it, vi } from "vitest";
import type { APIContext } from "astro";

const { proxy, rateLimit, turnstile } = vi.hoisted(() => ({
  proxy: vi.fn(),
  rateLimit: vi.fn(),
  turnstile: vi.fn(),
}));
vi.mock("cloudflare:workers", () => ({
  env: {
    PUBLIC_SITE_URL: "https://blog.vyasdevgna.online",
    NEON_AUTH_BASE_URL: "https://auth.example.com/neondb/auth",
  },
}));
vi.mock("../../src/lib/server/db", () => ({ getDb: () => ({}) }));
vi.mock("../../src/lib/server/rate-limit", () => ({
  enforceRateLimit: rateLimit,
  clientRateKey: () => "test",
}));
vi.mock("../../src/lib/server/turnstile", () => ({
  verifyTurnstile: turnstile,
}));
vi.mock("../../src/lib/server/auth", () => ({
  ApiError: class extends Error {
    constructor(
      readonly status: number,
      message: string,
      readonly code: string,
    ) {
      super(message);
    }
  },
  proxyAuthRequest: proxy,
}));
import { ALL } from "../../src/pages/api/auth/[...path]";

async function route(
  path: string,
  body?: Record<string, unknown>,
  origin = "https://blog.vyasdevgna.online",
) {
  return ALL({
    params: { path },
    request: new Request(`https://blog.vyasdevgna.online/api/auth/${path}`, {
      method: body ? "POST" : "GET",
      headers: { origin, "content-type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    }),
  } as unknown as APIContext);
}
beforeEach(() => {
  vi.clearAllMocks();
  proxy.mockImplementation(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          url: "https://auth.example.com/neondb/auth/shared-oauth",
        }),
        { headers: { "content-type": "application/json" } },
      ),
    ),
  );
});
describe("authentication boundary", () => {
  it("forces Google and local callbacks even when clients supply external URLs or account tokens", async () => {
    const response = await route("sign-in/social", {
      provider: "google",
      returnTo: "//evil.example",
      callbackURL: "https://evil.example",
      idToken: { token: "untrusted" },
      requestSignUp: true,
    });
    expect(response.status).toBe(200);
    const body = await (proxy.mock.calls[0][0] as Request).json();
    expect(body).toEqual({
      provider: "google",
      disableRedirect: true,
      callbackURL:
        "https://blog.vyasdevgna.online/auth/callback/?returnTo=%2Fsettings%2F",
      newUserCallbackURL:
        "https://blog.vyasdevgna.online/auth/callback/?returnTo=%2Fsettings%2F",
      errorCallbackURL:
        "https://blog.vyasdevgna.online/auth/callback/?returnTo=%2Fsettings%2F",
    });
    expect(rateLimit).toHaveBeenCalled();
  });
  it("rejects unexpected upstream OAuth redirect hosts", async () => {
    proxy.mockResolvedValue(
      new Response(JSON.stringify({ url: "https://evil.example" })),
    );
    expect((await route("sign-in/social", { provider: "google" })).status).toBe(
      502,
    );
  });
  it("rejects other providers and cross-origin OAuth initiation", async () => {
    expect((await route("sign-in/social", { provider: "github" })).status).toBe(
      400,
    );
    expect(
      (
        await route(
          "sign-in/social",
          { provider: "google" },
          "https://evil.example",
        )
      ).status,
    ).toBe(403);
    expect(proxy).not.toHaveBeenCalled();
  });
  it("blocks direct deletion that would bypass community cleanup", async () => {
    expect((await route("delete-user", { password: "password" })).status).toBe(
      404,
    );
    expect(proxy).not.toHaveBeenCalled();
  });
  it("does not expose session tokens while preserving HttpOnly cookies", async () => {
    proxy.mockResolvedValue(
      new Response(
        JSON.stringify({
          user: {
            id: "user",
            name: "Reader",
            email: "reader@example.com",
            emailVerified: true,
          },
          session: {
            id: "session",
            token: "private-token",
            expiresAt: "tomorrow",
          },
        }),
        {
          headers: {
            "set-cookie": "session=private; HttpOnly; Secure",
            "set-auth-token": "private-token",
            "set-auth-jwt": "private-jwt",
            "content-encoding": "gzip",
          },
        },
      ),
    );
    const response = await route("get-session");
    expect(JSON.stringify(await response.json())).not.toContain(
      "private-token",
    );
    expect(response.headers.get("set-auth-token")).toBeNull();
    expect(response.headers.get("set-auth-jwt")).toBeNull();
    expect(response.headers.get("content-encoding")).toBeNull();
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  });
  it("keeps email signup behind server challenge verification", async () => {
    await route("sign-up/email", {
      name: "Reader",
      email: "reader@example.com",
      password: "long-password",
      turnstileToken: "test-challenge",
    });
    expect(turnstile).toHaveBeenCalledWith(
      "test-challenge",
      "signup",
      expect.any(Request),
    );
    expect(await (proxy.mock.calls[0][0] as Request).json()).not.toHaveProperty(
      "turnstileToken",
    );
  });
});
