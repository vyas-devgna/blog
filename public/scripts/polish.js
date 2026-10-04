/* Vyas — interaction polish. Everything here is progressive: pages work without it. */
(() => {
  "use strict";
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---- toast ---- */
  let toastEl;
  let toastTimer = 0;
  const toast = (msg, ms = 2400) => {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "pwa-toast";
      toastEl.setAttribute("role", "status");
      toastEl.setAttribute("aria-live", "polite");
      document.body.append(toastEl);
    }
    toastEl.textContent = msg;
    void toastEl.offsetWidth;
    toastEl.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-on"), ms);
  };
  window.__vyasToast = toast;

  /* ---- password reveal ---- */
  $$('input[type="password"]').forEach((input) => {
    if (input.closest(".field-wrap")) return;
    const wrap = document.createElement("span");
    wrap.className = "field-wrap";
    input.before(wrap);
    wrap.append(input);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "field-reveal";
    btn.textContent = "Show";
    btn.setAttribute(
      "aria-label",
      `Show ${input.labels?.[0]?.textContent?.trim().toLowerCase() || "password"}`,
    );
    btn.setAttribute("aria-controls", input.id);
    btn.setAttribute("aria-pressed", "false");
    btn.addEventListener("click", () => {
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.textContent = show ? "Hide" : "Show";
      btn.setAttribute(
        "aria-label",
        `${show ? "Hide" : "Show"} ${input.labels?.[0]?.textContent?.trim().toLowerCase() || "password"}`,
      );
      btn.setAttribute("aria-pressed", String(show));
      input.focus({ preventScroll: true });
    });
    wrap.append(btn);
  });

  /* ---- textarea: auto-grow + live character count ---- */
  $$("textarea").forEach((area) => {
    const grow = () => {
      area.style.height = "auto";
      area.style.height = `${Math.min(area.scrollHeight + 2, innerHeight * 0.7)}px`;
    };
    area.addEventListener("input", grow);
    grow();
    const max = Number(area.getAttribute("maxlength"));
    if (!max) return;
    const count = document.createElement("span");
    count.className = "field-count";
    count.setAttribute("aria-hidden", "true");
    area.after(count);
    const update = () => {
      count.textContent = `${area.value.length.toLocaleString()} / ${max.toLocaleString()}`;
      count.toggleAttribute("data-near", area.value.length > max * 0.9);
    };
    area.addEventListener("input", update);
    update();
  });

  /* ---- pending state on submit buttons ---- */
  document.addEventListener(
    "submit",
    (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      const btn =
        event.submitter || form.querySelector('button[type="submit"]');
      if (!btn || !btn.classList.contains("pill")) return;
      btn.dataset.pending = "";
      const clear = () => {
        delete btn.dataset.pending;
        observer.disconnect();
        clearTimeout(timer);
      };
      const observer = new MutationObserver(() => {
        if (!btn.disabled) clear();
      });
      observer.observe(btn, {
        attributes: true,
        attributeFilter: ["disabled"],
      });
      const timer = setTimeout(clear, 20000);
      // Handlers that take over the submit disable the button synchronously; if nothing did, don't fake progress.
      queueMicrotask(() => {
        if (event.defaultPrevented && !btn.disabled) clear();
      });
    },
    true,
  );

  /* ---- heading anchors (articles) ---- */
  $$(".article-body :is(h2, h3)[id]").forEach((h) => {
    const a = document.createElement("a");
    a.className = "heading-anchor";
    a.href = `#${h.id}`;
    a.textContent = "#";
    a.setAttribute("aria-label", `Copy link to “${h.textContent}”`);
    a.addEventListener("click", async (event) => {
      const url = `${location.origin}${location.pathname}#${h.id}`;
      try {
        await navigator.clipboard.writeText(url);
        toast("Link copied");
      } catch {
        /* the hash still updates */
      }
      history.replaceState(null, "", `#${h.id}`);
      event.preventDefault();
      h.scrollIntoView({
        behavior: reduced ? "auto" : "smooth",
        block: "start",
      });
    });
    h.prepend(a);
  });

  /* ---- pointer spotlight on cards ---- */
  if (fine && !reduced) {
    const watch = (root = document) =>
      $$(
        ".article-card, .discussion-card, .settings-card, .project-card",
        root,
      ).forEach((el) => {
        if (el.dataset.spot) return;
        el.dataset.spot = "1";
        el.classList.add("spot");
        el.addEventListener(
          "pointermove",
          (e) => {
            const r = el.getBoundingClientRect();
            el.style.setProperty("--mx", `${e.clientX - r.left}px`);
            el.style.setProperty("--my", `${e.clientY - r.top}px`);
          },
          { passive: true },
        );
      });
    watch();
    // Discussion cards are rendered client-side after load.
    new MutationObserver(() => watch()).observe(
      document.querySelector("main") || document.body,
      { childList: true, subtree: true },
    );
  }

  /* ---- prefetch internal pages on hover/touch intent ---- */
  const seen = new Set();
  const prefetch = (a) => {
    if (!a || !a.href || seen.has(a.href)) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.pathname === location.pathname)
      return;
    if (
      /^\/(api|auth|login|signup|settings|admin|moderation|notifications|verify-email|forgot-password)\b/.test(
        url.pathname,
      )
    )
      return;
    if (
      navigator.connection &&
      (navigator.connection.saveData ||
        /2g/.test(navigator.connection.effectiveType || ""))
    )
      return;
    seen.add(a.href);
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.href = url.href;
    document.head.append(link);
  };
  let hoverTimer = 0;
  document.addEventListener(
    "pointerover",
    (e) => {
      const a = e.target.closest?.("a[href]");
      if (!a) return;
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => prefetch(a), 90);
    },
    { passive: true },
  );
  document.addEventListener(
    "touchstart",
    (e) => prefetch(e.target.closest?.("a[href]")),
    { passive: true },
  );

  /* ---- sharing: copy link, and the native share sheet where the browser has one ---- */
  document.querySelectorAll("[data-copy-link]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.url || location.href);
        toast("Link copied");
      } catch {
        toast("Copy failed — select the address bar instead");
      }
    });
  });
  document.querySelectorAll("[data-native-share]").forEach((btn) => {
    if (!navigator.share) return;
    btn.hidden = false;
    btn.addEventListener("click", async () => {
      try {
        await navigator.share({
          title: btn.dataset.title,
          url: btn.dataset.url,
        });
      } catch {
        /* the person closed the share sheet */
      }
    });
  });
})();
