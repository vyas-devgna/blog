export function safeReturnTo(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\u0000-\u0020\u007f\\]/.test(value)
  )
    return "/settings/";
  try {
    const target = new URL(value, "https://same-origin.invalid");
    return target.origin === "https://same-origin.invalid"
      ? `${target.pathname}${target.search}${target.hash}`
      : "/settings/";
  } catch {
    return "/settings/";
  }
}

export function googleErrorMessage(code: string | null): string {
  if (code === "access_denied" || code === "google_cancelled")
    return "Google sign-in was cancelled. You can try again or use email.";
  if (code === "account_not_linked" || code === "email_doesn't_match")
    return "Sign in with your existing method and verify your email before connecting Google.";
  if (code === "email_unverified")
    return "Verify your account email before continuing. You can request a new code on the verification page.";
  if (code === "account_unavailable" || code === "account_suspended")
    return "This account cannot use the community. Contact the site moderator.";
  return code ? "Google sign-in could not be completed. Please try again." : "";
}
