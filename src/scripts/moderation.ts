import { requestJson } from "../lib/client-api";
export {};

type JsonResult = Record<string, unknown> & { error?: string; items?: any[] };

const api = (path: string, data?: Record<string, unknown>, method = "GET") =>
  requestJson<JsonResult>(path, data, method);

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text: string,
) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = text;
  return node;
}

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? ""
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function reportReason(card: HTMLElement) {
  const field = card.querySelector<HTMLTextAreaElement>(
    "textarea[data-reason]",
  );
  const value = field?.value.trim() ?? "";
  if (value.length < 5)
    throw new Error("Add a moderation reason of at least five characters.");
  return value;
}

const moderation = document.querySelector<HTMLElement>("[data-moderation]");
if (moderation) {
  try {
    const stats = await api("/api/community/moderation");
    const statsBox = moderation.querySelector<HTMLElement>(
      "[data-moderation-stats]",
    );
    if (statsBox)
      statsBox.textContent = `${String(stats.openReports)} open reports · ${String(stats.activeUsers)} active members · ${String(stats.activeThreads)} discussions`;
    const reports = await api("/api/community/moderation/reports");
    const list = moderation.querySelector<HTMLElement>("[data-report-list]");
    if (list) {
      list.replaceChildren();
      for (const report of reports.items ?? []) {
        const card = element("article", "report-card", "");
        const target = report.target as {
          content: string;
          href: string;
          authorId: string;
          status: string;
        } | null;
        card.append(
          element(
            "h2",
            "",
            `${String(report.reason)} · ${String(report.targetType)} · ${dateLabel(report.createdAt)}`,
          ),
        );
        card.append(
          element(
            "p",
            "report-meta",
            `Reported by ${report.reporterName ?? "Deleted member"}${report.reporterUsername ? ` (@${report.reporterUsername})` : ""} · ${String(report.status)}`,
          ),
        );
        if (report.details)
          card.append(element("p", "discussion-body", String(report.details)));
        if (target) {
          const link = element("a", "", "Open reported content");
          link.setAttribute(
            "href",
            target.href.startsWith("/") && !target.href.startsWith("//")
              ? target.href
              : "/discussions/",
          );
          link.setAttribute("target", "_blank");
          link.setAttribute("rel", "noopener noreferrer");
          card.append(link);
          card.append(element("p", "discussion-body", target.content));
          card.append(
            element("p", "report-meta", `Content status: ${target.status}`),
          );
        } else
          card.append(
            element(
              "p",
              "report-meta",
              "Reported content has already been removed.",
            ),
          );
        if (report.status === "open") {
          const reason = document.createElement("textarea");
          reason.dataset.reason = "true";
          reason.rows = 2;
          reason.maxLength = 1000;
          reason.placeholder = "Document the moderation decision (required)";
          reason.setAttribute("aria-label", "Moderation decision reason");
          card.append(reason);
          const message = element("p", "form-message", "");
          message.setAttribute("role", "status");
          card.append(message);
          const actions = element("div", "moderation-actions", "");
          const decide = async (
            status: "resolved" | "dismissed",
            hide: boolean,
          ) => {
            const buttons =
              actions.querySelectorAll<HTMLButtonElement>("button");
            buttons.forEach((button) => {
              button.disabled = true;
            });
            try {
              const reasonText = reportReason(card);
              if (hide && target) {
                await api(
                  "/api/community/moderation/content",
                  {
                    targetType: report.targetType,
                    targetId: report.targetId,
                    action: "hide",
                    reason: reasonText,
                  },
                  "POST",
                );
              }
              await api(
                `/api/community/moderation/reports/${encodeURIComponent(report.id)}`,
                { status, reason: reasonText },
                "PATCH",
              );
              card.remove();
            } catch (error) {
              message.textContent =
                error instanceof Error
                  ? error.message
                  : "Could not apply the decision.";
              message.dataset.error = "true";
              buttons.forEach((button) => {
                button.disabled = false;
              });
            }
          };
          for (const [label, status, hide] of [
            ["Hide and resolve", "resolved", true],
            ["Resolve", "resolved", false],
            ["Dismiss", "dismissed", false],
          ] as const) {
            const button = element("button", "", label);
            button.type = "button";
            button.addEventListener("click", () => void decide(status, hide));
            actions.append(button);
          }
          card.append(actions);
        }
        list.append(card);
      }
      if (!(reports.items ?? []).length)
        list.append(element("p", "community-status", "No reports to review."));
    }
    const actionsResult = await api("/api/community/moderation/actions");
    const log = moderation.querySelector<HTMLElement>("[data-moderation-log]");
    if (log) {
      log.replaceChildren();
      for (const action of actionsResult.items ?? []) {
        log.append(
          element(
            "article",
            "notification-card",
            `${action.actorName ?? "Moderator"} · ${action.action} · ${action.targetType} ${action.targetId} · ${dateLabel(action.createdAt)}\nReason: ${action.reason}`,
          ),
        );
      }
      if (!(actionsResult.items ?? []).length)
        log.append(
          element("p", "community-status", "No moderation actions recorded."),
        );
    }
    const searchForm =
      moderation.querySelector<HTMLFormElement>("[data-user-search]");
    const usersBox = moderation.querySelector<HTMLElement>(
      "[data-user-results]",
    );
    searchForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const query = String(new FormData(searchForm).get("q") ?? "").trim();
      if (!usersBox) return;
      usersBox.replaceChildren();
      try {
        const result = await api(
          `/api/community/moderation/users?q=${encodeURIComponent(query)}`,
        );
        for (const user of result.items ?? []) {
          const card = element("article", "report-card", "");
          card.append(
            element("h2", "", `${user.displayName} (@${user.username})`),
          );
          card.append(
            element(
              "p",
              "report-meta",
              `${user.status} · joined ${dateLabel(user.createdAt)}`,
            ),
          );
          const reason = document.createElement("textarea");
          reason.rows = 2;
          reason.maxLength = 1000;
          reason.placeholder = "Reason required for account status changes";
          reason.setAttribute("aria-label", "Account action reason");
          card.append(reason);
          const message = element("p", "form-message", "");
          const row = element("div", "moderation-actions", "");
          for (const [label, status] of [
            ["Suspend", "suspended"],
            ["Ban", "banned"],
            ["Restore", "active"],
          ] as const) {
            const button = element("button", "", label);
            button.type = "button";
            button.disabled = status === user.status;
            button.addEventListener("click", async () => {
              if (reason.value.trim().length < 5) {
                message.textContent =
                  "Add a reason of at least five characters.";
                message.dataset.error = "true";
                return;
              }
              button.disabled = true;
              try {
                await api(
                  `/api/community/moderation/users/${encodeURIComponent(user.userId)}`,
                  { status, reason: reason.value.trim() },
                  "PATCH",
                );
                card.remove();
              } catch (error) {
                message.textContent =
                  error instanceof Error
                    ? error.message
                    : "Could not update account status.";
                message.dataset.error = "true";
                button.disabled = false;
              }
            });
            row.append(button);
          }
          card.append(message, row);
          usersBox.append(card);
        }
        if (!(result.items ?? []).length)
          usersBox.append(
            element("p", "community-status", "No matching members."),
          );
      } catch (error) {
        usersBox.append(
          element(
            "p",
            "community-status",
            error instanceof Error ? error.message : "Member search failed.",
          ),
        );
      }
    });
  } catch (error) {
    const status = moderation.querySelector<HTMLElement>(
      "[data-community-status]",
    );
    if (status) {
      status.textContent =
        error instanceof Error
          ? error.message
          : "Moderator access is unavailable.";
      status.dataset.error = "true";
    }
    for (const section of moderation.querySelectorAll<HTMLElement>(
      ".settings-section, [data-moderation-stats]",
    ))
      section.hidden = true;
  }
}

const admin = document.querySelector<HTMLElement>("[data-admin]");
if (admin) {
  try {
    const stats = await api("/api/community/admin/stats");
    const target = admin.querySelector<HTMLElement>("[data-admin-stats]");
    if (target)
      target.textContent = `${String(stats.users)} active members · ${String(stats.discussions)} discussions · ${String(stats.openReports)} open reports`;
    const status = admin.querySelector<HTMLElement>("[data-community-status]");
    if (status) status.textContent = "Administrator access confirmed.";
  } catch (error) {
    const status = admin.querySelector<HTMLElement>("[data-community-status]");
    if (status) {
      status.textContent =
        error instanceof Error
          ? error.message
          : "Administrator access is unavailable.";
      status.dataset.error = "true";
    }
  }
}
