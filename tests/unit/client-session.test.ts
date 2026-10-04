import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

it("shares concurrent session reads without persisting their result", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ user: { name: "Reader" } })),
    )
    .mockResolvedValueOnce(new Response("null"));
  vi.stubGlobal("fetch", fetcher);
  const { readClientSession } = await import("../../src/lib/client-session");
  const first = readClientSession();
  const concurrent = readClientSession();
  expect(first).toBe(concurrent);
  expect(await first).toEqual({ user: { name: "Reader" } });
  expect(await readClientSession()).toBeNull();
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(fetcher).toHaveBeenCalledWith(
    "/api/auth/get-session?disableCookieCache=true",
    expect.objectContaining({ credentials: "same-origin", cache: "no-store" }),
  );
});

it("allows a fresh check after a failed session request", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(new Response("{}", { status: 503 }))
    .mockResolvedValueOnce(new Response("null"));
  vi.stubGlobal("fetch", fetcher);
  const { readClientSession } = await import("../../src/lib/client-session");
  await expect(readClientSession()).rejects.toThrow(
    "Could not check your session.",
  );
  expect(await readClientSession()).toBeNull();
  expect(fetcher).toHaveBeenCalledTimes(2);
});
