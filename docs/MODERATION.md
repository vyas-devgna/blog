# Community permissions and moderation

## Roles

Application roles are stored in `public.profiles.role`, separate from Neon Auth user permissions:

- `user` — manage their profile and their own comments/discussions, react, bookmark, subscribe, and report content.
- `moderator` — all user actions, review reports, hide/restore content, lock/pin/index discussions, and suspend or ban ordinary user accounts. Each moderation action requires a reason and writes an audit record.
- `admin` — reserved for the admin dashboard and future site-wide administration.

Every privileged route checks the role on the server. The browser cannot supply or change a role. User-generated text is rendered as text, with no user HTML.

## Initial moderator

The nominated email has no Neon Auth account yet. Do not assign a role by email before signup and verification. After the account verifies and loads `/settings/` once (which creates its application profile), promote exactly the verified matching profile with a Neon SQL console or trusted CLI session:

```sql
UPDATE public.profiles
SET role = 'moderator', updated_at = now()
WHERE email_address = lower('<verified moderator email>')
  AND role = 'user'
RETURNING user_id, role;
```

Expect exactly one row. Keep the email out of source files and public output. The profile `email_address` is populated only after Neon Auth confirms verification.

## Report review

Open `/moderation/` while signed in as a moderator. Reports can be resolved or dismissed with a reason. Content may be hidden/restored, discussions locked/unlocked or pinned/unpinned, and index eligibility changed. Account actions are limited to role `user`, are audited, and moderators cannot change their own status. Suspended and banned accounts cannot use community routes.

Moderators should use the reason field for a concise explanation. Account appeals and a public code-of-conduct page are not yet implemented; add these before broader community growth.
