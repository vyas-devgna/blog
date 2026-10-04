# Operations

## Production

- Site: `https://blog.vyasdevgna.online`
- Worker: `blog` on Cloudflare Workers Static Assets
- Database and managed auth: Neon project `fancy-silence-20394887`, branch `main`
- Session KV: `blog-session`
- The latest setup build is deployed. Email signup and the shared Google provider are enabled. The nominated moderator has completed Google sign-in and received the server-checked moderator role. An independent backup/restore drill is still outstanding.

## Local commands

- Develop: `pnpm dev`
- Validate: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`
- Preview: `pnpm preview`
- Deploy: `pnpm deploy`
- View deployment history and logs in the Cloudflare dashboard. CLI tailing requires a Wrangler token with `workers_tail:read`; the current token does not have that scope.

## Rollback and incidents

For a Worker incident, roll back to a known-good deployment in Cloudflare, then inspect the deployment and Worker logs. A content fix is a Git revert followed by a new build and deployment. Database schema changes are not automatically rolled back with a Worker deployment; use a disposable Neon branch to validate migrations and follow [the backup and restore procedure](BACKUPS.md) for data recovery.

After Turnstile signup, the verified moderator, and backups are complete, capture the deployed Worker version, source commit, migration state, and a restore result as the V1 release record.
