import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();
const lastActivityAt = () =>
  timestamp("last_activity_at", { withTimezone: true }).notNull().defaultNow();

export const profiles = pgTable(
  "profiles",
  {
    userId: text("user_id").primaryKey(),
    username: varchar("username", { length: 24 }).notNull(),
    displayName: varchar("display_name", { length: 80 }).notNull(),
    emailAddress: varchar("email_address", { length: 320 }),
    bio: varchar("bio", { length: 280 }),
    website: varchar("website", { length: 2048 }),
    role: varchar("role", { length: 16 }).notNull().default("user"),
    status: varchar("status", { length: 16 }).notNull().default("active"),
    trustLevel: varchar("trust_level", { length: 16 }).notNull().default("new"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    usernameChangedAt: timestamp("username_changed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("profiles_username_unique").on(table.username),
    check(
      "profiles_role_check",
      sql`${table.role} in ('user', 'moderator', 'admin')`,
    ),
    check(
      "profiles_status_check",
      sql`${table.status} in ('active', 'suspended', 'banned', 'deleted')`,
    ),
    check(
      "profiles_trust_level_check",
      sql`${table.trustLevel} in ('new', 'trusted', 'established')`,
    ),
    check(
      "profiles_username_check",
      sql`${table.username} ~ '^[a-z0-9_]{3,24}$'`,
    ),
  ],
);

export const discussionCategories = pgTable(
  "discussion_categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 48 }).notNull().unique(),
    name: varchar("name", { length: 64 }).notNull(),
    description: varchar("description", { length: 240 }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
  },
  (table) => [
    index("discussion_categories_active_idx").on(table.active, table.sortOrder),
  ],
);

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postSlug: varchar("post_slug", { length: 160 }).notNull(),
    authorId: text("author_id").notNull(),
    parentId: uuid("parent_id"),
    body: varchar("body", { length: 3000 }).notNull(),
    status: varchar("status", { length: 16 }).notNull().default("visible"),
    createdAt: createdAt(),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("comments_post_created_idx").on(
      table.postSlug,
      table.createdAt,
      table.id,
    ),
    index("comments_author_created_idx").on(table.authorId, table.createdAt),
    index("comments_parent_idx").on(table.parentId),
    check(
      "comments_status_check",
      sql`${table.status} in ('visible', 'hidden', 'deleted')`,
    ),
  ],
);

export const discussionThreads = pgTable(
  "discussion_threads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 180 }).notNull().unique(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => discussionCategories.id, { onDelete: "restrict" }),
    authorId: text("author_id").notNull(),
    title: varchar("title", { length: 140 }).notNull(),
    body: varchar("body", { length: 10000 }).notNull(),
    status: varchar("status", { length: 16 }).notNull().default("visible"),
    pinned: boolean("pinned").notNull().default(false),
    locked: boolean("locked").notNull().default(false),
    indexable: boolean("indexable").notNull().default(false),
    replyCount: integer("reply_count").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    lastActivityAt: lastActivityAt(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("threads_category_activity_idx").on(
      table.categoryId,
      table.pinned,
      table.lastActivityAt,
      table.id,
    ),
    index("threads_author_idx").on(table.authorId, table.createdAt),
    index("threads_search_idx").using(
      "gin",
      sql`to_tsvector('english', ${table.title} || ' ' || ${table.body})`,
    ),
    check(
      "threads_status_check",
      sql`${table.status} in ('visible', 'hidden', 'deleted')`,
    ),
    check("threads_reply_count_check", sql`${table.replyCount} >= 0`),
  ],
);

export const discussionReplies = pgTable(
  "discussion_replies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => discussionThreads.id, { onDelete: "cascade" }),
    authorId: text("author_id").notNull(),
    parentId: uuid("parent_id"),
    body: varchar("body", { length: 6000 }).notNull(),
    status: varchar("status", { length: 16 }).notNull().default("visible"),
    createdAt: createdAt(),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("discussion_replies_thread_created_idx").on(
      table.threadId,
      table.createdAt,
      table.id,
    ),
    index("discussion_replies_author_idx").on(table.authorId, table.createdAt),
    check(
      "discussion_replies_status_check",
      sql`${table.status} in ('visible', 'hidden', 'deleted')`,
    ),
  ],
);

export const reactions = pgTable(
  "reactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: text("actor_id").notNull(),
    targetType: varchar("target_type", { length: 16 }).notNull(),
    targetId: uuid("target_id").notNull(),
    kind: varchar("kind", { length: 16 }).notNull().default("like"),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("reactions_actor_target_unique").on(
      table.actorId,
      table.targetType,
      table.targetId,
      table.kind,
    ),
    index("reactions_target_idx").on(table.targetType, table.targetId),
    check(
      "reactions_target_type_check",
      sql`${table.targetType} in ('comment', 'thread', 'reply')`,
    ),
    check("reactions_kind_check", sql`${table.kind} = 'like'`),
  ],
);

export const bookmarks = pgTable(
  "bookmarks",
  {
    userId: text("user_id").notNull(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => discussionThreads.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("bookmarks_user_thread_unique").on(
      table.userId,
      table.threadId,
    ),
    index("bookmarks_user_created_idx").on(table.userId, table.createdAt),
  ],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    userId: text("user_id").notNull(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => discussionThreads.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("subscriptions_user_thread_unique").on(
      table.userId,
      table.threadId,
    ),
    index("subscriptions_thread_idx").on(table.threadId),
  ],
);

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reporterId: text("reporter_id").notNull(),
    targetType: varchar("target_type", { length: 16 }).notNull(),
    targetId: uuid("target_id").notNull(),
    reason: varchar("reason", { length: 24 }).notNull(),
    details: varchar("details", { length: 1000 }),
    status: varchar("status", { length: 16 }).notNull().default("open"),
    reviewerId: text("reviewer_id"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("reports_reporter_target_unique").on(
      table.reporterId,
      table.targetType,
      table.targetId,
    ),
    index("reports_status_created_idx").on(table.status, table.createdAt),
    check(
      "reports_target_type_check",
      sql`${table.targetType} in ('comment', 'thread', 'reply')`,
    ),
    check(
      "reports_reason_check",
      sql`${table.reason} in ('spam', 'harassment', 'unsafe', 'off_topic', 'other')`,
    ),
    check(
      "reports_status_check",
      sql`${table.status} in ('open', 'resolved', 'dismissed')`,
    ),
  ],
);

export const moderationActions = pgTable(
  "moderation_actions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: text("actor_id").notNull(),
    action: varchar("action", { length: 32 }).notNull(),
    targetType: varchar("target_type", { length: 16 }).notNull(),
    targetId: text("target_id").notNull(),
    reason: varchar("reason", { length: 1000 }).notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: createdAt(),
  },
  (table) => [index("moderation_actions_created_idx").on(table.createdAt)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    actorId: text("actor_id"),
    kind: varchar("kind", { length: 32 }).notNull(),
    message: varchar("message", { length: 180 }).notNull(),
    href: varchar("href", { length: 512 }).notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [
    index("notifications_user_created_idx").on(table.userId, table.createdAt),
    index("notifications_user_unread_idx").on(table.userId, table.readAt),
  ],
);

export const notificationPreferences = pgTable("notification_preferences", {
  userId: text("user_id").primaryKey(),
  inAppReplies: boolean("in_app_replies").notNull().default(true),
  emailReplies: boolean("email_replies").notNull().default(false),
  moderationUpdates: boolean("moderation_updates").notNull().default(true),
  emailModeration: boolean("email_moderation").notNull().default(false),
  updatedAt: updatedAt(),
});

export const rateLimits = pgTable(
  "rate_limits",
  {
    scope: varchar("scope", { length: 32 }).notNull(),
    keyHash: varchar("key_hash", { length: 64 }).notNull(),
    count: integer("count").notNull().default(0),
    windowEndsAt: timestamp("window_ends_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("rate_limits_scope_key_unique").on(table.scope, table.keyHash),
    index("rate_limits_expiry_idx").on(table.windowEndsAt),
  ],
);
