/* Vyas — PWA layer: service worker, install affordance, update notice. All optional. */
(() => {
  "use strict";
  const root = document.documentElement;
  const standalone = () =>
    matchMedia("(display-mode: standalone)").matches ||
    navigator.standalone === true;
  if (standalone()) root.classList.add("is-standalone");
  matchMedia("(display-mode: standalone)").addEventListener("change", () =>
    root.classList.toggle("is-standalone", standalone()),
  );
  const toast = (msg, ms) =>
    window.__vyasToast ? window.__vyasToast(msg, ms) : undefined;

  const secure =
    location.protocol === "https:" || location.hostname === "localhost";
  if ("serviceWorker" in navigator && secure) {
    addEventListener("load", async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        reg.addEventListener("updatefound", () => {
          const next = reg.installing;
          next?.addEventListener("statechange", () => {
            if (
              next.state === "installed" &&
              navigator.serviceWorker.controller
            )
              toast("Updated — refresh for the latest version.", 5000);
          });
        });
      } catch {
        /* offline reading is a bonus */
      }
    });
  }

  // Footer install control — created here so it needs no markup change; hidden until installable.
  const host = document.querySelector(".footer-brand");
  if (!host) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "footer-install";
  btn.hidden = true;
  btn.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0-4-4m4 4 4-4M5 19h14" /></svg><span>Install app</span>';
  host.append(btn);
  const label = btn.querySelector("span");
  const show = (text) => {
    if (text) label.textContent = text;
    btn.hidden = false;
  };

  let deferred = null;
  addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event;
    if (!standalone()) show("Install app");
  });
  addEventListener("appinstalled", () => {
    deferred = null;
    btn.hidden = true;
    toast("Installed — find it on your home screen or app list.", 3600);
  });

  const ios =
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (ios && !standalone()) show("Add to Home Screen");

  btn.addEventListener("click", async () => {
    if (deferred) {
      deferred.prompt();
      const { outcome } = await deferred.userChoice;
      deferred = null;
      if (outcome === "accepted") btn.hidden = true;
      return;
    }
    if (ios) toast("Tap the Share icon, then “Add to Home Screen”.", 6000);
  });
})();
