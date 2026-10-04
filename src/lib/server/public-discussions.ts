import { and, asc, desc, eq } from "drizzle-orm";
import {
  discussionCategories,
  discussionThreads,
  profiles,
} from "../db/schema";
import { getDb } from "./db";

export async function getPublicDiscussionOverview() {
  const db = getDb();
  const [categories, threads] = await Promise.all([
    db
      .select()
      .from(discussionCategories)
      .where(eq(discussionCategories.active, true))
      .orderBy(asc(discussionCategories.sortOrder)),
    db
      .select({
        slug: discussionThreads.slug,
        title: discussionThreads.title,
        body: discussionThreads.body,
        createdAt: discussionThreads.createdAt,
        replyCount: discussionThreads.replyCount,
        categoryName: discussionCategories.name,
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
        ),
      )
      .orderBy(
        desc(discussionThreads.pinned),
        desc(discussionThreads.lastActivityAt),
      )
      .limit(20),
  ]);
  return { categories, threads };
}

export async function getIndexableDiscussions() {
  return getDb()
    .select({
      slug: discussionThreads.slug,
      updatedAt: discussionThreads.updatedAt,
    })
    .from(discussionThreads)
    .innerJoin(
      discussionCategories,
      eq(discussionThreads.categoryId, discussionCategories.id),
    )
    .innerJoin(profiles, eq(discussionThreads.authorId, profiles.userId))
    .where(
      and(
        eq(discussionThreads.status, "visible"),
        eq(discussionThreads.indexable, true),
        eq(discussionCategories.active, true),
        eq(profiles.status, "active"),
      ),
    )
    .orderBy(desc(discussionThreads.updatedAt))
    .limit(50000);
}
