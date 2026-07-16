# Shortlist v1.1.0

## Outcome

Evaluators can now compare Free and Pro workspaces from the login page without requesting or entering a demo password.

## Highlights

- One-click Free demo with one position, five-candidate limit, core evidence, and pipeline workflow.
- One-click Pro demo with the complete positions, team, reviewer, templates, automation, and audit experience.
- Demo changes stay in the current browser session.
- Demo accounts cannot modify production PostgreSQL data, use private Blob storage, or send SMTP email.
- Private recruiter authentication remains available separately.
- The login page now remains visible when browser motion is reduced or animation execution is unavailable.

## Verification

- 61 automated tests across 13 suites.
- Lint, TypeScript, and Next.js production build pass.
- Login, Free workspace, and Pro workspace visually checked at 1440px.
- Login checked at 390px with zero horizontal overflow.
- GitHub quality and verification workflows passed before merge.
