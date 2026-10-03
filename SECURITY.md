# Security policy

Report vulnerabilities privately to the site owner. Do not publish secrets, exploit details, or personal data in public issues.

Never commit `.env` files, database URLs, auth secrets, Resend keys, OAuth secrets, or Turnstile secrets. Keep privileged credentials server-side and least-privileged. Community endpoints must validate and authorize on the server before database access; UI visibility is not an access control.

Until authentication and community routes are implemented, do not treat this repository as an operational community service.
