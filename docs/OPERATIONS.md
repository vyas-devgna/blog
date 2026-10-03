# Operations

## Current publication

- Develop: `pnpm dev`
- Validate: `pnpm typecheck && pnpm lint && pnpm test:unit && pnpm build`
- Preview the build: `pnpm preview`
- Deploy after account/domain setup: `pnpm deploy`
- Worker logs: `pnpm exec wrangler tail vyas-publication`

## Rollback and incidents

Use Wrangler deployment history to restore the last known-good Worker version. A content rollback is a Git revert followed by a new build and deployment. There is currently no live database, migration, auth service, or backup to recover. After those services are added, document migration rollback constraints and run a restore drill before release.
