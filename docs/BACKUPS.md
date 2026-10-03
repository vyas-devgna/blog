# Database backups and restore

No production database is configured, so no production backup exists. Before launch, enable Neon-managed backups/restore points and keep an independent encrypted logical export outside this repository. Restrict backup access to a separate operator credential and define retention to match the recovery objective.

## Restore drill

1. Provision a disposable Neon branch or database.
2. Restore a recent backup there, never over production.
3. Run Drizzle migration/status checks and application integrity queries.
4. Record the snapshot date, commit, elapsed restore time, and discrepancies without copying user data into Git.

Repeat this drill before the first production release and after material schema changes. Exact commands depend on the Neon plan and export destination, which are not configured.
