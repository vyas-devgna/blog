import { env } from "cloudflare:workers";
import { eq, inArray } from "drizzle-orm";
import type { APIContext } from "astro";
import { getDb } from "./db";
import { notifications, notificationPreferences, profiles } from "../db/schema";

type NotificationEvent = {
  recipientIds: string[];
  actorId?: string;
  kind: string;
  message: string;
  href: string;
  emailSubject: string;
  emailBody: string;
  emailPreference: "emailReplies" | "emailModeration";
};

export function notifyUsers(context: APIContext, event: NotificationEvent) {
  const ids = [...new Set(event.recipientIds)].filter(
    (id) => id !== event.actorId,
  );
  if (!ids.length) return;
  const work = persistAndSend(ids, event).catch((error) => {
    console.error(
      "notification delivery failed",
      error instanceof Error ? error.name : "unknown error",
    );
  });
  if (context.locals.cfContext) context.locals.cfContext.waitUntil(work);
  else void work;
}

async function persistAndSend(ids: string[], event: NotificationEvent) {
  const db = getDb();
  const targets = await db
    .select({
      userId: profiles.userId,
      email: profiles.emailAddress,
      emailReplies: notificationPreferences.emailReplies,
      emailModeration: notificationPreferences.emailModeration,
      inAppReplies: notificationPreferences.inAppReplies,
      moderationUpdates: notificationPreferences.moderationUpdates,
    })
    .from(profiles)
    .leftJoin(
      notificationPreferences,
      eq(profiles.userId, notificationPreferences.userId),
    )
    .where(inArray(profiles.userId, ids));

  const eligible = targets.filter((target) =>
    event.kind === "moderation"
      ? (target.moderationUpdates ?? true)
      : (target.inAppReplies ?? true),
  );
  if (eligible.length) {
    await db.insert(notifications).values(
      eligible.map((target) => ({
        userId: target.userId,
        actorId: event.actorId ?? null,
        kind: event.kind,
        message: event.message,
        href: event.href,
      })),
    );
  }

  if (!env.RESEND_API_KEY) return;
  const emailEligible = targets.filter(
    (target) =>
      target.email &&
      (event.emailPreference === "emailReplies"
        ? target.emailReplies
        : target.emailModeration),
  );
  await Promise.all(
    emailEligible.map(async (target) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            authorization: `Bearer ${env.RESEND_API_KEY}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            from: "Vyas <no-reply@notify.vyasdevgna.online>",
            to: [target.email],
            subject: event.emailSubject,
            text: `${event.emailBody}\n\n${new URL(event.href, env.PUBLIC_SITE_URL).toString()}`,
          }),
          signal: controller.signal,
        });
        if (!response.ok)
          console.error("transactional email rejected", response.status);
      } catch (error) {
        console.error(
          "transactional email failed",
          error instanceof Error ? error.name : "unknown error",
        );
      } finally {
        clearTimeout(timeout);
      }
    }),
  );
}
