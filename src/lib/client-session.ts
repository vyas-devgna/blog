type ClientSession = { user: { name?: string } } | null;
let pending: Promise<ClientSession> | undefined;

// Share concurrent reads, never a stored session. Every later refresh checks the server.
export function readClientSession(): Promise<ClientSession> {
  pending ??= fetch("/api/auth/get-session?disableCookieCache=true", {
    credentials: "same-origin",
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  })
    .then(async (response) => {
      if (!response.ok) throw new Error("Could not check your session.");
      return (await response.json()) as ClientSession;
    })
    .finally(() => {
      pending = undefined;
    });
  return pending;
}
