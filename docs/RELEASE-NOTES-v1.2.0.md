# Shortlist v1.2.0

## Outcome

The temporary browser-only Free and Pro sandboxes are removed. Evaluators now authenticate into real database-backed demo organizations using credentials displayed on the login page and documented in [`DEMO-ACCOUNTS.md`](DEMO-ACCOUNTS.md).

## Verification

- Free credentials authenticate and load database mode with the real Free plan.
- Pro credentials authenticate and load its stored position, candidate, templates, and automations.
- Public-account candidate and reviewer email delivery is blocked to prevent abuse.
- Private recruiter email behavior is unchanged.
- 60 automated tests, lint, TypeScript, production build, desktop QA, and 390px mobile QA pass.
