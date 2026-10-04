const input = document.querySelector("#article-search");
const cards = [...document.querySelectorAll(".search-result-card")];
const empty = document.querySelector("#search-empty");
const searchStatus = document.querySelector("#search-status");

function appendHighlight(target, value, query) {
  if (!target) return;
  target.replaceChildren();
  if (!query) {
    target.append(document.createTextNode(value));
    return;
  }

  const lowerValue = value.toLocaleLowerCase();
  const lowerQuery = query.toLocaleLowerCase();
  let position = 0;
  let match = lowerValue.indexOf(lowerQuery, position);
  while (match !== -1) {
    target.append(document.createTextNode(value.slice(position, match)));
    const mark = document.createElement("mark");
    mark.textContent = value.slice(match, match + query.length);
    target.append(mark);
    position = match + query.length;
    match = lowerValue.indexOf(lowerQuery, position);
  }
  target.append(document.createTextNode(value.slice(position)));
}

function updateSearch() {
  if (!input) return;
  const query = input.value.trim();
  let visible = 0;
  for (const card of cards) {
    const matches =
      !query || (card.dataset.search ?? "").includes(query.toLocaleLowerCase());
    if (card.parentElement) card.parentElement.hidden = !matches;
    if (matches) visible += 1;
    appendHighlight(
      card.querySelector(".search-result-title"),
      card.dataset.title ?? "",
      query,
    );
    appendHighlight(
      card.querySelector(".search-result-description"),
      card.dataset.description ?? "",
      query,
    );
  }
  if (empty) empty.hidden = !query || visible > 0;
  if (searchStatus)
    searchStatus.textContent = query
      ? `${visible} ${visible === 1 ? "essay" : "essays"} found for “${query}”.`
      : cards.length
        ? `Showing all ${cards.length} ${cards.length === 1 ? "essay" : "essays"}.`
        : "No essays are published yet.";
}

input?.addEventListener("input", updateSearch);
document.addEventListener("keydown", (event) => {
  const target = event.target;
  if (event.key === "/" && target === input) return;
  if (
    target instanceof HTMLElement &&
    target !== input &&
    (target.isContentEditable || target.matches("input, textarea, select"))
  )
    return;
  const focusShortcut =
    event.key === "/" ||
    (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey));
  if (!focusShortcut || event.altKey || !input) return;
  event.preventDefault();
  input.focus();
});
