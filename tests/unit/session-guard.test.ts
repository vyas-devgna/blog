import { beforeEach, expect, it, vi } from "vitest";
const { proxy, db } = vi.hoisted(() => ({
  proxy: vi.fn(),
  db: { select: vi.fn(), insert: vi.fn() },
}));
vi.mock("cloudflare:workers", () => ({
  env: {
    NEON_AUTH_BASE_URL: "https://auth.example.com",
    NEON_AUTH_COOKIE_SECRET: "x".repeat(32),
    INITIAL_MODERATOR_EMAIL: "moderator@example.com",
  },
}));
vi.mock("@neondatabase/auth/server", () => ({ handleAuthProxyRequest: proxy }));
vi.mock("../../src/lib/server/db", () => ({ getDb: () => db }));
import { getAuthContext } from "../../src/lib/server/auth";
const request = () =>
  new Request("https://blog.vyasdevgna.online/api/community/profile", {
    headers: { cookie: "session=test" },
  });
const user = {
  id: "user",
  name: "Reader",
  email: "moderator@example.com",
  emailVerified: true,
};
const session = { id: "session", createdAt: new Date().toISOString() };
beforeEach(() => {
  vi.clearAllMocks();
});
it("uses a live session check for every protected request, including cached-cookie clients", async () => {
  proxy.mockResolvedValue(new Response("null"));
  await expect(getAuthContext(request())).rejects.toMatchObject({
    status: 401,
  });
  expect(proxy.mock.calls[0][0].request.url).toContain(
    "disableCookieCache=true",
  );
  expect(db.select).not.toHaveBeenCalled();
});
it("rejects unverified identities before provisioning any role", async () => {
  proxy.mockResolvedValue(
    new Response(
      JSON.stringify({ user: { ...user, emailVerified: false }, session }),
    ),
  );
  await expect(getAuthContext(request())).rejects.toMatchObject({
    code: "email_unverified",
  });
  expect(db.insert).not.toHaveBeenCalled();
});
it("grants the nominated moderator only when creating a verified profile", async () => {
  proxy.mockResolvedValue(new Response(JSON.stringify({ user, session })));
  const profile = {
    userId: "user",
    emailAddress: user.email,
    status: "active",
    role: "moderator",
  };
  const limit = vi
    .fn()
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([profile]);
  db.select.mockReturnValue({ from: () => ({ where: () => ({ limit }) }) });
  const values = vi
    .fn()
    .mockReturnValue({ onConflictDoNothing: () => Promise.resolve() });
  db.insert.mockReturnValue({ values });
  await expect(getAuthContext(request())).resolves.toMatchObject({
    profile: { role: "moderator" },
  });
  expect(values.mock.calls[0][0]).toMatchObject({
    role: "moderator",
    userId: "user",
  });
});
it("does not override an existing profile role or a banned status", async () => {
  proxy.mockResolvedValue(new Response(JSON.stringify({ user, session })));
  db.select.mockReturnValue({
    from: () => ({
      where: () => ({
        limit: () =>
          Promise.resolve([
            {
              userId: "user",
              emailAddress: user.email,
              status: "banned",
              role: "user",
            },
          ]),
      }),
    }),
  });
  await expect(getAuthContext(request())).rejects.toMatchObject({
    code: "account_unavailable",
  });
  expect(db.insert).not.toHaveBeenCalled();
});
