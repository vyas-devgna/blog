try {
  const savedTheme = localStorage.getItem("vyas-theme");
  const root = document.documentElement;
  if (savedTheme === "light" || savedTheme === "dark")
    root.dataset.theme = savedTheme;
  const dark =
    root.dataset.theme === "dark" ||
    (!root.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
  document
    .querySelector("#theme-color")
    ?.setAttribute("content", dark ? "#000000" : "#fbfbfd");
} catch {
  // Theme storage is optional; system preferences remain available.
}

// Header auth hint: the real session check is async, so remember the last known state and paint the
// header correctly on the very first frame (account-nav.ts confirms or corrects it a moment later).
try {
  const hint = JSON.parse(localStorage.getItem("vyas-auth") || "null");
  if (hint) document.documentElement.dataset.auth = hint.in ? "in" : "out";
} catch {
  // Without storage the header simply settles after the session check.
}
