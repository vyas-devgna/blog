export {};

async function refreshAccountNav() {
  try {
    const response = await fetch(
      "/api/auth/get-session?disableCookieCache=true",
      {
        credentials: "same-origin",
        cache: "no-store",
      },
    );
    if (!response.ok) return;
    const session = await response.json();
    const signedIn = Boolean(session?.user);
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
      name.textContent = session.user.name || "Your account";
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
      location.assign("/");
    } catch {
      const status = document.querySelector<HTMLElement>(
        "[data-account-error]",
      );
      if (status) status.textContent = "Sign out failed. Please retry.";
      button.disabled = false;
    }
  });
