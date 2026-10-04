// Shared transport for account and community actions. Writes are never retried:
// a lost response can still mean the server committed the action.
export async function requestJson<T = Record<string, unknown>>(
  path: string,
  data?: Record<string, unknown>,
  method = "GET",
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(path, {
      method,
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
      headers: data ? { "content-type": "application/json" } : undefined,
      body: data ? JSON.stringify(data) : undefined,
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      const supplied =
        typeof result?.error === "string"
          ? result.error
          : typeof result?.message === "string"
            ? result.message
            : null;
      throw new Error(
        supplied ??
          (response.status === 429
            ? "Too many requests. Wait a moment before trying again."
            : response.status === 401
              ? "Your session has ended. Sign in again to continue."
              : "The service is unavailable. Please try again shortly."),
      );
    }
    if (!result || typeof result !== "object")
      throw new Error(
        "The service returned an unreadable response. Refresh the page and try again.",
      );
    return result as T;
  } catch (error) {
    if (controller.signal.aborted)
      throw new Error(
        "The request took too long. Refresh to check whether it completed before trying again.",
      );
    if (error instanceof TypeError)
      throw new Error(
        "Could not reach the service. Check your connection and try again.",
      );
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
