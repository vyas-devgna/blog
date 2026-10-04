# Database backups and restore

The production Neon database is online and holds the community schema and data. Articles and their assets stay in Git as static content.

## Current recovery status

- A temporary Neon branch clone was created on 2026-10-04 and confirmed to contain the nine discussion categories. This checked branch cloning only; it did not restore a historical point in time or test application recovery.
- No independent encrypted database export is configured.
- Cloudflare R2 backup storage is not configured. The current Wrangler login does not have R2 permissions.
- There is no completed end-to-end restore drill. Do not treat the current setup as meeting a recovery objective or as ready for a formal V1 release.

## Required backup and restore procedure

1. Configure an encrypted backup destination with access separate from the Worker and repository. Set retention and recovery objectives.
2. Export the production schema and data without copying credentials or user data into Git.
3. Restore the export into a disposable Neon branch, never over production.
4. Run Drizzle checks and verify profile, comment, discussion, notification, and moderation tables and their relationships.
5. Record the backup timestamp, source commit, restore duration, and any discrepancies.

Repeat the drill after material schema changes. Neon branch clones are useful for migration checks but do not replace independent backups.
