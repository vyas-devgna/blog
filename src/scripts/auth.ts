export {};

type ApiResult = Record<string, unknown> & { error?: string; message?: string };

async function api(
  path: string,
  data?: Record<string, unknown>,
  method = "POST",
): Promise<ApiResult> {
  const response = await fetch(path, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: data ? { "content-type": "application/json" } : undefined,
    body: data ? JSON.stringify(data) : undefined,
  });
  const result = (await response.json().catch(() => ({}))) as ApiResult;
  if (!response.ok)
    throw new Error(
      result.error ?? result.message ?? "The request could not be completed.",
    );
  return result;
}

function setMessage(form: HTMLFormElement, message: string, error = false) {
  const target = form.querySelector<HTMLElement>("[data-form-message]");
  if (!target) return;
  target.textContent = message;
  target.dataset.error = String(error);
}

function redirectTarget() {
  const candidate = new URLSearchParams(location.search).get("returnTo");
  return candidate?.startsWith("/") &&
    !candidate.startsWith("//") &&
    !candidate.includes("\\")
    ? candidate
    : "/settings/";
}

declare global {
  interface Window {
    turnstile?: {
      render(element: HTMLElement, options: Record<string, unknown>): string;
      reset(widgetId?: string): void;
    };
  }
}

async function mountChallenge(form: HTMLFormElement) {
  const response = await fetch("/api/community/config", { cache: "no-store" });
  const config = (await response.json()) as {
    turnstileSiteKey?: string | null;
    signupEnabled?: boolean;
  };
  const slot = form.querySelector<HTMLElement>("[data-signup-challenge]");
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (!slot || !submit || !config.turnstileSiteKey || !config.signupEnabled) {
    setMessage(
      form,
      "Account creation is temporarily unavailable while the security check is configured.",
      true,
    );
    return;
  }
  await new Promise<void>((resolve, reject) => {
    if (window.turnstile) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("The security check could not be loaded.")),
        { once: true },
      );
      return;
    }
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
  window.turnstile!.render(slot, {
    sitekey: config.turnstileSiteKey,
    action: "signup",
    theme: document.documentElement.dataset.theme === "dark" ? "dark" : "light",
    callback: () => {
      submit.disabled = false;
    },
    "expired-callback": () => {
      submit.disabled = true;
      setMessage(
        form,
        "The security check expired. Please complete it again.",
        true,
      );
    },
    "error-callback": () => {
      submit.disabled = true;
      setMessage(
        form,
        "The security check could not be completed. Please retry.",
        true,
      );
    },
  });
}

for (const form of document.querySelectorAll<HTMLFormElement>(
  "[data-auth-form]",
)) {
  const mode = form.dataset.authMode;
  if (mode === "signup") {
    void mountChallenge(form).catch((error: unknown) =>
      setMessage(
        form,
        error instanceof Error ? error.message : "Security check unavailable.",
        true,
      ),
    );
  }
  const emailInput = form.elements.namedItem("email");
  if (emailInput instanceof HTMLInputElement && mode === "verify") {
    emailInput.value = new URLSearchParams(location.search).get("email") ?? "";
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = form.querySelector<HTMLButtonElement>(
      'button[type="submit"]',
    );
    if (submit) submit.disabled = true;
    setMessage(form, "Working…");
    const values = new FormData(form);
    const email = String(values.get("email") ?? "").trim();
    try {
      if (mode === "login") {
        await api("/api/auth/sign-in/email", {
          email,
          password: String(values.get("password") ?? ""),
        });
        location.assign(redirectTarget());
      } else if (mode === "signup") {
        const token = String(values.get("cf-turnstile-response") ?? "");
        await api("/api/auth/sign-up/email", {
          name: String(values.get("name") ?? "").trim(),
          email,
          password: String(values.get("password") ?? ""),
          turnstileToken: token,
        });
        location.assign(`/verify-email/?email=${encodeURIComponent(email)}`);
      } else if (mode === "verify") {
        await api("/api/auth/email-otp/verify-email", {
          email,
          otp: String(values.get("otp") ?? "").trim(),
        });
        location.assign(redirectTarget());
      } else if (mode === "forgot") {
        const fields = form.querySelector<HTMLElement>("[data-reset-fields]");
        if (fields?.hidden) {
          await api("/api/auth/forget-password/email-otp", { email });
          fields.hidden = false;
          const button = form.querySelector<HTMLButtonElement>(
            "[data-reset-submit]",
          );
          if (button) button.textContent = "Set new password";
          setMessage(
            form,
            "If that address is registered, a reset code is on its way.",
          );
        } else {
          await api("/api/auth/email-otp/reset-password", {
            email,
            otp: String(values.get("otp") ?? "").trim(),
            password: String(values.get("password") ?? ""),
          });
          setMessage(form, "Password updated. You can now sign in.");
          form.reset();
        }
      }
    } catch (error) {
      setMessage(
        form,
        error instanceof Error
          ? error.message
          : "The request could not be completed.",
        true,
      );
      if (mode === "signup") window.turnstile?.reset();
    } finally {
      if (
        submit &&
        !(
          mode === "signup" &&
          !form.querySelector<HTMLInputElement>(
            '[name="cf-turnstile-response"]',
          )?.value
        )
      ) {
        submit.disabled = false;
      }
    }
  });

  form
    .querySelector<HTMLButtonElement>("[data-resend-code]")
    ?.addEventListener("click", async () => {
      const email =
        emailInput instanceof HTMLInputElement ? emailInput.value.trim() : "";
      if (!email)
        return setMessage(form, "Enter your email address first.", true);
      try {
        await api("/api/auth/email-otp/send-verification-otp", {
          email,
          type: "email-verification",
        });
        setMessage(
          form,
          "If that address needs verification, a new code is on its way.",
        );
      } catch (error) {
        setMessage(
          form,
          error instanceof Error ? error.message : "Could not resend the code.",
          true,
        );
      }
    });
}
