import { env } from "cloudflare:workers";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../db/schema";

export function getDb() {
  if (!env.DATABASE_URL) throw new Error("Database is not configured");
  return drizzle(neon(env.DATABASE_URL), { schema });
}

export function getSql() {
  if (!env.DATABASE_URL) throw new Error("Database is not configured");
  return neon(env.DATABASE_URL);
}

export type AppDb = ReturnType<typeof getDb>;
