import { afterEach, describe, expect, it, vi } from "vitest";
import { requestJson } from "../../src/lib/client-api";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
describe("shared API transport", () => {
  it("sends uncached same-origin JSON once", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ success: true }));
    vi.stubGlobal("fetch", fetch);
    await expect(
      requestJson("/api/test", { body: "Hello" }, "POST"),
    ).resolves.toEqual({ success: true });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][1]).toMatchObject({
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      body: '{"body":"Hello"}',
    });
  });
  it("reports rate limits and expired sessions even for non-JSON errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("offline", { status: 429 })),
    );
    await expect(requestJson("/api/test")).rejects.toThrow("Too many requests");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("", { status: 401 })),
    );
    await expect(requestJson("/api/test")).rejects.toThrow(
      "Your session has ended",
    );
  });
  it("keeps structured server errors readable", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ error: "Username is unavailable." }, { status: 409 }),
        ),
    );
    await expect(requestJson("/api/test")).rejects.toThrow(
      "Username is unavailable.",
    );
  });
  it("rejects malformed successful responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>")));
    await expect(requestJson("/api/test")).rejects.toThrow(
      "unreadable response",
    );
  });
  it("reports network failure without retrying a write", async () => {
    const fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetch);
    await expect(requestJson("/api/test", {}, "POST")).rejects.toThrow(
      "Check your connection",
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("bounds a stalled request and warns that writes may have completed", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_path, options) =>
          new Promise((_resolve, reject) =>
            options.signal.addEventListener("abort", () =>
              reject(new DOMException("Aborted", "AbortError")),
            ),
          ),
      ),
    );
    const result = requestJson("/api/test", {}, "POST");
    const assertion = expect(result).rejects.toThrow(
      "check whether it completed",
    );
    await vi.advanceTimersByTimeAsync(20000);
    await assertion;
  });
});
