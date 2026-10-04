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
