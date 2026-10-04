export {};
// Enhance existing password inputs without changing validation or authentication.
for (const input of document.querySelectorAll<HTMLInputElement>(
  'input[type="password"]',
)) {
  const wrapper = document.createElement("div");
  wrapper.className = "password-control";
  input.before(wrapper);
  wrapper.append(input);
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Show";
  button.setAttribute(
    "aria-label",
    `Show ${input.labels?.[0]?.textContent?.trim().toLowerCase() ?? "password"}`,
  );
  button.setAttribute("aria-controls", input.id);
  button.setAttribute("aria-pressed", "false");
  button.addEventListener("click", () => {
    const visible = input.type === "password";
    input.type = visible ? "text" : "password";
    button.textContent = visible ? "Hide" : "Show";
    button.setAttribute("aria-pressed", String(visible));
    button.setAttribute(
      "aria-label",
      `${visible ? "Hide" : "Show"} ${input.labels?.[0]?.textContent?.trim().toLowerCase() ?? "password"}`,
    );
  });
  wrapper.append(button);
}
