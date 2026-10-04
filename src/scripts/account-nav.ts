import { readClientSession } from "../lib/client-session";

const AUTH_HINT = "vyas-auth";
const initialsOf = (name: string) =>
  String(name || "Vyas")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase();

function setAuthState(value: "in" | "out") {
  const root = document.documentElement as HTMLElement | undefined;
  if (root) root.dataset.auth = value;
}

function readHint(): { in: boolean; name?: string } | null {
  try {
    return JSON.parse(localStorage.getItem(AUTH_HINT) || "null");
  } catch {
    return null;
  }
}
function writeHint(value: { in: boolean; name?: string } | null) {
  try {
    if (value) localStorage.setItem(AUTH_HINT, JSON.stringify(value));
    else localStorage.removeItem(AUTH_HINT);
  } catch {
    /* the header just settles after the session check */
  }
}

// First paint: show the last known identity right away so the header never visibly jumps.
const cached = readHint();
if (cached?.in) {
  setAuthState("in");
  const name = document.querySelector<HTMLElement>("[data-account-name]");
  if (name && cached.name) name.textContent = cached.name;
  const initials = document.querySelector<HTMLElement>(
    "[data-account-initials]",
  );
  if (initials) initials.textContent = initialsOf(cached.name || "");
}

async function refreshAccountNav() {
  try {
    const session = await readClientSession();
    const signedIn = Boolean(session?.user);
    setAuthState(signedIn ? "in" : "out");
    writeHint(
      signedIn
        ? { in: true, name: session?.user?.name || "Your account" }
        : null,
    );
    for (const link of document.querySelectorAll<HTMLElement>(
      "[data-anonymous-nav]",
    ))
      link.hidden = signedIn;
    for (const element of document.querySelectorAll<HTMLElement>(
      "[data-account-menu], [data-authenticated-nav]",
    ))
      element.hidden = !signedIn;
    const cta = document.querySelector<HTMLAnchorElement>(
      "[data-community-account-cta]",
    );
    if (cta) {
      cta.href = signedIn ? "/settings/" : "/signup/";
      cta.textContent = signedIn ? "Your account" : "Join the community";
    }
    const name = document.querySelector<HTMLElement>("[data-account-name]");
    if (name && signedIn)
      name.textContent = session?.user?.name || "Your account";
    const initials = document.querySelector<HTMLElement>(
      "[data-account-initials]",
    );
    if (initials && signedIn)
      initials.textContent = String(session?.user?.name || "Vyas")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toLocaleUpperCase();
    if (signedIn) {
      const profileResponse = await fetch("/api/community/profile", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (profileResponse.ok) {
        const profile = await profileResponse.json();
        const link = document.querySelector<HTMLElement>(
          "[data-account-moderation]",
        );
        if (link)
          link.hidden = !(
            profile.role === "admin" || profile.role === "moderator"
          );
      }
    }
  } catch {
    /* Keep the last known navigation if the network is unavailable. */
  }
}
void refreshAccountNav();
window.addEventListener("pageshow", (event) => {
  if (event.persisted) void refreshAccountNav();
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) void refreshAccountNav();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape")
    document
      .querySelector<HTMLDetailsElement>("[data-account-menu]")
      ?.removeAttribute("open");
});
document.addEventListener("click", (event) => {
  const menu = document.querySelector<HTMLDetailsElement>(
    "[data-account-menu]",
  );
  if (menu && event.target instanceof Node && !menu.contains(event.target))
    menu.open = false;
});
document
  .querySelector<HTMLButtonElement>("[data-account-logout]")
  ?.addEventListener("click", async (event) => {
    const button = event.currentTarget as HTMLButtonElement;
    button.disabled = true;
    try {
      const response = await fetch("/api/auth/sign-out", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      if (!response.ok) throw new Error("Sign out failed. Please retry.");
      writeHint(null);
      location.assign("/");
    } catch {
      const status = document.querySelector<HTMLElement>(
        "[data-account-error]",
      );
      if (status) status.textContent = "Sign out failed. Please retry.";
      button.disabled = false;
    }
  });
