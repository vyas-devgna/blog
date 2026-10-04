const themeToggle = document.querySelector("#theme-toggle");
const themeColor = document.querySelector("#theme-color");
const root = document.documentElement;
const systemTheme = matchMedia("(prefers-color-scheme: dark)");

const isDarkTheme = () =>
  root.dataset.theme ? root.dataset.theme === "dark" : systemTheme.matches;

const syncThemeControl = () => {
  const dark = isDarkTheme();
  themeToggle?.setAttribute("aria-pressed", String(dark));
  themeToggle?.setAttribute(
    "aria-label",
    dark ? "Use light appearance" : "Use dark appearance",
  );
  themeColor?.setAttribute("content", dark ? "#000000" : "#fbfbfd");
};

syncThemeControl();
themeToggle?.addEventListener("click", () => {
  const theme = isDarkTheme() ? "light" : "dark";
  root.dataset.theme = theme;
  try {
    localStorage.setItem("vyas-theme", theme);
  } catch {
    // The current page still changes if storage is unavailable.
  }
  syncThemeControl();
});
systemTheme.addEventListener("change", syncThemeControl);

const menuToggle = document.querySelector("#menu-toggle");
const mobileMenu = document.querySelector("#mobile-navigation");
const menuLinks = [...(mobileMenu?.querySelectorAll("a") ?? [])];
const pageContent = document.querySelector("main");
const pageFooter = document.querySelector(".site-footer");

const closeMenu = (restoreFocus = false) => {
  if (!menuToggle || !mobileMenu || mobileMenu.hidden) return;
  mobileMenu.hidden = true;
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Open navigation menu");
  document.body.classList.remove("menu-open");
  if (pageContent) pageContent.inert = false;
  if (pageFooter) pageFooter.inert = false;
  if (restoreFocus) menuToggle.focus();
};

menuToggle?.addEventListener("click", () => {
  if (!mobileMenu) return;
  const open = mobileMenu.hidden;
  mobileMenu.hidden = !open;
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute(
    "aria-label",
    open ? "Close navigation menu" : "Open navigation menu",
  );
  document.body.classList.toggle("menu-open", open);
  if (pageContent) pageContent.inert = open;
  if (pageFooter) pageFooter.inert = open;
  if (open) menuLinks[0]?.focus();
});

mobileMenu?.addEventListener("click", (event) => {
  if (event.target instanceof Element && event.target.closest("a")) closeMenu();
});

document.addEventListener("keydown", (event) => {
  if (mobileMenu?.hidden) return;
  if (event.key === "Escape") {
    closeMenu(true);
    return;
  }
  if (event.key !== "Tab" || !menuLinks.length) return;
  const first = menuLinks[0];
  const last = menuLinks[menuLinks.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

matchMedia("(min-width: 881px)").addEventListener("change", () => closeMenu());
