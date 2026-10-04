import { afterEach, expect, it, vi } from "vitest";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});
it("initializes signed-in navigation even when the page event has already happened", async () => {
  const anonymous = [{ hidden: false }, { hidden: false }];
  const account = { hidden: true };
  const cta = { href: "/signup/", textContent: "Join the community" };
  const name = { textContent: "" };
  const moderation = { hidden: true };
  const elements = {
    "[data-account-name]": name,
    "[data-community-account-cta]": cta,
    "[data-account-moderation]": moderation,
  };
  vi.stubGlobal("document", {
    querySelectorAll: (selector: string) =>
      selector === "[data-anonymous-nav]" ? anonymous : [account],
    querySelector: (selector: string) =>
      elements[selector as keyof typeof elements] ?? null,
    addEventListener: vi.fn(),
  });
  vi.stubGlobal("window", { addEventListener: vi.fn() });
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ user: { name: "Reader" } })),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ role: "moderator" })),
      ),
  );
  await import("../../src/scripts/account-nav");
  await vi.waitFor(() => expect(moderation.hidden).toBe(false));
  expect(anonymous.every((item) => item.hidden)).toBe(true);
  expect(account.hidden).toBe(false);
  expect(name.textContent).toBe("Reader");
  expect(cta).toEqual({ href: "/settings/", textContent: "Your account" });
});
