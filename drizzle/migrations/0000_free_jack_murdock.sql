CREATE TABLE "bookmarks" (
	"user_id" text NOT NULL,
	"thread_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_slug" varchar(160) NOT NULL,
	"author_id" text NOT NULL,
	"parent_id" uuid,
	"body" varchar(3000) NOT NULL,
	"status" varchar(16) DEFAULT 'visible' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"edited_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "comments_status_check" CHECK ("comments"."status" in ('visible', 'hidden', 'deleted'))
);
--> statement-breakpoint
CREATE TABLE "discussion_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(48) NOT NULL,
	"name" varchar(64) NOT NULL,
	"description" varchar(240) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "discussion_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "discussion_replies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"author_id" text NOT NULL,
	"parent_id" uuid,
	"body" varchar(6000) NOT NULL,
	"status" varchar(16) DEFAULT 'visible' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"edited_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "discussion_replies_status_check" CHECK ("discussion_replies"."status" in ('visible', 'hidden', 'deleted'))
);
--> statement-breakpoint
CREATE TABLE "discussion_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(180) NOT NULL,
	"category_id" uuid NOT NULL,
	"author_id" text NOT NULL,
	"title" varchar(140) NOT NULL,
	"body" varchar(10000) NOT NULL,
	"status" varchar(16) DEFAULT 'visible' NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"locked" boolean DEFAULT false NOT NULL,
	"indexable" boolean DEFAULT false NOT NULL,
	"reply_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "discussion_threads_slug_unique" UNIQUE("slug"),
	CONSTRAINT "threads_status_check" CHECK ("discussion_threads"."status" in ('visible', 'hidden', 'deleted')),
	CONSTRAINT "threads_reply_count_check" CHECK ("discussion_threads"."reply_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "moderation_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" text NOT NULL,
	"action" varchar(32) NOT NULL,
	"target_type" varchar(16) NOT NULL,
	"target_id" text NOT NULL,
	"reason" varchar(1000) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"in_app_replies" boolean DEFAULT true NOT NULL,
	"email_replies" boolean DEFAULT false NOT NULL,
	"moderation_updates" boolean DEFAULT true NOT NULL,
	"email_moderation" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"actor_id" text,
	"kind" varchar(32) NOT NULL,
	"message" varchar(180) NOT NULL,
	"href" varchar(512) NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"username" varchar(24) NOT NULL,
	"display_name" varchar(80) NOT NULL,
	"email_address" varchar(320),
	"bio" varchar(280),
	"website" varchar(2048),
	"role" varchar(16) DEFAULT 'user' NOT NULL,
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"trust_level" varchar(16) DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"username_changed_at" timestamp with time zone,
	CONSTRAINT "profiles_role_check" CHECK ("profiles"."role" in ('user', 'moderator', 'admin')),
	CONSTRAINT "profiles_status_check" CHECK ("profiles"."status" in ('active', 'suspended', 'banned', 'deleted')),
	CONSTRAINT "profiles_trust_level_check" CHECK ("profiles"."trust_level" in ('new', 'trusted', 'established')),
	CONSTRAINT "profiles_username_check" CHECK ("profiles"."username" ~ '^[a-z0-9_]{3,24}$')
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"scope" varchar(32) NOT NULL,
	"key_hash" varchar(64) NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"window_ends_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" text NOT NULL,
	"target_type" varchar(16) NOT NULL,
	"target_id" uuid NOT NULL,
	"kind" varchar(16) DEFAULT 'like' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reactions_target_type_check" CHECK ("reactions"."target_type" in ('comment', 'thread', 'reply')),
	CONSTRAINT "reactions_kind_check" CHECK ("reactions"."kind" = 'like')
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" text NOT NULL,
	"target_type" varchar(16) NOT NULL,
	"target_id" uuid NOT NULL,
	"reason" varchar(24) NOT NULL,
	"details" varchar(1000),
	"status" varchar(16) DEFAULT 'open' NOT NULL,
	"reviewer_id" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reports_target_type_check" CHECK ("reports"."target_type" in ('comment', 'thread', 'reply')),
	CONSTRAINT "reports_reason_check" CHECK ("reports"."reason" in ('spam', 'harassment', 'unsafe', 'off_topic', 'other')),
	CONSTRAINT "reports_status_check" CHECK ("reports"."status" in ('open', 'resolved', 'dismissed'))
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"user_id" text NOT NULL,
	"thread_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_thread_id_discussion_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."discussion_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_replies" ADD CONSTRAINT "discussion_replies_thread_id_discussion_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."discussion_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_threads" ADD CONSTRAINT "discussion_threads_category_id_discussion_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."discussion_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_thread_id_discussion_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."discussion_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bookmarks_user_thread_unique" ON "bookmarks" USING btree ("user_id","thread_id");--> statement-breakpoint
CREATE INDEX "bookmarks_user_created_idx" ON "bookmarks" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "comments_post_created_idx" ON "comments" USING btree ("post_slug","created_at","id");--> statement-breakpoint
CREATE INDEX "comments_author_created_idx" ON "comments" USING btree ("author_id","created_at");--> statement-breakpoint
CREATE INDEX "comments_parent_idx" ON "comments" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "discussion_categories_active_idx" ON "discussion_categories" USING btree ("active","sort_order");--> statement-breakpoint
CREATE INDEX "discussion_replies_thread_created_idx" ON "discussion_replies" USING btree ("thread_id","created_at","id");--> statement-breakpoint
CREATE INDEX "discussion_replies_author_idx" ON "discussion_replies" USING btree ("author_id","created_at");--> statement-breakpoint
CREATE INDEX "threads_category_activity_idx" ON "discussion_threads" USING btree ("category_id","pinned","last_activity_at","id");--> statement-breakpoint
CREATE INDEX "threads_author_idx" ON "discussion_threads" USING btree ("author_id","created_at");--> statement-breakpoint
CREATE INDEX "threads_search_idx" ON "discussion_threads" USING gin (to_tsvector('english', "title" || ' ' || "body"));--> statement-breakpoint
CREATE INDEX "moderation_actions_created_idx" ON "moderation_actions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_created_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_unread_idx" ON "notifications" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_username_unique" ON "profiles" USING btree ("username");--> statement-breakpoint
CREATE UNIQUE INDEX "rate_limits_scope_key_unique" ON "rate_limits" USING btree ("scope","key_hash");--> statement-breakpoint
CREATE INDEX "rate_limits_expiry_idx" ON "rate_limits" USING btree ("window_ends_at");--> statement-breakpoint
CREATE UNIQUE INDEX "reactions_actor_target_unique" ON "reactions" USING btree ("actor_id","target_type","target_id","kind");--> statement-breakpoint
CREATE INDEX "reactions_target_idx" ON "reactions" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reports_reporter_target_unique" ON "reports" USING btree ("reporter_id","target_type","target_id");--> statement-breakpoint
CREATE INDEX "reports_status_created_idx" ON "reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_user_thread_unique" ON "subscriptions" USING btree ("user_id","thread_id");--> statement-breakpoint
CREATE INDEX "subscriptions_thread_idx" ON "subscriptions" USING btree ("thread_id");--> statement-breakpoint
INSERT INTO "discussion_categories" ("slug", "name", "description", "sort_order") VALUES
  ('software-engineering', 'Software Engineering', 'Building, maintaining, and reasoning about software.', 10),
  ('open-source', 'Open Source', 'Projects, contributions, and the open source ecosystem.', 20),
  ('ai-ml', 'AI & ML', 'Machine learning, AI systems, and practical applications.', 30),
  ('research', 'Research', 'Research methods, papers, and technical findings.', 40),
  ('reverse-engineering', 'Reverse Engineering', 'Program analysis, interoperability, and security research.', 50),
  ('linux', 'Linux', 'Linux systems, tooling, and administration.', 60),
  ('windows', 'Windows', 'Windows development, systems, and administration.', 70),
  ('projects', 'Projects', 'Show and discuss projects you are working on.', 80),
  ('site-feedback', 'Site Feedback', 'Ideas and feedback about this publication.', 90)
ON CONFLICT ("slug") DO NOTHING;
