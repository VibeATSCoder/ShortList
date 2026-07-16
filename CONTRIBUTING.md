# Contributing

Shortlist uses a lightweight GitFlow model to keep production stable without slowing a solo-builder workflow.

## Branches

- `main`: production-ready and tagged releases only.
- `codex/develop`: integration branch for reviewed changes.
- `codex/feature/<outcome>`: one bounded feature or documentation outcome.
- `codex/fix/<problem>`: a focused defect correction.
- `codex/release/<version>`: release notes, final verification, and version metadata.

Feature and fix branches target `codex/develop`. A release branch targets `main` after it contains the verified integration state.

## Commit style

Use Conventional Commit subjects:

- `feat:` user-visible capability;
- `fix:` defect correction;
- `docs:` documentation only;
- `test:` test-only change;
- `chore:` maintenance or delivery configuration.

Keep commits reviewable and cohesive. Do not split trivial edits to manufacture activity, and do not mix unrelated refactors into a deadline feature.

## Required checks

Run before opening a pull request:

```bash
npm run quality
```

When behavior changes, add a focused regression test. For UI changes, verify desktop and mobile. For database changes, include forward migration and rollback notes. For AI changes, preserve strict output validation and deterministic server-side normalization.

## Sensitive data

Never commit secrets, `.env.local`, SMTP credentials, database URLs, provider payloads, real applicant resumes, candidate exports, signed review links, session tokens, or production identifiers. Revoke any credential disclosed in chat, logs, screenshots, or Git history.

## Pull requests

Every pull request must state:

1. the outcome and bounded scope;
2. risk and rollback;
3. verification evidence;
4. migrations or environment changes;
5. screenshots for visible UI changes.

Merge only after the quality workflow passes. Prefer squash merge for a clean integration branch, then use a release pull request to promote the tested state to `main`.
