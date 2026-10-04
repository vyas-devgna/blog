import type { APIRoute, APIContext } from "astro";
import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNull,
  lt,
  or,
  sql,
} from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getPublishedPosts } from "../../../lib/posts";
import {
  bookmarks,
  comments,
  discussionCategories,
  discussionReplies,
  discussionThreads,
  moderationActions,
  notificationPreferences,
  notifications,
  profiles,
  reactions,
  reports,
  subscriptions,
} from "../../../lib/db/schema";
import {
  ApiError,
  getAuthContext,
  proxyAuthRequest,
  requireRole,
} from "../../../lib/server/auth";
import {
  apiError,
  checkOrigin,
  json,
  makeCursor,
  readCursor,
  readJson,
  requireString,
  requireUuid,
} from "../../../lib/server/http";
import { getDb, getSql } from "../../../lib/server/db";
import {
  clientRateKey,
  enforceRateLimit,
} from "../../../lib/server/rate-limit";
import { verifyTurnstile } from "../../../lib/server/turnstile";
import { notifyUsers } from "../../../lib/server/notifications";

export const prerender = false;

const commentStatuses = or(
  eq(comments.status, "visible"),
  eq(comments.status, "deleted"),
);
const replyStatuses = or(
  eq(discussionReplies.status, "visible"),
  eq(discussionReplies.status, "deleted"),
);
const reasons = new Set(["spam", "harassment", "unsafe", "off_topic", "other"]);

function pageSize(url: URL, fallback = 20, maximum = 50) {
  const parsed = Number(url.searchParams.get("limit") ?? fallback);
  return Number.isInteger(parsed)
    ? Math.max(1, Math.min(maximum, parsed))
    : fallback;
}

function pageNumber(url: URL) {
  const parsed = Number(url.searchParams.get("page") ?? 1);
  return Number.isInteger(parsed) ? Math.max(1, Math.min(500, parsed)) : 1;
}

async function proxySessionApi(
  request: Request,
  path: string,
  body?: Record<string, unknown>,
) {
  const url = new URL(request.url);
  const headers = new Headers({
    cookie: request.headers.get("cookie") ?? "",
    origin: url.origin,
    "user-agent": request.headers.get("user-agent") ?? "",
  });
  if (body) headers.set("content-type", "application/json");
  return proxyAuthRequest(
    new Request(request.url, {
      method: body ? "POST" : "GET",
      headers,
      body: body ? JSON.stringify(body) : undefined,
    }),
    path,
  );
}

function readSessionList(data: unknown) {
  if (Array.isArray(data)) return data;
  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as Record<string, unknown>).sessions)
  ) {
    return (data as { sessions: unknown[] }).sessions;
  }
  return null;
}

function publicAuthor(
  profile: {
    userId: string;
    username: string;
    displayName: string;
    status: string;
  } | null,
) {
  return profile && profile.status !== "deleted"
    ? {
        id: profile.userId,
        username: profile.username,
        displayName: profile.displayName,
      }
    : { id: null, username: null, displayName: "Deleted member" };
}

async function verifyPublishedPost(slug: string) {
  const posts = await getPublishedPosts();
  if (!posts.some((post) => post.id === slug)) {
    throw new ApiError(
      404,
      "That published article was not found.",
      "post_not_found",
    );
  }
}

async function getComments(url: URL) {
  const postSlug = requireString(
    url.searchParams.get("postSlug"),
    "Article",
    1,
    160,
  );
  await verifyPublishedPost(postSlug);
  const cursor = readCursor(url);
  const limit = pageSize(url);
  const parentIdValue = url.searchParams.get("parentId");
  const parentId = parentIdValue
    ? requireUuid(parentIdValue, "Parent comment")
    : null;
  const db = getDb();
  if (parentId) {
    const [parent] = await db
      .select({
        id: comments.id,
        postSlug: comments.postSlug,
        parentId: comments.parentId,
      })
      .from(comments)
      .where(
        and(
          eq(comments.id, parentId),
          eq(comments.postSlug, postSlug),
          isNull(comments.parentId),
          commentStatuses,
        ),
      )
      .limit(1);
    if (!parent)
      throw new ApiError(
        404,
        "That comment thread was not found.",
        "comment_not_found",
      );
  }
  const where = and(
    eq(comments.postSlug, postSlug),
    parentId ? eq(comments.parentId, parentId) : isNull(comments.parentId),
    commentStatuses,
    cursor
      ? or(
          lt(comments.createdAt, cursor.date),
          and(eq(comments.createdAt, cursor.date), lt(comments.id, cursor.id)),
        )
      : undefined,
  );
  const rows = await db
    .select({
      id: comments.id,
      postSlug: comments.postSlug,
      parentId: comments.parentId,
      body: comments.body,
      status: comments.status,
      createdAt: comments.createdAt,
      editedAt: comments.editedAt,
      authorId: profiles.userId,
      username: profiles.username,
      displayName: profiles.displayName,
      profileStatus: profiles.status,
    })
    .from(comments)
    .leftJoin(profiles, eq(comments.authorId, profiles.userId))
    .where(where)
    .orderBy(desc(comments.createdAt), desc(comments.id))
    .limit(limit + 1);
  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit);
  const ids = items.map((item) => item.id);
  const likeRows = ids.length
    ? await db
        .select({ targetId: reactions.targetId, total: count() })
        .from(reactions)
        .where(
          and(
            eq(reactions.targetType, "comment"),
            inArray(reactions.targetId, ids),
          ),
        )
        .groupBy(reactions.targetId)
    : [];
  const likes = new Map(likeRows.map((row) => [row.targetId, row.total]));
  const result = items.map((item) => ({
    id: item.id,
    postSlug: item.postSlug,
    parentId: item.parentId,
    body: item.status === "deleted" ? "" : item.body,
    deleted: item.status === "deleted",
    createdAt: item.createdAt,
    editedAt: item.editedAt,
    author: publicAuthor(
      item.authorId && item.username && item.displayName && item.profileStatus
        ? {
            userId: item.authorId,
            username: item.username,
            displayName: item.displayName,
            status: item.profileStatus,
          }
        : null,
    ),
    likeCount: likes.get(item.id) ?? 0,
  }));
  const last = items.at(-1);
  return json({
    items: result,
    hasMore,
    nextCursor: hasMore && last ? makeCursor(last.createdAt, last.id) : null,
    parentId,
  });
}

async function getDiscussionList(url: URL) {
  const db = getDb();
  const page = pageNumber(url);
  const limit = pageSize(url, 20, 50);
  const category = url.searchParams.get("category");
  const categoryWhere = category
    ? eq(discussionCategories.slug, category)
    : undefined;
  const rows = await db
    .select({
      id: discussionThreads.id,
      slug: discussionThreads.slug,
      title: discussionThreads.title,
      body: discussionThreads.body,
      pinned: discussionThreads.pinned,
      locked: discussionThreads.locked,
      indexable: discussionThreads.indexable,
      replyCount: discussionThreads.replyCount,
      createdAt: discussionThreads.createdAt,
      lastActivityAt: discussionThreads.lastActivityAt,
      categorySlug: discussionCategories.slug,
      categoryName: discussionCategories.name,
      authorId: profiles.userId,
      username: profiles.username,
      displayName: profiles.displayName,
      profileStatus: profiles.status,
    })
    .from(discussionThreads)
    .innerJoin(
      discussionCategories,
      eq(discussionThreads.categoryId, discussionCategories.id),
    )
    .leftJoin(profiles, eq(discussionThreads.authorId, profiles.userId))
    .where(
      and(
        eq(discussionThreads.status, "visible"),
        eq(discussionCategories.active, true),
        categoryWhere,
      ),
    )
    .orderBy(
      desc(discussionThreads.pinned),
      desc(discussionThreads.lastActivityAt),
      desc(discussionThreads.id),
    )
    .limit(limit)
    .offset((page - 1) * limit);
  const [totalRow] = await db
    .select({ total: count() })
    .from(discussionThreads)
    .innerJoin(
      discussionCategories,
      eq(discussionThreads.categoryId, discussionCategories.id),
    )
    .where(
      and(
        eq(discussionThreads.status, "visible"),
        eq(discussionCategories.active, true),
        categoryWhere,
      ),
    );
  return json({
    items: rows.map((row) => ({
      ...row,
      body: row.body.length > 320 ? `${row.body.slice(0, 317)}…` : row.body,
      author: publicAuthor(
        row.authorId && row.username && row.displayName && row.profileStatus
          ? {
              userId: row.authorId,
              username: row.username,
              displayName: row.displayName,
              status: row.profileStatus,
            }
          : null,
      ),
    })),
    page,
    limit,
    total: totalRow?.total ?? 0,
    hasMore: page * limit < (totalRow?.total ?? 0),
  });
}

async function getThread(slug: string) {
  const db = getDb();
  const [row] = await db
    .select({
      id: discussionThreads.id,
      slug: discussionThreads.slug,
      title: discussionThreads.title,
      body: discussionThreads.body,
      pinned: discussionThreads.pinned,
      locked: discussionThreads.locked,
      indexable: discussionThreads.indexable,
      replyCount: discussionThreads.replyCount,
      createdAt: discussionThreads.createdAt,
      updatedAt: discussionThreads.updatedAt,
      lastActivityAt: discussionThreads.lastActivityAt,
      categorySlug: discussionCategories.slug,
      categoryName: discussionCategories.name,
      authorId: profiles.userId,
      username: profiles.username,
      displayName: profiles.displayName,
      profileStatus: profiles.status,
    })
    .from(discussionThreads)
    .innerJoin(
      discussionCategories,
      eq(discussionThreads.categoryId, discussionCategories.id),
    )
    .leftJoin(profiles, eq(discussionThreads.authorId, profiles.userId))
    .where(
      and(
        eq(discussionThreads.slug, slug),
        eq(discussionThreads.status, "visible"),
        eq(discussionCategories.active, true),
      ),
    )
    .limit(1);
  if (!row)
    throw new ApiError(
      404,
      "That discussion was not found.",
      "thread_not_found",
    );
  return {
    ...row,
    author: publicAuthor(
      row.authorId && row.username && row.displayName && row.profileStatus
        ? {
            userId: row.authorId,
            username: row.username,
            displayName: row.displayName,
            status: row.profileStatus,
          }
        : null,
    ),
  };
}

async function getReplies(threadId: string, url: URL) {
  const db = getDb();
  const cursor = readCursor(url);
  const limit = pageSize(url, 30, 50);
  const parentIdValue = url.searchParams.get("parentId");
  const parentId = parentIdValue
    ? requireUuid(parentIdValue, "Parent reply")
    : null;
  if (parentId) {
    const [parent] = await db
      .select({
        id: discussionReplies.id,
        parentId: discussionReplies.parentId,
      })
      .from(discussionReplies)
      .where(
        and(
          eq(discussionReplies.id, parentId),
          eq(discussionReplies.threadId, threadId),
          isNull(discussionReplies.parentId),
          replyStatuses,
        ),
      )
      .limit(1);
    if (!parent)
      throw new ApiError(
        404,
        "That reply thread was not found.",
        "reply_not_found",
      );
  }
  const rows = await db
    .select({
      id: discussionReplies.id,
      threadId: discussionReplies.threadId,
      parentId: discussionReplies.parentId,
      body: discussionReplies.body,
      status: discussionReplies.status,
      createdAt: discussionReplies.createdAt,
      editedAt: discussionReplies.editedAt,
      authorId: profiles.userId,
      username: profiles.username,
      displayName: profiles.displayName,
      profileStatus: profiles.status,
    })
    .from(discussionReplies)
    .leftJoin(profiles, eq(discussionReplies.authorId, profiles.userId))
    .where(
      and(
        eq(discussionReplies.threadId, threadId),
        parentId
          ? eq(discussionReplies.parentId, parentId)
          : isNull(discussionReplies.parentId),
        replyStatuses,
        cursor
          ? or(
              lt(discussionReplies.createdAt, cursor.date),
              and(
                eq(discussionReplies.createdAt, cursor.date),
                lt(discussionReplies.id, cursor.id),
              ),
            )
          : undefined,
      ),
    )
    .orderBy(desc(discussionReplies.createdAt), desc(discussionReplies.id))
    .limit(limit + 1);
  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit).map((row) => ({
    ...row,
    body: row.status === "deleted" ? "" : row.body,
    deleted: row.status === "deleted",
    author: publicAuthor(
      row.authorId && row.username && row.displayName && row.profileStatus
        ? {
            userId: row.authorId,
            username: row.username,
            displayName: row.displayName,
            status: row.profileStatus,
          }
        : null,
    ),
  }));
  const last = rows[Math.min(limit, rows.length) - 1];
  return json({
    items,
    hasMore,
    nextCursor: hasMore && last ? makeCursor(last.createdAt, last.id) : null,
    parentId,
  });
}

async function refreshTrust(userId: string) {
  const db = getDb();
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);
  if (!profile)
    throw new ApiError(
      503,
      "Your community profile could not be loaded.",
      "profile_unavailable",
    );
  const [commentCount] = await db
    .select({ total: count() })
    .from(comments)
    .where(and(eq(comments.authorId, userId), eq(comments.status, "visible")));
  const [threadCount] = await db
    .select({ total: count() })
    .from(discussionThreads)
    .where(
      and(
        eq(discussionThreads.authorId, userId),
        eq(discussionThreads.status, "visible"),
      ),
    );
  const total = (commentCount?.total ?? 0) + (threadCount?.total ?? 0);
  const ageDays = (Date.now() - profile.createdAt.valueOf()) / 86_400_000;
  const level =
    ageDays >= 30 && total >= 20
      ? "established"
      : ageDays >= 7 && total >= 3
        ? "trusted"
        : "new";
  if (level !== profile.trustLevel) {
    const [updated] = await db
      .update(profiles)
      .set({ trustLevel: level, updatedAt: new Date() })
      .where(eq(profiles.userId, userId))
      .returning();
    return updated ?? profile;
  }
  return profile;
}

async function requirePostingContext(request: Request) {
  const auth = await getAuthContext(request);
  const profile = await refreshTrust(auth.user.id);
  return { ...auth, profile };
}

function checkPlainText(body: string, maxLinks = 2) {
  if (body.length > 10_000)
    throw new ApiError(400, "This submission is too long.", "invalid_input");
  const links = body.match(/(?:https?:\/\/|www\.)\S+/gi) ?? [];
  if (links.length > maxLinks)
    throw new ApiError(
      400,
      "Please remove some links and try again.",
      "too_many_links",
    );
}

async function requireChallengeIfNew(
  profile: typeof profiles.$inferSelect,
  token: unknown,
  action: string,
  request: Request,
) {
  if (profile.trustLevel === "new")
    await verifyTurnstile(token, action, request);
}

async function createComment(request: Request, context: APIContext) {
  const input = await readJson(request, 5000);
  const postSlug = requireString(input.postSlug, "Article", 1, 160);
  const body = requireString(input.body, "Comment", 1, 3000, false);
  if (!body.trim())
    throw new ApiError(400, "Comment cannot be blank.", "invalid_input");
  checkPlainText(body, 1);
  await verifyPublishedPost(postSlug);
  const auth = await requirePostingContext(request);
  await enforceRateLimit(
    getDb(),
    "comment",
    clientRateKey(request, auth.user.id),
    auth.profile.trustLevel === "new" ? 5 : 20,
    3600,
  );
  await requireChallengeIfNew(
    auth.profile,
    input.turnstileToken,
    "comment",
    request,
  );
  const parentId = input.parentId
    ? requireUuid(input.parentId, "Parent comment")
    : null;
  const db = getDb();
  if (parentId) {
    const [parent] = await db
      .select({
        id: comments.id,
        parentId: comments.parentId,
        status: comments.status,
      })
      .from(comments)
      .where(and(eq(comments.id, parentId), eq(comments.postSlug, postSlug)))
      .limit(1);
    if (!parent || parent.parentId || parent.status !== "visible") {
      throw new ApiError(
        400,
        "Replies must be attached to an active top-level comment.",
        "invalid_parent",
      );
    }
  }
  const [row] = await db
    .insert(comments)
    .values({ postSlug, authorId: auth.user.id, parentId, body })
    .returning();
  if (parentId) {
    const [parent] = await db
      .select({ authorId: comments.authorId })
      .from(comments)
      .where(eq(comments.id, parentId))
      .limit(1);
    if (parent?.authorId !== auth.user.id) {
      notifyUsers(context, {
        recipientIds: [parent?.authorId ?? ""],
        actorId: auth.user.id,
        kind: "reply",
        message: `${auth.profile.displayName} replied to your comment.`,
        href: `/blog/${postSlug}/#comments`,
        emailSubject: "A reply to your comment on Vyas",
        emailBody: `${auth.profile.displayName} replied to your comment.`,
        emailPreference: "emailReplies",
      });
    }
  }
  return {
    item: {
      ...row,
      author: {
        id: auth.profile.userId,
        username: auth.profile.username,
        displayName: auth.profile.displayName,
      },
    },
    auth,
  };
}

async function createThread(request: Request) {
  const input = await readJson(request, 14_000);
  const title = requireString(input.title, "Title", 5, 140);
  const body = requireString(input.body, "Description", 20, 10_000, false);
  if (!body.trim())
    throw new ApiError(400, "Description cannot be blank.", "invalid_input");
  checkPlainText(body, 2);
  const categorySlug = requireString(input.category, "Category", 1, 48);
  const auth = await requirePostingContext(request);
  await enforceRateLimit(
    getDb(),
    "thread",
    clientRateKey(request, auth.user.id),
    auth.profile.trustLevel === "new" ? 2 : 5,
    3600,
  );
  await requireChallengeIfNew(
    auth.profile,
    input.turnstileToken,
    "thread",
    request,
  );
  const db = getDb();
  const [category] = await db
    .select()
    .from(discussionCategories)
    .where(
      and(
        eq(discussionCategories.slug, categorySlug),
        eq(discussionCategories.active, true),
      ),
    )
    .limit(1);
  if (!category)
    throw new ApiError(
      400,
      "Choose an available category.",
      "invalid_category",
    );
  const slugBase =
    title
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120) || "discussion";
  const id = crypto.randomUUID();
  const slug = `${slugBase}-${id.slice(0, 8)}`;
  const [row] = await db
    .insert(discussionThreads)
    .values({
      id,
      slug,
      categoryId: category.id,
      authorId: auth.user.id,
      title,
      body,
      indexable: auth.profile.trustLevel !== "new",
    })
    .returning();
  return {
    item: {
      ...row,
      categorySlug: category.slug,
      categoryName: category.name,
      author: {
        id: auth.profile.userId,
        username: auth.profile.username,
        displayName: auth.profile.displayName,
      },
    },
    auth,
  };
}

async function createReply(
  request: Request,
  threadId: string,
  context: APIContext,
) {
  const input = await readJson(request, 10_000);
  const body = requireString(input.body, "Reply", 1, 6000, false);
  if (!body.trim())
    throw new ApiError(400, "Reply cannot be blank.", "invalid_input");
  checkPlainText(body, 2);
  const auth = await requirePostingContext(request);
  await enforceRateLimit(
    getDb(),
    "reply",
    clientRateKey(request, auth.user.id),
    auth.profile.trustLevel === "new" ? 5 : 30,
    3600,
  );
  await requireChallengeIfNew(
    auth.profile,
    input.turnstileToken,
    "reply",
    request,
  );
  const parentId = input.parentId
    ? requireUuid(input.parentId, "Parent reply")
    : null;
  const sqlClient = getSql();
  const inserted = await sqlClient`
    WITH locked_thread AS (
      SELECT id FROM discussion_threads
      WHERE id = ${threadId}::uuid AND status = 'visible' AND locked = false
      FOR UPDATE
    ), created AS (
      INSERT INTO discussion_replies (thread_id, author_id, parent_id, body)
      SELECT locked_thread.id, ${auth.user.id}, ${parentId}::uuid, ${body}
      FROM locked_thread
      WHERE ${parentId}::uuid IS NULL OR EXISTS (
        SELECT 1 FROM discussion_replies parent
        WHERE parent.id = ${parentId}::uuid AND parent.thread_id = locked_thread.id
          AND parent.parent_id IS NULL AND parent.status = 'visible'
      )
      RETURNING *
    ), updated AS (
      UPDATE discussion_threads
      SET reply_count = reply_count + 1, last_activity_at = now(), updated_at = now()
      WHERE id = (SELECT thread_id FROM created)
      RETURNING id
    )
    SELECT created.id, created.thread_id AS "threadId", created.parent_id AS "parentId",
      created.author_id AS "authorId", created.body, created.status,
      created.created_at AS "createdAt", created.edited_at AS "editedAt"
    FROM created INNER JOIN updated ON updated.id = created.thread_id
  `;
  const row = inserted[0];
  if (!row)
    throw new ApiError(
      409,
      "That discussion is locked or no longer available.",
      "thread_closed",
    );

  const thread = await getDb()
    .select({
      authorId: discussionThreads.authorId,
      slug: discussionThreads.slug,
    })
    .from(discussionThreads)
    .where(eq(discussionThreads.id, threadId))
    .limit(1);
  const subscriberRows = await getDb()
    .select({ userId: subscriptions.userId })
    .from(subscriptions)
    .where(eq(subscriptions.threadId, threadId));
  const recipients = [
    thread[0]?.authorId,
    ...subscriberRows.map((item) => item.userId),
  ].filter((id): id is string => Boolean(id));
  const message = `${auth.profile.displayName} replied to a discussion you follow.`;
  notifyUsers(context, {
    recipientIds: recipients,
    actorId: auth.user.id,
    kind: "reply",
    message,
    href: `/discussions/${thread[0]?.slug ?? ""}/`,
    emailSubject: "A reply to a discussion on Vyas",
    emailBody: message,
    emailPreference: "emailReplies",
  });
  return {
    item: {
      ...row,
      author: {
        id: auth.profile.userId,
        username: auth.profile.username,
        displayName: auth.profile.displayName,
      },
    },
    auth,
  };
}

async function getProfile(username: string) {
  const db = getDb();
  const [profile] = await db
    .select({
      userId: profiles.userId,
      username: profiles.username,
      displayName: profiles.displayName,
      bio: profiles.bio,
      website: profiles.website,
      status: profiles.status,
      createdAt: profiles.createdAt,
    })
    .from(profiles)
    .where(eq(profiles.username, username))
    .limit(1);
  if (!profile || profile.status === "banned")
    throw new ApiError(404, "That profile was not found.", "profile_not_found");
  const [threadCount] = await db
    .select({ total: count() })
    .from(discussionThreads)
    .where(
      and(
        eq(discussionThreads.authorId, profile.userId),
        eq(discussionThreads.status, "visible"),
      ),
    );
  const [commentCount] = await db
    .select({ total: count() })
    .from(comments)
    .where(
      and(
        eq(comments.authorId, profile.userId),
        eq(comments.status, "visible"),
      ),
    );
  const recentThreads = await db
    .select({
      slug: discussionThreads.slug,
      title: discussionThreads.title,
      createdAt: discussionThreads.createdAt,
      replyCount: discussionThreads.replyCount,
    })
    .from(discussionThreads)
    .where(
      and(
        eq(discussionThreads.authorId, profile.userId),
        eq(discussionThreads.status, "visible"),
      ),
    )
    .orderBy(desc(discussionThreads.createdAt))
    .limit(5);
  return {
    profile: {
      username: profile.status === "deleted" ? null : profile.username,
      displayName:
        profile.status === "deleted" ? "Deleted member" : profile.displayName,
      bio: profile.status === "deleted" ? null : profile.bio,
      website: profile.status === "deleted" ? null : profile.website,
      joinedAt: profile.createdAt,
      deleted: profile.status === "deleted",
    },
    counts: {
      discussions: threadCount?.total ?? 0,
      comments: commentCount?.total ?? 0,
    },
    discussions: recentThreads,
  };
}

async function targetIsVisible(type: string, id: string) {
  const db = getDb();
  if (type === "comment")
    return Boolean(
      (
        await db
          .select({ id: comments.id })
          .from(comments)
          .where(and(eq(comments.id, id), eq(comments.status, "visible")))
          .limit(1)
      )[0],
    );
  if (type === "thread")
    return Boolean(
      (
        await db
          .select({ id: discussionThreads.id })
          .from(discussionThreads)
          .where(
            and(
              eq(discussionThreads.id, id),
              eq(discussionThreads.status, "visible"),
            ),
          )
          .limit(1)
      )[0],
    );
  if (type === "reply")
    return Boolean(
      (
        await db
          .select({ id: discussionReplies.id })
          .from(discussionReplies)
          .where(
            and(
              eq(discussionReplies.id, id),
              eq(discussionReplies.status, "visible"),
            ),
          )
          .limit(1)
      )[0],
    );
  return false;
}

async function moderateContent(
  context: APIContext,
  actor: Awaited<ReturnType<typeof getAuthContext>>,
  input: Record<string, unknown>,
) {
  requireRole(actor.profile, "moderator");
  const targetType = requireString(input.targetType, "Content type", 1, 16);
  const targetId = requireUuid(input.targetId, "Content");
  const action = requireString(input.action, "Action", 1, 16);
  const reason = requireString(input.reason, "Reason", 5, 1000);
  const allowed = new Set([
    "hide",
    "restore",
    "lock",
    "unlock",
    "pin",
    "unpin",
    "index",
    "unindex",
  ]);
  if (
    !allowed.has(action) ||
    (targetType !== "thread" &&
      ["lock", "unlock", "pin", "unpin", "index", "unindex"].includes(action))
  ) {
    throw new ApiError(
      400,
      "That moderation action is not available for this content.",
      "invalid_action",
    );
  }
  const db = getDb();
  let authorId: string | null = null;
  let notificationHref = "/moderation/";
  const sqlClient = getSql();
  let changed: boolean;
  if (targetType === "comment") {
    const [target] = await db
      .select({ authorId: comments.authorId, postSlug: comments.postSlug })
      .from(comments)
      .where(eq(comments.id, targetId))
      .limit(1);
    if (!target)
      throw new ApiError(
        404,
        "That comment was not found.",
        "content_not_found",
      );
    authorId = target?.authorId ?? null;
    notificationHref = `/blog/${target?.postSlug ?? ""}/#comments`;
    if (!(action === "hide" || action === "restore"))
      throw new ApiError(
        400,
        "Comments can only be hidden or restored.",
        "invalid_action",
      );
    const results = await sqlClient`
      WITH changed AS (
        UPDATE comments SET status = ${action === "hide" ? "hidden" : "visible"}, edited_at = now()
        WHERE id = ${targetId}::uuid
          AND status = ${action === "hide" ? "visible" : "hidden"}
        RETURNING id
      ), logged AS (
        INSERT INTO moderation_actions (actor_id, action, target_type, target_id, reason, metadata)
        SELECT ${actor.profile.userId}, ${action}, ${targetType}, ${targetId}, ${reason}, ${JSON.stringify({})}::jsonb
        FROM changed RETURNING id
      ) SELECT id FROM changed
    `;
    changed = results.length > 0;
  } else if (targetType === "reply") {
    const [target] = await db
      .select({
        authorId: discussionReplies.authorId,
        threadId: discussionReplies.threadId,
      })
      .from(discussionReplies)
      .where(eq(discussionReplies.id, targetId))
      .limit(1);
    if (!target)
      throw new ApiError(404, "That reply was not found.", "content_not_found");
    authorId = target?.authorId ?? null;
    const [thread] = target
      ? await db
          .select({ slug: discussionThreads.slug })
          .from(discussionThreads)
          .where(eq(discussionThreads.id, target.threadId))
          .limit(1)
      : [];
    notificationHref = `/discussions/${thread?.slug ?? ""}/`;
    if (!(action === "hide" || action === "restore"))
      throw new ApiError(
        400,
        "Replies can only be hidden or restored.",
        "invalid_action",
      );
    const results = await sqlClient`
      WITH changed AS (
        UPDATE discussion_replies SET status = ${action === "hide" ? "hidden" : "visible"}, edited_at = now()
        WHERE id = ${targetId}::uuid
          AND status = ${action === "hide" ? "visible" : "hidden"}
        RETURNING id
      ), logged AS (
        INSERT INTO moderation_actions (actor_id, action, target_type, target_id, reason, metadata)
        SELECT ${actor.profile.userId}, ${action}, ${targetType}, ${targetId}, ${reason}, ${JSON.stringify({})}::jsonb
        FROM changed RETURNING id
      ) SELECT id FROM changed
    `;
    changed = results.length > 0;
  } else if (targetType === "thread") {
    const [target] = await db
      .select({
        authorId: discussionThreads.authorId,
        slug: discussionThreads.slug,
      })
      .from(discussionThreads)
      .where(eq(discussionThreads.id, targetId))
      .limit(1);
    if (!target)
      throw new ApiError(
        404,
        "That discussion was not found.",
        "content_not_found",
      );
    authorId = target?.authorId ?? null;
    notificationHref = `/discussions/${target?.slug ?? ""}/`;
    const results = await sqlClient`
      WITH changed AS (
        UPDATE discussion_threads SET
          status = CASE WHEN ${action} = 'hide' THEN 'hidden' WHEN ${action} = 'restore' THEN 'visible' ELSE status END,
          deleted_at = CASE WHEN ${action} = 'restore' THEN NULL ELSE deleted_at END,
          locked = CASE WHEN ${action} = 'lock' THEN true WHEN ${action} = 'unlock' THEN false ELSE locked END,
          pinned = CASE WHEN ${action} = 'pin' THEN true WHEN ${action} = 'unpin' THEN false ELSE pinned END,
          indexable = CASE WHEN ${action} = 'index' THEN true WHEN ${action} = 'unindex' THEN false ELSE indexable END
        WHERE id = ${targetId}::uuid AND (
          (${action} = 'hide' AND status = 'visible') OR
          (${action} = 'restore' AND status = 'hidden') OR
          (${action} = 'lock' AND locked = false) OR
          (${action} = 'unlock' AND locked = true) OR
          (${action} = 'pin' AND pinned = false) OR
          (${action} = 'unpin' AND pinned = true) OR
          (${action} = 'index' AND indexable = false) OR
          (${action} = 'unindex' AND indexable = true)
        )
        RETURNING id
      ), logged AS (
        INSERT INTO moderation_actions (actor_id, action, target_type, target_id, reason, metadata)
        SELECT ${actor.profile.userId}, ${action}, ${targetType}, ${targetId}, ${reason}, ${JSON.stringify({})}::jsonb
        FROM changed RETURNING id
      ) SELECT id FROM changed
    `;
    changed = results.length > 0;
  } else {
    throw new ApiError(
      400,
      "That content type is not available.",
      "invalid_target",
    );
  }
  if (!authorId)
    throw new ApiError(404, "That content was not found.", "content_not_found");
  if (!changed)
    throw new ApiError(409, "That content has already changed.", "conflict");
  notifyUsers(context, {
    recipientIds: [authorId],
    actorId: actor.user.id,
    kind: "moderation",
    message: `A moderator ${action === "hide" ? "hid" : action === "restore" ? "restored" : "updated"} your community content.`,
    href: notificationHref,
    emailSubject: "An update about your Vyas community content",
    emailBody: `A moderator ${action} your community content. Sign in to view the update.`,
    emailPreference: "emailModeration",
  });
  return { ok: true };
}

async function dispatch(context: APIContext) {
  const { request, params } = context;
  const method = request.method.toUpperCase();
  if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    throw new ApiError(
      405,
      "This method is not available.",
      "method_not_allowed",
    );
  }
  if (method !== "GET") checkOrigin(request);
  const path = String(params.path ?? "")
    .split("/")
    .filter(Boolean)
    .map((part) => decodeURIComponent(part));
  const url = new URL(request.url);
  const db = getDb();

  if (method === "GET" && path[0] === "config" && path.length === 1) {
    return json({
      turnstileSiteKey: env.TURNSTILE_SITE_KEY ?? null,
      signupEnabled: Boolean(
        env.TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET_KEY,
      ),
      emailNotificationsAvailable: Boolean(env.RESEND_API_KEY),
    });
  }
  if (method === "GET" && path[0] === "categories" && path.length === 1) {
    const items = await db
      .select({
        id: discussionCategories.id,
        slug: discussionCategories.slug,
        name: discussionCategories.name,
        description: discussionCategories.description,
      })
      .from(discussionCategories)
      .where(eq(discussionCategories.active, true))
      .orderBy(
        asc(discussionCategories.sortOrder),
        asc(discussionCategories.name),
      );
    return json({ items });
  }
  if (method === "GET" && path[0] === "comments" && path.length === 1)
    return getComments(url);
  if (
    method === "GET" &&
    path[0] === "discussions" &&
    path[1] === "threads" &&
    path.length === 2
  )
    return getDiscussionList(url);
  if (
    method === "GET" &&
    path[0] === "discussions" &&
    path[1] === "threads" &&
    path.length === 3
  ) {
    return json({ item: await getThread(path[2]) });
  }
  if (
    method === "GET" &&
    path[0] === "discussions" &&
    path[1] === "threads" &&
    path.length === 4 &&
    path[3] === "membership"
  ) {
    const thread = await getThread(path[2]);
    let auth;
    try {
      auth = await getAuthContext(request);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401)
        return json({
          liked: false,
          bookmarked: false,
          subscribed: false,
          likeCount: 0,
        });
      throw error;
    }
    const [likeCount] = await db
      .select({ total: count() })
      .from(reactions)
      .where(
        and(
          eq(reactions.targetType, "thread"),
          eq(reactions.targetId, thread.id),
        ),
      );
    const [liked] = await db
      .select({ targetId: reactions.targetId })
      .from(reactions)
      .where(
        and(
          eq(reactions.actorId, auth.user.id),
          eq(reactions.targetType, "thread"),
          eq(reactions.targetId, thread.id),
        ),
      )
      .limit(1);
    const [bookmarked] = await db
      .select({ threadId: bookmarks.threadId })
      .from(bookmarks)
      .where(
        and(
          eq(bookmarks.userId, auth.user.id),
          eq(bookmarks.threadId, thread.id),
        ),
      )
      .limit(1);
    const [subscribed] = await db
      .select({ threadId: subscriptions.threadId })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, auth.user.id),
          eq(subscriptions.threadId, thread.id),
        ),
      )
      .limit(1);
    return json(
      {
        liked: Boolean(liked),
        bookmarked: Boolean(bookmarked),
        subscribed: Boolean(subscribed),
        likeCount: likeCount?.total ?? 0,
      },
      200,
      auth.cookies,
    );
  }
  if (
    method === "GET" &&
    path[0] === "discussions" &&
    path[1] === "threads" &&
    path.length === 4 &&
    path[3] === "replies"
  ) {
    const thread = await getThread(path[2]);
    return getReplies(thread.id, url);
  }
  if (method === "GET" && path[0] === "profiles" && path.length === 2) {
    return json(await getProfile(path[1]));
  }
  if (method === "GET" && path[0] === "search" && path.length === 1) {
    const query = requireString(url.searchParams.get("q"), "Search", 2, 80);
    const matches = await db
      .select({
        slug: discussionThreads.slug,
        title: discussionThreads.title,
        body: discussionThreads.body,
        createdAt: discussionThreads.createdAt,
        category: discussionCategories.name,
      })
      .from(discussionThreads)
      .innerJoin(
        discussionCategories,
        eq(discussionThreads.categoryId, discussionCategories.id),
      )
      .where(
        and(
          eq(discussionThreads.status, "visible"),
          sql`to_tsvector('english', ${discussionThreads.title} || ' ' || ${discussionThreads.body}) @@ plainto_tsquery('english', ${query})`,
        ),
      )
      .orderBy(desc(discussionThreads.lastActivityAt))
      .limit(20);
    return json({ items: matches });
  }
  if (method === "GET" && path[0] === "profile" && path.length === 1) {
    const auth = await getAuthContext(request);
    return json(
      {
        id: auth.profile.userId,
        username: auth.profile.username,
        displayName: auth.profile.displayName,
        bio: auth.profile.bio,
        website: auth.profile.website,
        role: auth.profile.role,
        status: auth.profile.status,
        trustLevel: auth.profile.trustLevel,
        email: auth.user.email,
        emailVerified: auth.user.emailVerified,
        createdAt: auth.profile.createdAt,
      },
      200,
      auth.cookies,
    );
  }
  if (method === "GET" && path[0] === "sessions" && path.length === 1) {
    const auth = await getAuthContext(request);
    const response = await proxySessionApi(request, "list-sessions");
    if (!response.ok)
      throw new ApiError(
        502,
        "Your sign-in sessions could not be loaded.",
        "sessions_unavailable",
      );
    const data = (await response.json().catch(() => null)) as unknown;
    const sessions = readSessionList(data);
    if (!sessions)
      throw new ApiError(
        502,
        "Your sign-in sessions could not be loaded.",
        "sessions_unavailable",
      );
    const items = sessions
      .filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === "object" && !Array.isArray(item),
      )
      .slice(0, 100)
      .map((item) => ({
        id: typeof item.id === "string" ? item.id : "",
        createdAt: item.createdAt ?? null,
        expiresAt: item.expiresAt ?? null,
        userAgent:
          typeof item.userAgent === "string"
            ? item.userAgent.slice(0, 240)
            : "",
        current: item.id === auth.sessionId,
      }))
      .filter((item) => item.id);
    return json({ items }, 200, auth.cookies);
  }
  if (method === "DELETE" && path[0] === "sessions" && path.length === 2) {
    const auth = await getAuthContext(request);
    const sessionId = requireString(path[1], "Session", 8, 128);
    if (!/^[A-Za-z0-9_-]+$/.test(sessionId))
      throw new ApiError(400, "That session is not valid.", "invalid_session");
    const listResponse = await proxySessionApi(request, "list-sessions");
    if (!listResponse.ok)
      throw new ApiError(
        502,
        "Your sign-in sessions could not be loaded.",
        "sessions_unavailable",
      );
    const sessionList = readSessionList(
      await listResponse.json().catch(() => null),
    );
    if (!sessionList)
      throw new ApiError(
        502,
        "Your sign-in sessions could not be loaded.",
        "sessions_unavailable",
      );
    const target = sessionList.find(
      (item) =>
        item &&
        typeof item === "object" &&
        !Array.isArray(item) &&
        (item as Record<string, unknown>).id === sessionId,
    ) as Record<string, unknown> | undefined;
    if (!target || typeof target.token !== "string")
      throw new ApiError(404, "That session was not found.", "session_missing");
    if (sessionId === auth.sessionId)
      throw new ApiError(
        400,
        "Use sign out to end the session you are using now.",
        "current_session",
      );
    const revoked = await proxySessionApi(request, "revoke-session", {
      token: target.token,
    });
    if (!revoked.ok)
      throw new ApiError(
        502,
        "That session could not be signed out.",
        "session_revoke_failed",
      );
    return json({ ok: true }, 200, auth.cookies);
  }
  if (
    method === "POST" &&
    path[0] === "sessions" &&
    path[1] === "revoke-other" &&
    path.length === 2
  ) {
    const auth = await getAuthContext(request);
    const response = await proxySessionApi(request, "revoke-all-sessions", {});
    if (!response.ok)
      throw new ApiError(
        502,
        "Other sessions could not be signed out.",
        "session_revoke_failed",
      );
    return json({ ok: true }, 200, auth.cookies);
  }
  if (method === "GET" && path[0] === "preferences" && path.length === 1) {
    const auth = await getAuthContext(request);
    const [prefs] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, auth.user.id))
      .limit(1);
    return json(
      {
        inAppReplies: prefs?.inAppReplies ?? true,
        emailReplies: prefs?.emailReplies ?? false,
        moderationUpdates: prefs?.moderationUpdates ?? true,
        emailModeration: prefs?.emailModeration ?? false,
      },
      200,
      auth.cookies,
    );
  }
  if (method === "GET" && path[0] === "notifications" && path.length === 1) {
    const auth = await getAuthContext(request);
    const page = pageNumber(url);
    const limit = pageSize(url, 30, 50);
    const items = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, auth.user.id))
      .orderBy(desc(notifications.createdAt), desc(notifications.id))
      .limit(limit)
      .offset((page - 1) * limit);
    return json({ items }, 200, auth.cookies);
  }
  if (
    method === "GET" &&
    path[0] === "moderation" &&
    path[1] === "reports" &&
    path.length === 2
  ) {
    const auth = await getAuthContext(request);
    requireRole(auth.profile, "moderator");
    const page = pageNumber(url);
    const items = await db
      .select({
        id: reports.id,
        reporterId: reports.reporterId,
        targetType: reports.targetType,
        targetId: reports.targetId,
        reason: reports.reason,
        details: reports.details,
        status: reports.status,
        createdAt: reports.createdAt,
        reporterName: profiles.displayName,
        reporterUsername: profiles.username,
      })
      .from(reports)
      .leftJoin(profiles, eq(reports.reporterId, profiles.userId))
      .orderBy(asc(reports.status), desc(reports.createdAt))
      .limit(50)
      .offset((page - 1) * 50);
    const commentIds = items
      .filter((item) => item.targetType === "comment")
      .map((item) => item.targetId);
    const threadIds = items
      .filter((item) => item.targetType === "thread")
      .map((item) => item.targetId);
    const replyIds = items
      .filter((item) => item.targetType === "reply")
      .map((item) => item.targetId);
    const commentTargets = commentIds.length
      ? await db
          .select({
            id: comments.id,
            body: comments.body,
            postSlug: comments.postSlug,
            authorId: comments.authorId,
            status: comments.status,
          })
          .from(comments)
          .where(inArray(comments.id, commentIds))
      : [];
    const threadTargets = threadIds.length
      ? await db
          .select({
            id: discussionThreads.id,
            body: discussionThreads.body,
            title: discussionThreads.title,
            slug: discussionThreads.slug,
            authorId: discussionThreads.authorId,
            status: discussionThreads.status,
          })
          .from(discussionThreads)
          .where(inArray(discussionThreads.id, threadIds))
      : [];
    const replyTargets = replyIds.length
      ? await db
          .select({
            id: discussionReplies.id,
            body: discussionReplies.body,
            threadId: discussionReplies.threadId,
            authorId: discussionReplies.authorId,
            status: discussionReplies.status,
          })
          .from(discussionReplies)
          .where(inArray(discussionReplies.id, replyIds))
      : [];
    const threadForReplies = replyTargets.length
      ? await db
          .select({ id: discussionThreads.id, slug: discussionThreads.slug })
          .from(discussionThreads)
          .where(
            inArray(discussionThreads.id, [
              ...new Set(replyTargets.map((item) => item.threadId)),
            ]),
          )
      : [];
    const replyThreadSlug = new Map(
      threadForReplies.map((item) => [item.id, item.slug]),
    );
    const targets = new Map<
      string,
      { content: string; href: string; authorId: string; status: string }
    >();
    for (const item of commentTargets)
      targets.set(`comment:${item.id}`, {
        content: item.body,
        href: `/blog/${item.postSlug}/#comments`,
        authorId: item.authorId,
        status: item.status,
      });
    for (const item of threadTargets)
      targets.set(`thread:${item.id}`, {
        content: `${item.title}\n\n${item.body}`,
        href: `/discussions/${item.slug}/`,
        authorId: item.authorId,
        status: item.status,
      });
    for (const item of replyTargets)
      targets.set(`reply:${item.id}`, {
        content: item.body,
        href: `/discussions/${replyThreadSlug.get(item.threadId) ?? ""}/`,
        authorId: item.authorId,
        status: item.status,
      });
    return json(
      {
        items: items.map((item) => ({
          ...item,
          target: targets.get(`${item.targetType}:${item.targetId}`) ?? null,
        })),
      },
      200,
      auth.cookies,
    );
  }
  if (
    method === "GET" &&
    path[0] === "moderation" &&
    path[1] === "actions" &&
    path.length === 2
  ) {
    const auth = await getAuthContext(request);
    requireRole(auth.profile, "moderator");
    const items = await db
      .select({
        id: moderationActions.id,
        actorId: moderationActions.actorId,
        action: moderationActions.action,
        targetType: moderationActions.targetType,
        targetId: moderationActions.targetId,
        reason: moderationActions.reason,
        createdAt: moderationActions.createdAt,
        actorName: profiles.displayName,
      })
      .from(moderationActions)
      .leftJoin(profiles, eq(moderationActions.actorId, profiles.userId))
      .orderBy(desc(moderationActions.createdAt))
      .limit(100);
    return json({ items }, 200, auth.cookies);
  }
  if (
    method === "GET" &&
    path[0] === "moderation" &&
    path[1] === "users" &&
    path.length === 2
  ) {
    const auth = await getAuthContext(request);
    requireRole(auth.profile, "moderator");
    const query = requireString(
      url.searchParams.get("q"),
      "Search",
      2,
      48,
    ).replace(/[%_]/g, "");
    const pattern = `%${query}%`;
    const items = await db
      .select({
        userId: profiles.userId,
        username: profiles.username,
        displayName: profiles.displayName,
        status: profiles.status,
        createdAt: profiles.createdAt,
      })
      .from(profiles)
      .where(
        and(
          eq(profiles.role, "user"),
          or(
            sql`${profiles.username} ilike ${pattern}`,
            sql`${profiles.displayName} ilike ${pattern}`,
          ),
        ),
      )
      .orderBy(asc(profiles.username))
      .limit(20);
    return json({ items }, 200, auth.cookies);
  }
  if (
    method === "GET" &&
    path[0] === "admin" &&
    path[1] === "stats" &&
    path.length === 2
  ) {
    const auth = await getAuthContext(request);
    requireRole(auth.profile, "admin");
    const [users] = await db
      .select({ total: count() })
      .from(profiles)
      .where(eq(profiles.status, "active"));
    const [threads] = await db
      .select({ total: count() })
      .from(discussionThreads)
      .where(eq(discussionThreads.status, "visible"));
    const [openReports] = await db
      .select({ total: count() })
      .from(reports)
      .where(eq(reports.status, "open"));
    return json(
      {
        users: users?.total ?? 0,
        discussions: threads?.total ?? 0,
        openReports: openReports?.total ?? 0,
      },
      200,
      auth.cookies,
    );
  }

  if (method === "POST" && path[0] === "comments" && path.length === 1) {
    const { item, auth } = await createComment(request, context);
    return json({ item }, 201, auth.cookies);
  }
  if (
    (method === "PATCH" || method === "DELETE") &&
    path[0] === "comments" &&
    path.length === 2
  ) {
    const id = requireUuid(path[1], "Comment");
    const auth = await getAuthContext(request);
    const [target] = await db
      .select()
      .from(comments)
      .where(eq(comments.id, id))
      .limit(1);
    if (!target)
      throw new ApiError(
        404,
        "That comment was not found.",
        "comment_not_found",
      );
    if (target.authorId !== auth.user.id)
      throw new ApiError(
        403,
        "You can only change your own comment.",
        "forbidden",
      );
    if (method === "DELETE") {
      const [item] = await db
        .update(comments)
        .set({ status: "deleted", deletedAt: new Date(), body: "" })
        .where(
          and(
            eq(comments.id, id),
            eq(comments.authorId, auth.user.id),
            eq(comments.status, "visible"),
          ),
        )
        .returning({ id: comments.id });
      if (!item)
        throw new ApiError(
          409,
          "That comment has already changed.",
          "conflict",
        );
      return json({ ok: true }, 200, auth.cookies);
    }
    const input = await readJson(request, 5000);
    const body = requireString(input.body, "Comment", 1, 3000, false);
    if (!body.trim())
      throw new ApiError(400, "Comment cannot be blank.", "invalid_input");
    checkPlainText(body, 1);
    const [item] = await db
      .update(comments)
      .set({ body, editedAt: new Date() })
      .where(
        and(
          eq(comments.id, id),
          eq(comments.authorId, auth.user.id),
          eq(comments.status, "visible"),
        ),
      )
      .returning();
    if (!item)
      throw new ApiError(409, "That comment has already changed.", "conflict");
    return json({ item }, 200, auth.cookies);
  }
  if (
    method === "POST" &&
    path[0] === "discussions" &&
    path[1] === "threads" &&
    path.length === 2
  ) {
    const { item, auth } = await createThread(request);
    return json({ item }, 201, auth.cookies);
  }
  if (
    method === "POST" &&
    path[0] === "discussions" &&
    path[1] === "threads" &&
    path.length === 4 &&
    path[3] === "replies"
  ) {
    const threadId = requireUuid(path[2], "Discussion");
    const { item, auth } = await createReply(request, threadId, context);
    return json({ item }, 201, auth.cookies);
  }
  if (
    (method === "PATCH" || method === "DELETE") &&
    path[0] === "discussions" &&
    path[1] === "threads" &&
    path.length === 3
  ) {
    const id = requireUuid(path[2], "Discussion");
    const auth = await getAuthContext(request);
    const [target] = await db
      .select()
      .from(discussionThreads)
      .where(eq(discussionThreads.id, id))
      .limit(1);
    if (!target)
      throw new ApiError(
        404,
        "That discussion was not found.",
        "thread_not_found",
      );
    if (target.authorId !== auth.user.id)
      throw new ApiError(
        403,
        "You can only change your own discussion.",
        "forbidden",
      );
    if (method === "DELETE") {
      const [item] = await db
        .update(discussionThreads)
        .set({
          status: "deleted",
          deletedAt: new Date(),
          body: "[deleted]",
          title: "Deleted discussion",
          indexable: false,
        })
        .where(
          and(
            eq(discussionThreads.id, id),
            eq(discussionThreads.authorId, auth.user.id),
            eq(discussionThreads.status, "visible"),
          ),
        )
        .returning({ id: discussionThreads.id });
      if (!item)
        throw new ApiError(
          409,
          "That discussion has already changed.",
          "conflict",
        );
      return json({ ok: true }, 200, auth.cookies);
    }
    const input = await readJson(request, 14_000);
    const title = requireString(input.title, "Title", 5, 140);
    const body = requireString(input.body, "Description", 20, 10_000, false);
    if (!body.trim())
      throw new ApiError(400, "Description cannot be blank.", "invalid_input");
    checkPlainText(body, 2);
    const [item] = await db
      .update(discussionThreads)
      .set({ title, body, updatedAt: new Date() })
      .where(
        and(
          eq(discussionThreads.id, id),
          eq(discussionThreads.authorId, auth.user.id),
          eq(discussionThreads.status, "visible"),
        ),
      )
      .returning();
    if (!item)
      throw new ApiError(
        409,
        "That discussion has already changed.",
        "conflict",
      );
    return json({ item }, 200, auth.cookies);
  }
  if (
    (method === "PATCH" || method === "DELETE") &&
    path[0] === "discussions" &&
    path[1] === "replies" &&
    path.length === 3
  ) {
    const id = requireUuid(path[2], "Reply");
    const auth = await getAuthContext(request);
    const [target] = await db
      .select()
      .from(discussionReplies)
      .where(eq(discussionReplies.id, id))
      .limit(1);
    if (!target)
      throw new ApiError(404, "That reply was not found.", "reply_not_found");
    if (target.authorId !== auth.user.id)
      throw new ApiError(
        403,
        "You can only change your own reply.",
        "forbidden",
      );
    if (method === "DELETE") {
      const [item] = await db
        .update(discussionReplies)
        .set({ status: "deleted", deletedAt: new Date(), body: "" })
        .where(
          and(
            eq(discussionReplies.id, id),
            eq(discussionReplies.authorId, auth.user.id),
            eq(discussionReplies.status, "visible"),
          ),
        )
        .returning({ id: discussionReplies.id });
      if (!item)
        throw new ApiError(409, "That reply has already changed.", "conflict");
      return json({ ok: true }, 200, auth.cookies);
    }
    const input = await readJson(request, 8000);
    const body = requireString(input.body, "Reply", 1, 6000, false);
    if (!body.trim())
      throw new ApiError(400, "Reply cannot be blank.", "invalid_input");
    checkPlainText(body, 2);
    const [item] = await db
      .update(discussionReplies)
      .set({ body, editedAt: new Date() })
      .where(
        and(
          eq(discussionReplies.id, id),
          eq(discussionReplies.authorId, auth.user.id),
          eq(discussionReplies.status, "visible"),
        ),
      )
      .returning();
    if (!item)
      throw new ApiError(409, "That reply has already changed.", "conflict");
    return json({ item }, 200, auth.cookies);
  }
  if (
    (method === "POST" || method === "PUT" || method === "DELETE") &&
    path[0] === "reactions" &&
    path.length === 1
  ) {
    const input = await readJson(request, 2000);
    const targetType = requireString(input.targetType, "Content type", 1, 16);
    const targetId = requireUuid(input.targetId, "Content");
    if (!(await targetIsVisible(targetType, targetId)))
      throw new ApiError(
        404,
        "That content was not found.",
        "content_not_found",
      );
    const auth = await getAuthContext(request);
    await enforceRateLimit(
      db,
      "reaction",
      clientRateKey(request, auth.user.id),
      100,
      3600,
    );
    if (method === "DELETE") {
      await db
        .delete(reactions)
        .where(
          and(
            eq(reactions.actorId, auth.user.id),
            eq(reactions.targetType, targetType),
            eq(reactions.targetId, targetId),
            eq(reactions.kind, "like"),
          ),
        );
    } else {
      await db
        .insert(reactions)
        .values({ actorId: auth.user.id, targetType, targetId, kind: "like" })
        .onConflictDoNothing();
    }
    const [total] = await db
      .select({ total: count() })
      .from(reactions)
      .where(
        and(
          eq(reactions.targetType, targetType),
          eq(reactions.targetId, targetId),
        ),
      );
    return json(
      { active: method !== "DELETE", count: total?.total ?? 0 },
      200,
      auth.cookies,
    );
  }
  if (method === "POST" && path[0] === "reports" && path.length === 1) {
    const input = await readJson(request, 2500);
    const targetType = requireString(input.targetType, "Content type", 1, 16);
    const targetId = requireUuid(input.targetId, "Content");
    const reason = requireString(input.reason, "Reason", 1, 24);
    if (!reasons.has(reason))
      throw new ApiError(400, "Choose a report reason.", "invalid_reason");
    const details =
      input.details == null || input.details === ""
        ? null
        : requireString(input.details, "Details", 1, 1000);
    if (!(await targetIsVisible(targetType, targetId)))
      throw new ApiError(
        404,
        "That content was not found.",
        "content_not_found",
      );
    const auth = await getAuthContext(request);
    await enforceRateLimit(
      db,
      "report",
      clientRateKey(request, auth.user.id),
      10,
      86_400,
    );
    await db
      .insert(reports)
      .values({
        reporterId: auth.user.id,
        targetType,
        targetId,
        reason,
        details,
      })
      .onConflictDoNothing();
    return json(
      { ok: true, message: "Thank you. A moderator will review this report." },
      201,
      auth.cookies,
    );
  }
  if (
    (method === "POST" || method === "PUT" || method === "DELETE") &&
    ["bookmarks", "subscriptions"].includes(path[0] ?? "") &&
    path.length === 1
  ) {
    const input = await readJson(request, 2000);
    const threadId = requireUuid(input.threadId, "Discussion");
    const auth = await getAuthContext(request);
    const table = path[0] === "bookmarks" ? bookmarks : subscriptions;
    const threadRow = await db
      .select({ id: discussionThreads.id })
      .from(discussionThreads)
      .where(
        and(
          eq(discussionThreads.id, threadId),
          eq(discussionThreads.status, "visible"),
        ),
      )
      .limit(1);
    if (!threadRow[0])
      throw new ApiError(
        404,
        "That discussion was not found.",
        "thread_not_found",
      );
    if (method === "DELETE") {
      await db
        .delete(table)
        .where(
          and(eq(table.userId, auth.user.id), eq(table.threadId, threadId)),
        );
    } else {
      await db
        .insert(table)
        .values({ userId: auth.user.id, threadId })
        .onConflictDoNothing();
    }
    return json({ active: method !== "DELETE" }, 200, auth.cookies);
  }
  if (
    (method === "PATCH" || method === "POST") &&
    path[0] === "notifications" &&
    path.length === 2 &&
    path[1] === "read-all"
  ) {
    const auth = await getAuthContext(request);
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.userId, auth.user.id),
          isNull(notifications.readAt),
        ),
      );
    return json({ ok: true }, 200, auth.cookies);
  }
  if (method === "PATCH" && path[0] === "notifications" && path.length === 2) {
    const id = requireUuid(path[1], "Notification");
    const auth = await getAuthContext(request);
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(eq(notifications.id, id), eq(notifications.userId, auth.user.id)),
      );
    return json({ ok: true }, 200, auth.cookies);
  }
  if (method === "PATCH" && path[0] === "profile" && path.length === 1) {
    const input = await readJson(request, 4000);
    const auth = await getAuthContext(request);
    const displayName = requireString(input.displayName, "Display name", 1, 80);
    const bio =
      input.bio === "" || input.bio == null
        ? null
        : requireString(input.bio, "Bio", 1, 280);
    let website: string | null = null;
    if (input.website !== "" && input.website != null) {
      website = requireString(input.website, "Website", 8, 2048);
      try {
        const parsed = new URL(website);
        if (parsed.protocol !== "https:" || parsed.username || parsed.password)
          throw new Error("unsafe URL");
      } catch {
        throw new ApiError(
          400,
          "Website must be a valid HTTPS address.",
          "invalid_website",
        );
      }
    }
    let username = auth.profile.username;
    if (input.username !== undefined && input.username !== username) {
      username = requireString(input.username, "Username", 3, 24).toLowerCase();
      if (!/^[a-z0-9_]{3,24}$/.test(username))
        throw new ApiError(
          400,
          "Use 3–24 lowercase letters, numbers, or underscores.",
          "invalid_username",
        );
      if (
        auth.profile.usernameChangedAt &&
        Date.now() - auth.profile.usernameChangedAt.valueOf() < 30 * 86_400_000
      ) {
        throw new ApiError(
          429,
          "You can change your username once every 30 days.",
          "username_change_limited",
        );
      }
    }
    try {
      const [item] = await db
        .update(profiles)
        .set({
          displayName,
          bio,
          website,
          username,
          usernameChangedAt:
            username !== auth.profile.username
              ? new Date()
              : auth.profile.usernameChangedAt,
          updatedAt: new Date(),
        })
        .where(eq(profiles.userId, auth.user.id))
        .returning({
          username: profiles.username,
          displayName: profiles.displayName,
          bio: profiles.bio,
          website: profiles.website,
        });
      return json({ item }, 200, auth.cookies);
    } catch (error) {
      if (error instanceof Error && /unique|duplicate/i.test(error.message))
        throw new ApiError(
          409,
          "That username is already taken.",
          "username_taken",
        );
      throw error;
    }
  }
  if (method === "PATCH" && path[0] === "preferences" && path.length === 1) {
    const input = await readJson(request, 2000);
    const auth = await getAuthContext(request);
    for (const key of [
      "inAppReplies",
      "emailReplies",
      "moderationUpdates",
      "emailModeration",
    ]) {
      if (input[key] !== undefined && typeof input[key] !== "boolean")
        throw new ApiError(
          400,
          "Choose an on or off value for each preference.",
          "invalid_preference",
        );
    }
    if (
      !env.RESEND_API_KEY &&
      (input.emailReplies === true || input.emailModeration === true)
    ) {
      throw new ApiError(
        503,
        "Email notifications are not configured yet.",
        "email_notifications_unavailable",
      );
    }
    const [item] = await db
      .insert(notificationPreferences)
      .values({
        userId: auth.user.id,
        inAppReplies:
          input.inAppReplies === undefined
            ? true
            : (input.inAppReplies as boolean),
        emailReplies:
          input.emailReplies === undefined
            ? false
            : (input.emailReplies as boolean),
        moderationUpdates:
          input.moderationUpdates === undefined
            ? true
            : (input.moderationUpdates as boolean),
        emailModeration:
          input.emailModeration === undefined
            ? false
            : (input.emailModeration as boolean),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: notificationPreferences.userId,
        set: {
          ...(input.inAppReplies !== undefined
            ? { inAppReplies: input.inAppReplies as boolean }
            : {}),
          ...(input.emailReplies !== undefined
            ? { emailReplies: input.emailReplies as boolean }
            : {}),
          ...(input.moderationUpdates !== undefined
            ? { moderationUpdates: input.moderationUpdates as boolean }
            : {}),
          ...(input.emailModeration !== undefined
            ? { emailModeration: input.emailModeration as boolean }
            : {}),
          updatedAt: new Date(),
        },
      })
      .returning();
    return json({ item }, 200, auth.cookies);
  }
  if (
    method === "POST" &&
    path[0] === "moderation" &&
    path[1] === "content" &&
    path.length === 2
  ) {
    const auth = await getAuthContext(request);
    const input = await readJson(request, 2500);
    return json(await moderateContent(context, auth, input), 200, auth.cookies);
  }
  if (
    method === "PATCH" &&
    path[0] === "moderation" &&
    path[1] === "reports" &&
    path.length === 3
  ) {
    const auth = await getAuthContext(request);
    requireRole(auth.profile, "moderator");
    const id = requireUuid(path[2], "Report");
    const input = await readJson(request, 2500);
    const status = requireString(input.status, "Decision", 1, 16);
    if (!(status === "resolved" || status === "dismissed"))
      throw new ApiError(400, "Choose resolve or dismiss.", "invalid_decision");
    const reason = requireString(input.reason, "Reason", 5, 1000);
    const rows = await getSql()`
      WITH changed AS (
        UPDATE reports SET status = ${status}, reviewer_id = ${auth.user.id}, reviewed_at = now()
        WHERE id = ${id}::uuid AND status = 'open'
        RETURNING id, target_type, target_id, reason, details, status, created_at, reviewed_at
      ), logged AS (
        INSERT INTO moderation_actions (actor_id, action, target_type, target_id, reason, metadata)
        SELECT ${auth.user.id}, ${`report_${status}`}, changed.target_type, changed.target_id,
          ${reason}, ${JSON.stringify({ reportId: id })}::jsonb FROM changed RETURNING id
      )
      SELECT changed.id, changed.target_type AS "targetType", changed.target_id AS "targetId",
        changed.status, changed.created_at AS "createdAt", changed.reviewed_at AS "reviewedAt"
      FROM changed INNER JOIN logged ON true
    `;
    const item = rows[0];
    if (!item)
      throw new ApiError(
        409,
        "That report has already been reviewed.",
        "report_already_reviewed",
      );
    return json({ item }, 200, auth.cookies);
  }
  if (
    method === "PATCH" &&
    path[0] === "moderation" &&
    path[1] === "users" &&
    path.length === 3
  ) {
    const auth = await getAuthContext(request);
    requireRole(auth.profile, "moderator");
    const userId = requireString(path[2], "Account", 1, 128);
    if (userId === auth.user.id)
      throw new ApiError(
        400,
        "You cannot change your own account status.",
        "self_moderation",
      );
    const input = await readJson(request, 2500);
    const status = requireString(input.status, "Account status", 1, 16);
    if (!(status === "active" || status === "suspended" || status === "banned"))
      throw new ApiError(
        400,
        "Choose active, suspended, or banned.",
        "invalid_status",
      );
    const reason = requireString(input.reason, "Reason", 5, 1000);
    const [target] = await db
      .select({ role: profiles.role, status: profiles.status })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);
    if (!target || target.role !== "user")
      throw new ApiError(404, "That member was not found.", "member_not_found");
    const rows = await getSql()`
      WITH changed AS (
        UPDATE profiles SET status = ${status}, updated_at = now()
        WHERE user_id = ${userId} AND role = 'user'
        RETURNING user_id
      ), logged AS (
        INSERT INTO moderation_actions (actor_id, action, target_type, target_id, reason, metadata)
        SELECT ${auth.user.id}, ${`user_${status}`}, 'user', changed.user_id, ${reason},
          ${JSON.stringify({ previousStatus: target.status })}::jsonb FROM changed RETURNING id
      ) SELECT changed.user_id FROM changed INNER JOIN logged ON true
    `;
    const updated = rows[0];
    if (!updated)
      throw new ApiError(
        409,
        "That account changed before the action could be applied.",
        "conflict",
      );
    if (status !== "active") {
      await db.delete(notifications).where(eq(notifications.userId, userId));
    }
    notifyUsers(context, {
      recipientIds: [userId],
      actorId: auth.user.id,
      kind: "moderation",
      message:
        status === "active"
          ? "Your account is active again."
          : "A moderator changed your account status.",
      href: "/settings/",
      emailSubject: "An update about your Vyas account",
      emailBody: `Your account status changed to ${status}.`,
      emailPreference: "emailModeration",
    });
    return json({ userId: updated.user_id, status }, 200, auth.cookies);
  }
  if (method === "GET" && path[0] === "moderation" && path.length === 1) {
    const auth = await getAuthContext(request);
    requireRole(auth.profile, "moderator");
    const [openReports] = await db
      .select({ total: count() })
      .from(reports)
      .where(eq(reports.status, "open"));
    const [activeUsers] = await db
      .select({ total: count() })
      .from(profiles)
      .where(eq(profiles.status, "active"));
    const [activeThreads] = await db
      .select({ total: count() })
      .from(discussionThreads)
      .where(eq(discussionThreads.status, "visible"));
    return json(
      {
        openReports: openReports?.total ?? 0,
        activeUsers: activeUsers?.total ?? 0,
        activeThreads: activeThreads?.total ?? 0,
      },
      200,
      auth.cookies,
    );
  }
  if (
    method === "POST" &&
    path[0] === "account" &&
    path[1] === "delete" &&
    path.length === 2
  ) {
    const input = await readJson(request, 2000);
    const password = requireString(input.password, "Password", 8, 128, false);
    const auth = await getAuthContext(request, { allowDeleted: true });
    const randomName = `deleted_${crypto.randomUUID().slice(0, 8)}`;
    if (auth.profile.status !== "deleted") {
      await db
        .update(profiles)
        .set({
          status: "deleted",
          username: randomName,
          displayName: "Deleted member",
          bio: null,
          website: null,
          emailAddress: null,
          role: "user",
          trustLevel: "new",
          updatedAt: new Date(),
        })
        .where(eq(profiles.userId, auth.user.id));
    }
    const headers = new Headers(request.headers);
    headers.set("content-type", "application/json");
    headers.delete("content-length");
    const authRequest = new Request(
      new URL("/api/auth/delete-user", request.url),
      {
        method: "POST",
        headers,
        body: JSON.stringify({ password }),
      },
    );
    const response = await proxyAuthRequest(authRequest, "delete-user");
    if (!response.ok) {
      if (auth.profile.status !== "deleted") {
        await db
          .update(profiles)
          .set({
            status: auth.profile.status,
            username: auth.profile.username,
            displayName: auth.profile.displayName,
            bio: auth.profile.bio,
            website: auth.profile.website,
            emailAddress: auth.profile.emailAddress,
            updatedAt: new Date(),
          })
          .where(eq(profiles.userId, auth.user.id));
      }
      throw new ApiError(
        400,
        "We could not delete this account. Check your password and try again.",
        "account_delete_failed",
      );
    }
    await getSql().transaction((tx) => [
      tx`DELETE FROM reports WHERE reporter_id = ${auth.user.id}
        OR (target_type = 'comment' AND target_id IN (SELECT id FROM comments WHERE author_id = ${auth.user.id}))
        OR (target_type = 'reply' AND target_id IN (SELECT id FROM discussion_replies WHERE author_id = ${auth.user.id}))
        OR (target_type = 'thread' AND target_id IN (SELECT id FROM discussion_threads WHERE author_id = ${auth.user.id}))`,
      tx`DELETE FROM reactions WHERE actor_id = ${auth.user.id}
        OR (target_type = 'comment' AND target_id IN (SELECT id FROM comments WHERE author_id = ${auth.user.id}))
        OR (target_type = 'reply' AND target_id IN (SELECT id FROM discussion_replies WHERE author_id = ${auth.user.id}))
        OR (target_type = 'thread' AND target_id IN (SELECT id FROM discussion_threads WHERE author_id = ${auth.user.id}))`,
      tx`DELETE FROM bookmarks WHERE user_id = ${auth.user.id}
        OR thread_id IN (SELECT id FROM discussion_threads WHERE author_id = ${auth.user.id})`,
      tx`DELETE FROM subscriptions WHERE user_id = ${auth.user.id}
        OR thread_id IN (SELECT id FROM discussion_threads WHERE author_id = ${auth.user.id})`,
      tx`UPDATE comments SET status = 'deleted', body = '', deleted_at = now()
        WHERE author_id = ${auth.user.id}`,
      tx`UPDATE discussion_replies SET status = 'deleted', body = '', deleted_at = now()
        WHERE author_id = ${auth.user.id}
          OR thread_id IN (SELECT id FROM discussion_threads WHERE author_id = ${auth.user.id})`,
      tx`UPDATE discussion_threads SET status = 'deleted', title = 'Deleted discussion', body = '',
        pinned = false, locked = true, indexable = false, reply_count = 0, deleted_at = now(), updated_at = now()
        WHERE author_id = ${auth.user.id}`,
      tx`DELETE FROM notifications WHERE user_id = ${auth.user.id} OR actor_id = ${auth.user.id}`,
      tx`DELETE FROM notification_preferences WHERE user_id = ${auth.user.id}`,
    ]);
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("cache-control", "no-store, private");
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: responseHeaders,
    });
  }

  throw new ApiError(404, "This community route does not exist.", "not_found");
}

export const ALL: APIRoute = async (context) => {
  try {
    const response = await dispatch(context);
    return response;
  } catch (error) {
    return apiError(error);
  }
};
