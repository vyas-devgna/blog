import { actionDialog } from "../lib/dialog";
import { requestJson } from "../lib/client-api";
import { readClientSession } from "../lib/client-session";
export {};

type CommunityProfile = {
  id: string;
  username: string;
  displayName: string;
  role: string;
  trustLevel: string;
};
type CommunityAuthor = {
  id: string | null;
  username: string | null;
  displayName: string;
};
type CommunityItem = {
  id: string;
  slug?: string;
  postSlug?: string;
  parentId?: string | null;
  body: string;
  title?: string;
  name?: string;
  deleted?: boolean;
  pinned?: boolean;
  locked?: boolean;
  replyCount?: number;
  likeCount?: number;
  createdAt: string;
  editedAt?: string | null;
  author?: CommunityAuthor;
  categoryName?: string;
  categorySlug?: string;
  href?: string;
  message?: string;
  readAt?: string | null;
};
type Result = Record<string, unknown> & {
  error?: string;
  items?: CommunityItem[];
  item?: CommunityItem;
};

const api = (path: string, data?: Record<string, unknown>, method = "GET") =>
  requestJson<Result>(path, data, method);

function textElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text: string,
) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  return element;
}

function safeHref(value: string | undefined) {
  return value?.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\")
    ? value
    : "/";
}

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? ""
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function setStatus(root: ParentNode, text: string, error = false) {
  const status = root.querySelector<HTMLElement>("[data-community-status]");
  if (status) {
    status.textContent = text;
    status.dataset.error = String(error);
  }
}

function setFormMessage(form: HTMLFormElement, text: string, error = false) {
  const status = form.querySelector<HTMLElement>("[data-form-message]");
  if (status) {
    status.textContent = text;
    status.dataset.error = String(error);
  }
}

declare global {
  interface Window {
    turnstile?: {
      render(element: HTMLElement, options: Record<string, unknown>): string;
      reset(widgetId?: string): void;
    };
  }
}

let currentProfile: CommunityProfile | null = null;
let turnstileConfig: { turnstileSiteKey?: string | null } = {};
let turnstileScript: Promise<void> | null = null;

async function loadCommunityContext() {
  const [config, profile] = await Promise.all([
    api("/api/community/config").catch(() => ({}) as Result),
    readClientSession()
      .then((session) => (session?.user ? api("/api/community/profile") : null))
      .catch(() => null),
  ]);
  turnstileConfig = config as { turnstileSiteKey?: string | null };
  if (profile) currentProfile = profile as unknown as CommunityProfile;
  return currentProfile;
}

async function mountTurnstile(
  form: HTMLFormElement,
  action: "comment" | "thread" | "reply",
) {
  if (!currentProfile || currentProfile.trustLevel !== "new") return;
  const slot = form.querySelector<HTMLElement>("[data-challenge-slot]");
  if (!slot) return;
  slot.hidden = false;
  if (!turnstileConfig.turnstileSiteKey) {
    setFormMessage(
      form,
      "The security check is not available, so posting is paused.",
      true,
    );
    return;
  }
  turnstileScript ??= new Promise<void>((resolve, reject) => {
    if (window.turnstile) return resolve();
    const script = document.createElement("script");
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("The security check could not be loaded."));
    document.head.append(script);
  });
  try {
    await turnstileScript;
    if (slot.dataset.widgetMounted) return;
    window.turnstile!.render(slot, {
      sitekey: turnstileConfig.turnstileSiteKey,
      action,
      theme:
        document.documentElement.dataset.theme === "dark" ? "dark" : "light",
      callback: () => setFormMessage(form, "Security check complete."),
      "expired-callback": () =>
        setFormMessage(
          form,
          "Security check expired. Please complete it again.",
          true,
        ),
      "error-callback": () =>
        setFormMessage(form, "Security check failed. Please retry.", true),
    });
    slot.dataset.widgetMounted = "true";
  } catch (error) {
    setFormMessage(
      form,
      error instanceof Error ? error.message : "Security check unavailable.",
      true,
    );
  }
}

function challengeToken(form: HTMLFormElement) {
  return (
    form.querySelector<HTMLInputElement>('[name="cf-turnstile-response"]')
      ?.value ?? ""
  );
}

function addReportForm(
  parent: HTMLElement,
  targetType: "comment" | "thread" | "reply",
  targetId: string,
) {
  if (parent.querySelector("[data-report-form]")) return;
  const form = document.createElement("form");
  form.className = "community-form";
  form.dataset.reportForm = "true";
  const label = textElement("label", "", "Report content");
  const reason = document.createElement("select");
  reason.setAttribute("aria-label", "Report reason");
  for (const [value, name] of [
    ["spam", "Spam"],
    ["harassment", "Harassment"],
    ["unsafe", "Unsafe content"],
    ["off_topic", "Off topic"],
    ["other", "Other"],
  ]) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = name;
    reason.append(option);
  }
  const details = document.createElement("textarea");
  details.maxLength = 1000;
  details.rows = 3;
  details.setAttribute("aria-label", "Optional details");
  details.placeholder = "Optional details for the moderator";
  const message = textElement("p", "form-message", "");
  message.dataset.formMessage = "";
  message.setAttribute("role", "status");
  const submit = textElement("button", "pill pill-glass", "Send report");
  submit.setAttribute("type", "submit");
  form.append(label, reason, details, message, submit);
  parent.append(form);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    submit.setAttribute("disabled", "true");
    try {
      await api(
        "/api/community/reports",
        { targetType, targetId, reason: reason.value, details: details.value },
        "POST",
      );
      message.textContent = "Report sent for moderator review.";
      form.dataset.submitted = "true";
    } catch (error) {
      message.textContent =
        error instanceof Error ? error.message : "Could not send report.";
      message.dataset.error = "true";
      submit.removeAttribute("disabled");
    }
  });
}

function makeContentItem(
  item: CommunityItem,
  targetType: "comment" | "reply",
  onReply?: (id: string) => void,
) {
  const card = textElement("article", "community-item", "");
  card.dataset.deleted = String(Boolean(item.deleted));
  const header = textElement("div", "community-item-header", "");
  const author = item.author?.username
    ? textElement("a", "", item.author.displayName)
    : textElement("span", "", item.author?.displayName ?? "Community member");
  if (author instanceof HTMLAnchorElement && item.author?.username)
    author.href = `/u/${encodeURIComponent(item.author.username)}/`;
  const date = document.createElement("time");
  date.dateTime = item.createdAt;
  date.textContent = `${dateLabel(item.createdAt)}${item.editedAt ? " · edited" : ""}`;
  header.append(author, date);
  const body = textElement(
    "p",
    "community-item-body",
    item.deleted ? "This content was removed." : item.body,
  );
  card.append(header, body);
  if (!item.deleted) {
    const actions = textElement("div", "community-item-actions", "");
    if (!item.parentId) {
      const replyButton = textElement("button", "", "Reply");
      replyButton.setAttribute("type", "button");
      replyButton.addEventListener("click", () => onReply?.(item.id));
      actions.append(replyButton);
    }
    const like = textElement("button", "", `Like · ${item.likeCount ?? 0}`);
    like.setAttribute("type", "button");
    like.addEventListener("click", async () => {
      if (!currentProfile)
        return location.assign(
          `/login/?returnTo=${encodeURIComponent(location.pathname + "#comments")}`,
        );
      try {
        const result = await api(
          "/api/community/reactions",
          { targetType, targetId: item.id },
          "PUT",
        );
        like.textContent = `Liked · ${String(result.count ?? 0)}`;
      } catch (error) {
        setStatus(
          document,
          error instanceof Error
            ? error.message
            : "Could not like this content.",
          true,
        );
      }
    });
    actions.append(like);
    if (currentProfile && item.author?.id === currentProfile.id) {
      const edit = textElement("button", "", "Edit");
      edit.type = "button";
      edit.addEventListener("click", async () => {
        const next = await actionDialog({
          title: `Edit ${targetType}`,
          description:
            "Update your contribution. Other members will see the edited version.",
          action: "Save changes",
          value: item.body,
          maxLength: targetType === "comment" ? 3000 : 6000,
        });
        if (next === null || next === item.body) return;
        try {
          await api(
            `/api/community/${targetType === "comment" ? "comments" : "discussions/replies"}/${item.id}`,
            { body: next },
            "PATCH",
          );
          location.reload();
        } catch (error) {
          setStatus(
            document,
            error instanceof Error ? error.message : "Could not edit content.",
            true,
          );
        }
      });
      const remove = textElement("button", "", "Delete");
      remove.type = "button";
      remove.addEventListener("click", async () => {
        if (
          !(await actionDialog({
            title: "Delete this contribution?",
            description: "It will be replaced with a removed marker.",
            action: "Delete contribution",
          }))
        )
          return;
        try {
          await api(
            `/api/community/${targetType === "comment" ? "comments" : "discussions/replies"}/${item.id}`,
            undefined,
            "DELETE",
          );
          location.reload();
        } catch (error) {
          setStatus(
            document,
            error instanceof Error
              ? error.message
              : "Could not delete content.",
            true,
          );
        }
      });
      actions.append(edit, remove);
    } else if (currentProfile) {
      const report = textElement("button", "", "Report");
      report.type = "button";
      report.addEventListener("click", () =>
        addReportForm(card, targetType, item.id),
      );
      actions.append(report);
    }
    const showReplies = textElement("button", "", "Show replies");
    showReplies.type = "button";
    const nested = textElement("div", "community-nested", "");
    nested.hidden = true;
    let loaded = false;
    showReplies.addEventListener("click", async () => {
      nested.hidden = !nested.hidden;
      showReplies.textContent = nested.hidden ? "Show replies" : "Hide replies";
      if (loaded || nested.hidden) return;
      try {
        const path =
          targetType === "comment"
            ? `/api/community/comments?postSlug=${encodeURIComponent(item.postSlug ?? "")}&parentId=${encodeURIComponent(item.id)}`
            : `/api/community/discussions/threads/${encodeURIComponent(document.querySelector<HTMLElement>("[data-discussion-thread]")?.dataset.slug ?? "")}/replies?parentId=${encodeURIComponent(item.id)}`;
        const result = await api(path);
        for (const reply of result.items ?? [])
          nested.append(makeContentItem(reply, targetType));
        loaded = true;
        if (!nested.childElementCount)
          nested.append(
            textElement("p", "community-status", "No replies yet."),
          );
      } catch (error) {
        nested.append(
          textElement(
            "p",
            "community-status",
            error instanceof Error ? error.message : "Replies are unavailable.",
          ),
        );
      }
    });
    actions.append(showReplies);
    card.append(actions, nested);
  }
  return card;
}

async function setupArticleComments(root: HTMLElement) {
  const list = root.querySelector<HTMLElement>("[data-comment-list]");
  const form = root.querySelector<HTMLFormElement>("[data-comment-form]");
  const prompt = root.querySelector<HTMLElement>("[data-community-prompt]");
  const slug = root.dataset.postSlug ?? "";
  const more = root.querySelector<HTMLButtonElement>("[data-comments-more]");
  let cursor: string | null = null;
  if (!list || !form) return;
  const profile = await loadCommunityContext();
  if (profile) {
    if (prompt) prompt.hidden = true;
    form.hidden = false;
    void mountTurnstile(form, "comment");
  }
  const cancel = form.querySelector<HTMLButtonElement>("[data-cancel-reply]");
  const parentInput = form.elements.namedItem("parentId");
  const label = form.querySelector("label");
  const reload = async (replace = true) => {
    const query = new URLSearchParams({ postSlug: slug, limit: "20" });
    if (!replace && cursor) query.set("cursor", cursor);
    try {
      const result = await api(`/api/community/comments?${query}`);
      if (replace) list.replaceChildren();
      for (const item of result.items ?? []) {
        item.postSlug = slug;
        list.append(
          makeContentItem(item, "comment", (id) => {
            if (parentInput instanceof HTMLInputElement) parentInput.value = id;
            if (label) label.textContent = "Reply to comment";
            if (cancel) cancel.hidden = false;
            form.scrollIntoView({ behavior: "smooth", block: "center" });
            form.querySelector<HTMLTextAreaElement>("textarea")?.focus();
          }),
        );
      }
      cursor = result.nextCursor ? String(result.nextCursor) : null;
      if (more) more.hidden = !result.hasMore;
      setStatus(
        root,
        result.items?.length ? "" : "No comments yet. Start the conversation.",
      );
    } catch (error) {
      setStatus(
        root,
        error instanceof Error
          ? `${error.message} The article remains available above.`
          : "Comments are unavailable. The article remains available above.",
        true,
      );
    }
  };
  cancel?.addEventListener("click", () => {
    if (parentInput instanceof HTMLInputElement) parentInput.value = "";
    if (label) label.textContent = "Add a comment";
    cancel.hidden = true;
  });
  more?.addEventListener("click", () => void reload(false));
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = form.querySelector<HTMLButtonElement>(
      'button[type="submit"]',
    );
    if (submit) submit.disabled = true;
    const body =
      form.querySelector<HTMLTextAreaElement>("textarea")?.value ?? "";
    const parentId =
      parentInput instanceof HTMLInputElement ? parentInput.value : "";
    try {
      await api(
        "/api/community/comments",
        {
          postSlug: slug,
          body,
          parentId: parentId || null,
          turnstileToken: challengeToken(form),
        },
        "POST",
      );
      form.reset();
      if (parentInput instanceof HTMLInputElement) parentInput.value = "";
      if (cancel) cancel.hidden = true;
      if (label) label.textContent = "Add a comment";
      window.turnstile?.reset();
      cursor = null;
      await reload(true);
      setFormMessage(form, "Your comment has been posted.");
    } catch (error) {
      setFormMessage(
        form,
        error instanceof Error ? error.message : "Could not post the comment.",
        true,
      );
      window.turnstile?.reset();
    } finally {
      if (submit) submit.disabled = false;
    }
  });
  await reload(true);
}

async function setupDiscussionIndex(root: HTMLElement) {
  const list = root.querySelector<HTMLElement>("[data-discussion-list]");
  const filter = root.querySelector<HTMLSelectElement>(
    "[data-category-filter]",
  );
  const categoryInput =
    root.querySelector<HTMLSelectElement>('[name="category"]');
  const form = root.querySelector<HTMLFormElement>("[data-thread-form]");
  const startLink = root.querySelector<HTMLAnchorElement>(
    "[data-start-discussion]",
  );
  const prompt = root.querySelector<HTMLElement>("[data-community-prompt]");
  const pagination = root.querySelector<HTMLElement>(
    "[data-discussion-pagination]",
  );
  const pageLabel = pagination?.querySelector<HTMLElement>("[data-page-label]");
  let page = 1;
  let maxPage = 1;
  let renderVersion = 0;
  if (!list || !filter || !categoryInput || !form) return;
  const profile = await loadCommunityContext();
  try {
    const result = await api("/api/community/categories");
    filter.replaceChildren(new Option("All categories", ""));
    categoryInput.replaceChildren();
    for (const category of result.items ?? []) {
      if (!category.slug) continue;
      const option = document.createElement("option");
      option.value = category.slug;
      option.textContent = category.name ?? "Category";
      filter.append(option);
      const createOption = option.cloneNode(true) as HTMLOptionElement;
      categoryInput.append(createOption);
    }
  } catch (error) {
    setStatus(
      root,
      error instanceof Error ? error.message : "Categories are unavailable.",
      true,
    );
  }
  if (profile) {
    if (prompt) prompt.hidden = true;
    if (startLink) startLink.textContent = "Write a discussion";
    startLink?.addEventListener("click", (event) => {
      event.preventDefault();
      form.hidden = !form.hidden;
      if (!form.hidden) {
        form.scrollIntoView({ behavior: "smooth", block: "center" });
        form.querySelector<HTMLInputElement>("input")?.focus();
      }
    });
    void mountTurnstile(form, "thread");
  }
  const render = async () => {
    const version = ++renderVersion;
    const query = new URLSearchParams({ page: String(page), limit: "20" });
    if (filter.value) query.set("category", filter.value);
    try {
      const result = await api(`/api/community/discussions/threads?${query}`);
      if (version !== renderVersion) return;
      list.replaceChildren();
      for (const item of result.items ?? []) {
        const link = document.createElement("a");
        link.className = "discussion-card";
        link.href = `/discussions/${encodeURIComponent(item.slug ?? "")}/`;
        if (item.pinned)
          link.append(textElement("span", "discussion-category", "Pinned"));
        link.append(
          textElement(
            "span",
            "discussion-category",
            item.categoryName ?? "Discussion",
          ),
        );
        link.append(textElement("h2", "", item.title ?? "Discussion"));
        link.append(textElement("p", "discussion-body", item.body));
        link.append(
          textElement(
            "span",
            "discussion-meta",
            `${item.author?.displayName ?? "Deleted member"} · ${dateLabel(item.createdAt)} · ${item.replyCount ?? 0} replies${item.locked ? " · Locked" : ""}`,
          ),
        );
        list.append(link);
      }
      maxPage = Math.max(1, Math.ceil(Number(result.total ?? 0) / 20));
      if (pagination) pagination.hidden = maxPage < 2;
      if (pageLabel) pageLabel.textContent = `Page ${page} of ${maxPage}`;
      const prev =
        pagination?.querySelector<HTMLButtonElement>("[data-page-prev]");
      const next =
        pagination?.querySelector<HTMLButtonElement>("[data-page-next]");
      if (prev) prev.disabled = page <= 1;
      if (next) next.disabled = page >= maxPage;
      setStatus(
        root,
        (result.items ?? []).length
          ? ""
          : "No discussions in this category yet. Start one when you’re ready.",
      );
    } catch (error) {
      if (version !== renderVersion) return;
      setStatus(
        root,
        error instanceof Error ? error.message : "Discussions are unavailable.",
        true,
      );
    }
  };
  filter.addEventListener("change", () => {
    page = 1;
    void render();
  });
  pagination
    ?.querySelector("[data-page-prev]")
    ?.addEventListener("click", () => {
      page = Math.max(1, page - 1);
      void render();
    });
  pagination
    ?.querySelector("[data-page-next]")
    ?.addEventListener("click", () => {
      page = Math.min(maxPage, page + 1);
      void render();
    });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = form.querySelector<HTMLButtonElement>(
      'button[type="submit"]',
    );
    if (submit) submit.disabled = true;
    const data = new FormData(form);
    try {
      const result = await api(
        "/api/community/discussions/threads",
        {
          title: String(data.get("title") ?? ""),
          category: String(data.get("category") ?? ""),
          body: String(data.get("body") ?? ""),
          turnstileToken: challengeToken(form),
        },
        "POST",
      );
      location.assign(
        `/discussions/${encodeURIComponent(result.item?.slug ?? "")}/`,
      );
    } catch (error) {
      setFormMessage(
        form,
        error instanceof Error ? error.message : "Could not create discussion.",
        true,
      );
      window.turnstile?.reset();
    } finally {
      if (submit) submit.disabled = false;
    }
  });
  await render();
}

async function setupDiscussionThread(root: HTMLElement) {
  const slug = root.dataset.slug ?? "";
  const threadId = root.dataset.threadId ?? "";
  const list = root.querySelector<HTMLElement>("[data-thread-replies]");
  const form = root.querySelector<HTMLFormElement>("[data-reply-form]");
  const prompt = root.querySelector<HTMLElement>("[data-community-prompt]");
  const more = root.querySelector<HTMLButtonElement>("[data-replies-more]");
  if (!list) return;
  const profile = await loadCommunityContext();
  if (form && profile) void mountTurnstile(form, "reply");
  if (form && !profile) form.hidden = true;
  if (prompt && profile) prompt.hidden = true;
  const membership = await api(
    `/api/community/discussions/threads/${encodeURIComponent(slug)}/membership`,
  ).catch(() => ({}) as Result);
  const threadActions = root.querySelector<HTMLElement>(
    "[data-thread-actions]",
  );
  const actionButtons =
    threadActions?.querySelectorAll<HTMLButtonElement>("button") ?? [];
  const [likeButton, bookmarkButton, subscribeButton, reportButton] =
    actionButtons;
  if (likeButton)
    likeButton.textContent = `${membership.liked ? "Liked" : "Like"} · ${String(membership.likeCount ?? 0)}`;
  if (bookmarkButton)
    bookmarkButton.textContent = membership.bookmarked ? "Saved" : "Save";
  if (subscribeButton)
    subscribeButton.textContent = membership.subscribed
      ? "Following replies"
      : "Follow replies";
  let cursor: string | null = null;
  const parentInput = form?.elements.namedItem("parentId");
  const replyLabel = form?.querySelector("label");
  const cancelReply = form?.querySelector<HTMLButtonElement>(
    "[data-cancel-reply]",
  );
  cancelReply?.addEventListener("click", () => {
    if (parentInput instanceof HTMLInputElement) parentInput.value = "";
    if (replyLabel) replyLabel.textContent = "Add a reply";
    cancelReply.hidden = true;
  });
  const renderReplies = async (replace = true) => {
    const query = new URLSearchParams({ limit: "30" });
    if (!replace && cursor) query.set("cursor", cursor);
    try {
      const result = await api(
        `/api/community/discussions/threads/${encodeURIComponent(slug)}/replies?${query}`,
      );
      if (replace) list.replaceChildren();
      for (const item of result.items ?? [])
        list.append(
          makeContentItem(item, "reply", (id) => {
            if (parentInput instanceof HTMLInputElement) parentInput.value = id;
            if (replyLabel)
              replyLabel.textContent = "Reply to discussion comment";
            if (cancelReply) cancelReply.hidden = false;
            form?.scrollIntoView({ behavior: "smooth", block: "center" });
            form?.querySelector<HTMLTextAreaElement>("textarea")?.focus();
          }),
        );
      cursor = result.nextCursor ? String(result.nextCursor) : null;
      if (more) more.hidden = !result.hasMore;
      if (replace && !(result.items ?? []).length)
        list.append(
          textElement(
            "p",
            "community-status",
            "No replies yet. Be the first to respond.",
          ),
        );
    } catch (error) {
      setStatus(
        root,
        error instanceof Error ? error.message : "Replies are unavailable.",
        true,
      );
    }
  };
  more?.addEventListener("click", () => void renderReplies(false));
  const changeMembership = async (
    button: HTMLButtonElement | undefined,
    key: "liked" | "bookmarked" | "subscribed",
    path: string,
  ) => {
    if (!button) return;
    button.addEventListener("click", async () => {
      if (!currentProfile)
        return location.assign(
          `/login/?returnTo=${encodeURIComponent(location.pathname)}`,
        );
      const active = Boolean(membership[key]);
      try {
        const result = await api(
          path,
          { threadId, targetType: "thread", targetId: threadId },
          active ? "DELETE" : "PUT",
        );
        membership[key] = !active;
        if (key === "liked") membership.likeCount = result.count;
        button.textContent =
          key === "liked"
            ? `${membership.liked ? "Liked" : "Like"} · ${String(membership.likeCount ?? 0)}`
            : key === "bookmarked"
              ? membership.bookmarked
                ? "Saved"
                : "Save"
              : membership.subscribed
                ? "Following replies"
                : "Follow replies";
      } catch (error) {
        setStatus(
          root,
          error instanceof Error
            ? error.message
            : "Could not update this discussion.",
          true,
        );
      }
    });
  };
  await changeMembership(likeButton, "liked", "/api/community/reactions");
  await changeMembership(
    bookmarkButton,
    "bookmarked",
    "/api/community/bookmarks",
  );
  await changeMembership(
    subscribeButton,
    "subscribed",
    "/api/community/subscriptions",
  );
  reportButton?.addEventListener("click", () => {
    if (!currentProfile)
      return location.assign(
        `/login/?returnTo=${encodeURIComponent(location.pathname)}`,
      );
    addReportForm(threadActions ?? root, "thread", threadId);
  });
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = form.querySelector<HTMLButtonElement>(
      'button[type="submit"]',
    );
    if (submit) submit.disabled = true;
    const body =
      form.querySelector<HTMLTextAreaElement>("textarea")?.value ?? "";
    try {
      await api(
        `/api/community/discussions/threads/${encodeURIComponent(threadId)}/replies`,
        {
          body,
          parentId:
            parentInput instanceof HTMLInputElement
              ? parentInput.value || null
              : null,
          turnstileToken: challengeToken(form),
        },
        "POST",
      );
      form.reset();
      window.turnstile?.reset();
      cursor = null;
      await renderReplies(true);
      setFormMessage(form, "Your reply has been posted.");
    } catch (error) {
      setFormMessage(
        form,
        error instanceof Error ? error.message : "Could not post your reply.",
        true,
      );
      window.turnstile?.reset();
    } finally {
      if (submit) submit.disabled = false;
    }
  });
  await renderReplies(true);
}

async function setupNotifications(root: HTMLElement) {
  const list = root.querySelector<HTMLElement>("[data-notification-list]");
  if (!list) return;
  await loadCommunityContext();
  try {
    const result = await api("/api/community/notifications");
    list.replaceChildren();
    for (const item of result.items ?? []) {
      const card = textElement("article", "notification-card", "");
      const title = document.createElement("a");
      title.href = safeHref(item.href);
      title.textContent = item.message ?? "Community update";
      card.append(
        title,
        textElement(
          "p",
          "discussion-meta",
          `${dateLabel(item.createdAt)}${item.readAt ? " · Read" : " · Unread"}`,
        ),
      );
      if (!item.readAt) {
        const mark = textElement("button", "community-more", "Mark as read");
        mark.type = "button";
        mark.addEventListener("click", async () => {
          await api(
            `/api/community/notifications/${encodeURIComponent(item.id)}`,
            {},
            "PATCH",
          );
          card.remove();
        });
        card.append(mark);
      }
      list.append(card);
    }
    if (!(result.items ?? []).length)
      list.append(
        textElement("p", "community-status", "You have no notifications."),
      );
    root
      .querySelector<HTMLButtonElement>("[data-read-all]")
      ?.addEventListener("click", async (event) => {
        const button = event.currentTarget as HTMLButtonElement;
        button.disabled = true;
        await api("/api/community/notifications/read-all", {}, "POST");
        button.hidden = true;
        await setupNotifications(root);
      });
    const readAll = root.querySelector<HTMLButtonElement>("[data-read-all]");
    if (readAll)
      readAll.hidden = !(result.items ?? []).some((item) => !item.readAt);
    setStatus(root, "");
  } catch (error) {
    if (error instanceof Error && /sign in|session/i.test(error.message)) {
      location.assign(
        `/login/?returnTo=${encodeURIComponent("/notifications/")}`,
      );
      return;
    }
    setStatus(
      root,
      error instanceof Error ? error.message : "Notifications are unavailable.",
      true,
    );
  }
}

for (const root of document.querySelectorAll<HTMLElement>("[data-comments]"))
  void setupArticleComments(root);
for (const root of document.querySelectorAll<HTMLElement>(
  "[data-discussion-index]",
))
  void setupDiscussionIndex(root);
for (const root of document.querySelectorAll<HTMLElement>(
  "[data-discussion-thread]",
))
  void setupDiscussionThread(root);
for (const root of document.querySelectorAll<HTMLElement>(
  "[data-notifications]",
))
  void setupNotifications(root);
