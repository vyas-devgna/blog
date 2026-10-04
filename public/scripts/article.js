document.querySelectorAll(".article-body pre").forEach((pre) => {
  const frame = document.createElement("div");
  frame.className = "code-frame";
  pre.before(frame);
  frame.append(pre);

  const copy = document.createElement("button");
  copy.className = "copy-code";
  copy.type = "button";
  copy.textContent = "Copy code";
  const status = document.createElement("span");
  status.className = "copy-status";
  status.setAttribute("aria-live", "polite");
  frame.append(copy, status);

  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(
        pre.querySelector("code")?.innerText ?? pre.innerText,
      );
      status.textContent = "Copied";
    } catch {
      status.textContent = "Copy failed";
    }
  });
});

const tocLinks = [...document.querySelectorAll(".toc-rail a, .toc-mobile a")];
const headings = tocLinks
  .map((link) =>
    document.getElementById(decodeURIComponent(link.hash.slice(1))),
  )
  .filter(Boolean);

if ("IntersectionObserver" in window && headings.length) {
  const tocObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (!visible) return;
      const activeHash = "#" + visible.target.id;
      tocLinks.forEach((link) => {
        if (link.hash === activeHash)
          link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    },
    { rootMargin: "-15% 0px -75% 0px" },
  );
  headings.forEach((heading) => tocObserver.observe(heading));
}
