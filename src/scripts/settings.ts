export {};

type Json = Record<string, unknown> & { error?: string; message?: string };

async function request(
  path: string,
  body?: Record<string, unknown>,
  method = "GET",
): Promise<Json> {
  const response = await fetch(path, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = (await response.json().catch(() => ({}))) as Json;
  if (!response.ok)
    throw new Error(
      result.error ?? result.message ?? "The request could not be completed.",
    );
  return result;
}

function message(
  form: HTMLFormElement | HTMLElement | null,
  selector: string,
  text: string,
  error = false,
) {
  const target = form?.querySelector<HTMLElement>(selector);
  if (target) {
    target.textContent = text;
    target.dataset.error = String(error);
  }
}

const root = document.querySelector<HTMLElement>("[data-settings]");
if (root) {
  const status = root.querySelector<HTMLElement>("[data-settings-status]");
  try {
    const profile = await request("/api/community/profile");
    const fields: Record<string, string> = {
      email: String(profile.email ?? ""),
      displayName: String(profile.displayName ?? ""),
      username: String(profile.username ?? ""),
      bio: String(profile.bio ?? ""),
      website: String(profile.website ?? ""),
    };
    const form = root.querySelector<HTMLFormElement>("[data-profile-form]");
    if (form) {
      for (const [name, value] of Object.entries(fields)) {
        const input = form.elements.namedItem(name);
        if (
          input instanceof HTMLInputElement ||
          input instanceof HTMLTextAreaElement
        )
          input.value = value;
      }
      const profileLink = root.querySelector<HTMLAnchorElement>(
        "[data-profile-link]",
      );
      if (profileLink)
        profileLink.href = `/u/${encodeURIComponent(fields.username)}/`;
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const data = new FormData(form);
        try {
          const result = await request(
            "/api/community/profile",
            {
              displayName: String(data.get("displayName") ?? ""),
              username: String(data.get("username") ?? ""),
              bio: String(data.get("bio") ?? ""),
              website: String(data.get("website") ?? ""),
            },
            "PATCH",
          );
          const item = result.item as Record<string, unknown>;
          const link = root.querySelector<HTMLAnchorElement>(
            "[data-profile-link]",
          );
          if (link && item.username)
            link.href = `/u/${encodeURIComponent(String(item.username))}/`;
          message(form, "[data-profile-message]", "Profile saved.");
        } catch (error) {
          message(
            form,
            "[data-profile-message]",
            error instanceof Error ? error.message : "Could not save profile.",
            true,
          );
        }
      });
    }
    if (status)
      status.textContent = `Signed in as ${fields.email}. Trust level: ${String(profile.trustLevel ?? "new")}.`;
    if (profile.role === "moderator" || profile.role === "admin") {
      const moderationLink = root.querySelector<HTMLElement>(
        "[data-moderation-link]",
      );
      if (moderationLink) moderationLink.hidden = false;
    }

    const sessionsStatus = root.querySelector<HTMLElement>(
      "[data-sessions-status]",
    );
    const sessionList = root.querySelector<HTMLUListElement>(
      "[data-session-list]",
    );
    const revokeOtherSessions = root.querySelector<HTMLButtonElement>(
      "[data-revoke-other-sessions]",
    );
    const loadSessions = async () => {
      if (!sessionList || !sessionsStatus) return;
      try {
        const result = await request("/api/community/sessions");
        const sessions = Array.isArray(result.items)
          ? (result.items as Record<string, unknown>[])
          : [];
        sessionList.replaceChildren();
        const otherSessions = sessions.filter((item) => item.current !== true);
        if (revokeOtherSessions)
          revokeOtherSessions.hidden = otherSessions.length === 0;
        sessionsStatus.textContent = otherSessions.length
          ? `${otherSessions.length} other active session${otherSessions.length === 1 ? "" : "s"}.`
          : "No other active sessions.";
        for (const item of sessions) {
          const listItem = document.createElement("li");
          const details = document.createElement("span");
          const created = new Date(String(item.createdAt ?? ""));
          const createdText = Number.isNaN(created.valueOf())
            ? "Date unavailable"
            : created.toLocaleString();
          details.textContent = `${item.current === true ? "This device" : "Other device"} · ${createdText}${item.userAgent ? ` · ${String(item.userAgent)}` : ""}`;
          listItem.append(details);
          if (item.current !== true && typeof item.id === "string") {
            const revoke = document.createElement("button");
            revoke.type = "button";
            revoke.className = "text-button";
            revoke.textContent = "Sign out";
            revoke.addEventListener("click", async () => {
              revoke.disabled = true;
              try {
                await request(
                  `/api/community/sessions/${encodeURIComponent(item.id as string)}`,
                  undefined,
                  "DELETE",
                );
                await loadSessions();
              } catch (error) {
                sessionsStatus.textContent =
                  error instanceof Error
                    ? error.message
                    : "Could not sign out that session.";
                sessionsStatus.dataset.error = "true";
                revoke.disabled = false;
              }
            });
            listItem.append(revoke);
          }
          sessionList.append(listItem);
        }
      } catch (error) {
        sessionsStatus.textContent =
          error instanceof Error
            ? error.message
            : "Could not load sign-in sessions.";
        sessionsStatus.dataset.error = "true";
      }
    };
    await loadSessions();
    revokeOtherSessions?.addEventListener("click", async () => {
      revokeOtherSessions.disabled = true;
      try {
        await request("/api/community/sessions/revoke-other", {}, "POST");
        await loadSessions();
      } catch (error) {
        if (sessionsStatus) {
          sessionsStatus.textContent =
            error instanceof Error
              ? error.message
              : "Could not sign out other sessions.";
          sessionsStatus.dataset.error = "true";
        }
      } finally {
        revokeOtherSessions.disabled = false;
      }
    });

    const security = await request("/api/community/account/security");
    const hasPassword = security.hasPassword === true;
    const passwordlessNotice = root.querySelector<HTMLElement>(
      "[data-passwordless-notice]",
    );
    if (passwordlessNotice) passwordlessNotice.hidden = hasPassword;
    const deletePassword =
      root.querySelector<HTMLInputElement>("#delete-password");
    if (deletePassword) {
      deletePassword.required = hasPassword;
      deletePassword.hidden = !hasPassword;
    }
    const deleteLabel = root.querySelector<HTMLElement>(
      "[data-delete-password-label]",
    );
    if (deleteLabel) deleteLabel.hidden = !hasPassword;
    const googleDeleteNotice = root.querySelector<HTMLElement>(
      "[data-google-delete-notice]",
    );
    if (googleDeleteNotice) googleDeleteNotice.hidden = hasPassword;
    const passwordForm = root.querySelector<HTMLFormElement>(
      "[data-password-form]",
    );
    if (passwordForm) passwordForm.hidden = !hasPassword;
    passwordForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(passwordForm);
      try {
        await request(
          "/api/auth/change-password",
          {
            currentPassword: String(data.get("currentPassword") ?? ""),
            newPassword: String(data.get("newPassword") ?? ""),
            revokeOtherSessions: true,
          },
          "POST",
        );
        passwordForm.reset();
        message(
          passwordForm,
          "[data-password-message]",
          "Password changed. Other sessions have been signed out.",
        );
      } catch (error) {
        message(
          passwordForm,
          "[data-password-message]",
          error instanceof Error ? error.message : "Could not change password.",
          true,
        );
      }
    });

    const preferencesForm = root.querySelector<HTMLFormElement>(
      "[data-preferences-form]",
    );
    if (preferencesForm) {
      const config = await request("/api/community/config");
      const emailAvailable = config.emailNotificationsAvailable === true;
      for (const name of ["emailReplies", "emailModeration"]) {
        const input = preferencesForm.elements.namedItem(name);
        if (input instanceof HTMLInputElement) input.disabled = !emailAvailable;
      }
      const emailNotice = preferencesForm.querySelector<HTMLElement>(
        "[data-email-notice]",
      );
      if (emailNotice && !emailAvailable)
        emailNotice.textContent =
          "Email replies are not configured yet. You can still receive in-app notifications.";
      const preferences = await request("/api/community/preferences");
      for (const name of [
        "inAppReplies",
        "emailReplies",
        "moderationUpdates",
        "emailModeration",
      ]) {
        const input = preferencesForm.elements.namedItem(name);
        if (input instanceof HTMLInputElement)
          input.checked = Boolean(preferences[name]);
      }
      preferencesForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const values: Record<string, boolean> = {};
        for (const name of [
          "inAppReplies",
          "emailReplies",
          "moderationUpdates",
          "emailModeration",
        ]) {
          const input = preferencesForm.elements.namedItem(name);
          if (input instanceof HTMLInputElement) values[name] = input.checked;
        }
        try {
          await request("/api/community/preferences", values, "PATCH");
          message(
            preferencesForm,
            "[data-preferences-message]",
            "Notification preferences saved.",
          );
        } catch (error) {
          message(
            preferencesForm,
            "[data-preferences-message]",
            error instanceof Error
              ? error.message
              : "Could not save preferences.",
            true,
          );
        }
      });
    }

    root
      .querySelector<HTMLButtonElement>("[data-logout]")
      ?.addEventListener("click", async (event) => {
        const button = event.currentTarget as HTMLButtonElement;
        button.disabled = true;
        try {
          await request("/api/auth/sign-out", {}, "POST");
          location.assign("/");
        } catch (error) {
          button.disabled = false;
          if (status)
            status.textContent =
              error instanceof Error
                ? error.message
                : "Sign out failed. Please retry.";
        }
      });

    const deleteForm =
      root.querySelector<HTMLFormElement>("[data-delete-form]");
    deleteForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (
        !window.confirm(
          "Permanently delete your account and community posts? This cannot be undone.",
        )
      )
        return;
      const data = new FormData(deleteForm);
      const button = deleteForm.querySelector<HTMLButtonElement>(
        'button[type="submit"]',
      );
      if (button) button.disabled = true;
      try {
        await request(
          "/api/community/account/delete",
          { password: String(data.get("password") ?? "") },
          "POST",
        );
        location.assign("/");
      } catch (error) {
        message(
          deleteForm,
          "[data-delete-message]",
          error instanceof Error
            ? error.message
            : "Could not delete the account.",
          true,
        );
        if (button) button.disabled = false;
      }
    });
  } catch (error) {
    const statusCode =
      error instanceof Error
        ? error.message
        : "Your account could not be loaded.";
    if (statusCode.includes("Verify your email")) {
      location.assign("/verify-email/");
    } else if (
      statusCode.includes("Sign in") ||
      statusCode.toLowerCase().includes("session")
    ) {
      location.assign(`/login/?returnTo=${encodeURIComponent("/settings/")}`);
    } else if (status) {
      status.textContent = statusCode;
      status.dataset.error = "true";
    }
  }
}
